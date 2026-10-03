# Retention & Notification Outbox - V1

Status: implemented data/API contract. No notification provider is connected yet.

## 30 / 90-day retention

Retention is measured only after an application reaches the explicit `joined` state.

Candidate check-in windows:

- 30 days after `status_changed_at` for `joined`
- 90 days after `status_changed_at` for `joined`

Candidate responses:

- `still_working`
- `left`
- `prefer_not_to_say`

Optional structured reason when `left`:

- salary
- schedule
- location_transport
- role_fit
- culture
- management
- personal
- other

Rules:

- retention is a factual follow-up, not a worker/employer score
- a response does not rewrite the historical `joined` outcome
- candidate can update the same 30/90-day response; the row is unique per application/window
- no free-text reason is stored in V1
- public candidate access still requires the private application tracking token
- HR can read retention only through a verified session + active membership for the employer that owns the job

## Candidate endpoints

`GET /api/applications/:id/retention`

Returns joined date, due dates, and existing 30/90-day responses. Requires `x-pqc-tracking-token`.

`POST /api/applications/:id/retention/30`

`POST /api/applications/:id/retention/90`

Requires candidate writes enabled, matching tracking token, `joined` status, and the requested window to be due.

## HR endpoint

`GET /api/hr/applications/:id/retention`

Returns the same bounded retention state after verified HR session + employer membership checks. It does not expand candidate PII access.

## Notification outbox

`notification_outbox` is intentionally provider-neutral.

It stores:

- `recipient_type`
- `recipient_ref` - e.g. `guest_id`, never raw phone/email
- `channel_hint` - `unknown`, `zalo`, `sms`, or `email`
- `template_key`
- entity reference
- scheduled time
- delivery state / attempt count / bounded error code

It must not store raw candidate phone/email in the delivery queue.

### Retention reminder sync

`POST /api/internal/notifications/sync-retention`

Internal-only. Creates missing `retention_30d` and `retention_90d` outbox rows for joined applications. Inserts are idempotent through the outbox unique key.

### List due work

`GET /api/internal/notifications/outbox?status=pending&due=1&limit=50`

Internal-only. Returns queue metadata and recipient references, not decrypted contact PII.

### Delivery acknowledgement

`PATCH /api/internal/notifications/outbox/:id`

Internal-only. A future provider adapter can mark a queue item `leased`, `sent`, `failed`, or `cancelled` and record a bounded provider error code.

## Deliberately not implemented

- automatic provider delivery
- Zalo/SMS/email contact resolution
- retries/backoff worker
- notification preference UI
- quiet hours
- provider webhooks

Those belong to the delivery adapter and must not be simulated in V1 before a real provider is selected.

## Privacy rule

A notification worker may resolve `recipient_ref` to encrypted contact data only at delivery time, under the same production secret boundary. Provider payload/log policy must be reviewed before real candidate traffic.
