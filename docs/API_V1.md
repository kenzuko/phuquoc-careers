# PhuQuocCareers API V1

The API is designed for same-origin use by the V1 web app. No production deployment or secrets are committed to the repository.

## Health and runtime

### `GET /api/health`
Liveness endpoint. Confirms the Worker code is responding.

### `GET /api/readiness`
Production-readiness endpoint. Returns `ready` only when the D1 binding is queryable and required Worker secrets are present.

The response also reports non-secret launch state:
- candidate writes enabled/disabled
- employer claims enabled/disabled
- HR auth enabled/disabled

Infrastructure can therefore be healthy while sensitive product flows remain deliberately fail-closed.

### `GET /api/jobs.js`
Returns current non-expired D1 jobs as a small runtime script assigning `window.PQC_JOBS`. Public pages load the static generated seed first and this runtime script second, so D1 can override the seed without rewriting the locked V1 frontend. If runtime data is unavailable, the static seed remains the fallback.

## Launch switches

Sensitive routes are disabled by default in `wrangler.toml`:

- `CANDIDATE_WRITES_ENABLED = "false"`
- `EMPLOYER_CLAIMS_ENABLED = "false"`
- `HR_AUTH_MODE = "disabled"`

Disabled public write routes return `503 feature_not_enabled` rather than silently storing data. HR `/api/hr/*` routes remain unavailable until production HR authentication is explicitly enabled.

## Public candidate endpoints

### `GET /api/jobs`
Returns non-expired jobs. Optional query params: `q`, `department`, `zone`.

### `GET /api/jobs/:id`
Returns one structured job.

### `POST /api/intent`
Requires `CANDIDATE_WRITES_ENABLED=true`.

Records an explicit candidate intent signal. Supported intents: `browsing`, `open_to_offers`, `actively_looking`, `available_soon`, `available_now`.

Intent expires after 30 days unless reconfirmed. Acquisition source is allow-listed to `direct`, `facebook`, `zalo`, `google`, `referral`, `other`.

### `POST /api/applications`
Requires `CANDIDATE_WRITES_ENABLED=true`.

Guest-first quick application. Requires explicit consent for the specific employer/job. Candidate name/phone are encrypted at the application layer; phone hash is used only for lookup/deduplication.

Public write fields are bounded before persistence. Phone hash is unique so concurrent requests cannot create duplicate guest identities. The write path handles an insert race by re-reading the identity that won the unique constraint.

Application writes are rate-limited by an HMAC hash of the phone number, not by shared IP address.

On success the API returns an opaque tracking token once. The browser stores it locally; it is not placed in the URL.

### `GET /api/applications/:id`
Requires `x-pqc-tracking-token`. Returns only application status, job/employer label and timestamps. Does not return candidate PII.

### `POST /api/applications/:id/withdraw`
Requires `x-pqc-tracking-token`. Lets the candidate withdraw without an account. Optional withdrawal reason is restricted to an allow-list.

## Employer claim

### `POST /api/employer-claims`
Requires `EMPLOYER_CLAIMS_ENABLED=true`.

Creates a pending claim against an employer/property that already exists in the directory.

Rules:
- claim submission never grants candidate access
- work email can use the `work_email` verification path but is still pending review
- personal/free email requires an official `http` or `https` proof URL and uses manual review
- duplicate pending claims from the same employer/email pair are returned idempotently
- claim writes are rate-limited by an HMAC hash of the submitted email, not by IP

## Verified HR endpoints

These endpoints remain unavailable while `HR_AUTH_MODE != "enabled"`.

When enabled, they require a verified HR session using `Authorization: Bearer <HR_SESSION_TOKEN>` in the current V1 bridge. D1 stores only the token hash. Production user-facing session delivery must be replaced/confirmed by the final secure HR auth integration before this switch is enabled.

### `GET /api/hr/me`
Returns the verified HR identity and active employer memberships.

### `GET /api/hr/jobs`
Returns non-expired jobs belonging only to employers for which the HR identity has an active membership.

### `GET /api/hr/jobs/:jobId/applications`
Returns applications for a job only after both conditions pass:
1. valid verified HR session
2. active membership for the employer that owns the job

Candidate PII is decrypted only after those checks.

### `PATCH /api/hr/applications/:id/status`
Moves an application through the allowed lifecycle. `viewer` memberships cannot mutate status.

### `GET /api/hr/job-drafts`
Returns JD drafts owned by the verified HR identity within active employer memberships.

### `POST /api/hr/job-drafts`
Stores a draft under an explicit employer membership. Untrusted fields are length-bounded server-side and source URLs accept only `http`/`https`.

`text` input can be marked `parsed` by the V1 local parser. `url` and `poster` inputs remain `needs_parser` until a production server parser/OCR confirms them.

### `POST /api/hr/job-drafts/:id/publish`
Publishes an eligible draft.

Rules:
- requires verified session + active membership
- `viewer` cannot publish
- another HR user's draft requires `owner` or `admin` membership
- `needs_parser` drafts cannot publish
- archived/closed drafts cannot publish
- publishing the same draft twice is idempotent
- if the same employer already has the same title, the existing job is employer-confirmed/refreshed instead of blindly creating a duplicate
- unknown benefit fields never overwrite an existing confirmed yes/no value
- successful publish marks the job `fresh`, sets `employer_confirmed_at`, records an event, and links the draft to `published_job_id`

## Internal-only operational endpoints

These routes require `Authorization: Bearer <INTERNAL_API_TOKEN>`.

### `GET /api/internal/employer-claims?status=pending&limit=50`
Returns the review queue without decrypting full HR email addresses. The list includes employer, email domain, verification method, proof URL, requested role and timestamps.

### `GET /api/internal/employer-claims/:id`
Returns one claim detail for review. Full HR email is decrypted only on this privileged detail endpoint.

### `PATCH /api/internal/employer-claims/:id`
Approves or rejects a pending employer claim. Approval creates/updates a verified HR identity and an explicit employer membership.

### `GET /api/internal/hr-identities/:id/memberships`
Returns one HR identity's non-secret verification metadata and employer memberships. Full encrypted email is not returned.

### `POST /api/internal/hr-identities/:id/revoke-sessions`
Revokes all currently live HR sessions for the identity. Use this as the operational kill switch for suspected token/account compromise.

### `POST /api/internal/hr-identities/:id/session`
Temporary operational bridge that mints a verified HR session. This is **not** the final user-facing login flow; production should use a real OTP/magic-link provider and secure session delivery.

### `PATCH /api/internal/applications/:id/status`
Operational status-update bridge.

### `GET /api/internal/analytics/funnel`
Returns aggregate application status and active-intent counts grouped by acquisition source. No candidate PII is returned.

## Application lifecycle

`submitted -> viewed -> shortlisted -> interview -> offer -> joined`

An open application can also end as `rejected` or `withdrawn`. Closed states cannot be reopened through V1 APIs.

## Security notes

- No candidate talent data is scraped from external services.
- Sensitive public-write and HR routes are fail-closed behind explicit launch switches.
- Public write payloads over the configured API body limit are rejected before routing.
- Candidate name/phone and HR claim email are encrypted before persistence.
- Guest tracking token is random high-entropy material; D1 stores only its hash.
- Tracking token is sent in a request header, not query string, to avoid URL/history/referrer leakage.
- HR identity is separate from employer membership, so a legitimate cluster HR can have multiple explicit property memberships.
- A single-property HR session cannot query another employer's jobs or candidate data.
- Candidate PII is not returned by public application-tracking endpoints.
- Public job runtime preserves tri-state fields; `unknown` is never silently converted to `no`.
- Public application/claim rate-limit keys are derived hashes, not raw phone/email or shared IP addresses.
- No production `PII_KEY` or `INTERNAL_API_TOKEN` is stored in Git.
