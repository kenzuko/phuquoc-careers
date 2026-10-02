# PhuQuocCareers API V1

The API is designed for same-origin use by the V1 web app. No production deployment or secrets are committed to the repository.

## Public candidate endpoints

### `GET /api/jobs`
Returns non-expired jobs. Optional query params: `q`, `department`, `zone`.

### `GET /api/jobs/:id`
Returns one structured job.

### `GET /api/jobs.js`
Returns the current non-expired D1 jobs as a small runtime script assigning `window.PQC_JOBS`. Public pages load the static generated seed first and this runtime script second, so D1 can override the seed without rewriting the locked V1 frontend. If runtime data is unavailable, the static seed remains the fallback.

### `POST /api/intent`
Records an explicit candidate intent signal. Supported intents: `browsing`, `open_to_offers`, `actively_looking`, `available_soon`, `available_now`.

Intent expires after 30 days unless reconfirmed. Acquisition source is allow-listed to `direct`, `facebook`, `zalo`, `google`, `referral`, `other`.

### `POST /api/applications`
Guest-first quick application. Requires explicit consent for the specific employer/job. Candidate name/phone are encrypted at the application layer; phone hash is used only for lookup/deduplication.

On success the API returns an opaque tracking token once. The browser stores it locally; it is not placed in the URL.

### `GET /api/applications/:id`
Requires `x-pqc-tracking-token`. Returns only application status, job/employer label and timestamps. Does not return candidate PII.

### `POST /api/applications/:id/withdraw`
Requires `x-pqc-tracking-token`. Lets the candidate withdraw without an account. Optional withdrawal reason is restricted to an allow-list.

## Employer claim

### `POST /api/employer-claims`
Creates a pending claim against an employer/property that already exists in the directory.

Rules:
- claim submission never grants candidate access
- work email can use the `work_email` verification path but is still pending review
- personal/free email requires an official proof URL and uses manual review
- duplicate pending claims from the same employer/email pair are returned idempotently

## Verified HR endpoints

These endpoints require a verified HR session using `Authorization: Bearer <HR_SESSION_TOKEN>`. D1 stores only the token hash.

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
Stores a draft under an explicit employer membership. `text` input can be marked `parsed` by the V1 local parser. `url` and `poster` inputs remain `needs_parser` until a production server parser/OCR confirms them.

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

### `PATCH /api/internal/employer-claims/:id`
Approves or rejects a pending employer claim. Approval creates/updates a verified HR identity and an explicit employer membership.

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
- Guest tracking token is random high-entropy material; D1 stores only its hash.
- Tracking token is sent in a request header, not query string, to avoid URL/history/referrer leakage.
- HR identity is separate from employer membership, so a legitimate cluster HR can have multiple explicit property memberships.
- A single-property HR session cannot query another employer's jobs or candidate data.
- Candidate PII is not returned by public application-tracking endpoints.
- Public job runtime preserves tri-state fields; `unknown` is never silently converted to `no`.
- No production `PII_KEY` or `INTERNAL_API_TOKEN` is stored in Git.
