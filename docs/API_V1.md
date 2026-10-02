# PhuQuocCareers API V1

The API is designed for same-origin use by the V1 web app. No production deployment or secrets are committed to the repository.

## Public candidate endpoints

### `GET /api/jobs`
Returns non-expired jobs. Optional query params: `q`, `department`, `zone`.

### `GET /api/jobs/:id`
Returns one structured job.

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

## Internal-only endpoints

These routes require `Authorization: Bearer <INTERNAL_API_TOKEN>`. They are a temporary operational bridge until employer authentication is implemented.

### `PATCH /api/internal/applications/:id/status`
Moves an application forward through the allowed lifecycle or closes it as rejected. Invalid/backward transitions are rejected.

### `GET /api/internal/analytics/funnel`
Returns aggregate application status and active-intent counts grouped by acquisition source. No candidate PII is returned.

## Application lifecycle

`submitted -> viewed -> shortlisted -> interview -> offer -> joined`

An open application can also end as `rejected` or `withdrawn`. Closed states cannot be reopened through V1 APIs.

## Security notes

- No candidate talent data is scraped from external services.
- Guest tracking token is random high-entropy material; D1 stores only its SHA-256 hash.
- Tracking token is sent in a request header, not query string, to avoid URL/history/referrer leakage.
- Employer candidate access is not public in V1. Internal status update exists only behind a server secret until proper employer sessions/roles are implemented.
- No production `PII_KEY` or `INTERNAL_API_TOKEN` is stored in Git.
