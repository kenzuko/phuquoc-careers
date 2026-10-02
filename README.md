# PhuQuocCareers V1

PhuQuocCareers is a decision-first career marketplace for the Phu Quoc labour market.

## Product principles locked in V1

- Candidate homepage supports **smart natural-language entry and manual search in parallel**.
- AI assists discovery; it never blocks conventional search/filter workflows.
- Candidate is **guest-first**: browsing and quick apply do not require an account.
- `Quan tâm` is deliberately different from `Ứng tuyển` to separate curiosity from real intent.
- Employer onboarding starts from an existing **JD / poster / official recruitment URL**, then extracts structured fields for HR confirmation.
- Unknown salary/benefit fields stay unknown. The system must not invent missing data.
- Initial job supply is seeded from **official employer career sources**, with provenance and freshness metadata.
- Candidate data/talent pool is never scraped from other services; it must be consented first-party data.
- Job pages retain Phu Quoc-specific fields such as service charge, staff house/accommodation, meals, shuttle, off days, location and availability.
- Visual ADN is shared across homepage, results, job detail, application tracking, careers, employer directory, HR ingestion and HR workspace.

## Current routes

- `/index.html` - decision-first homepage
- `/jobs.html` - smart/manual search results and working filters
- `/job.html?id=...` - structured job detail, intent and guest apply flows
- `/application.html?id=...` - guest application tracking on the same trusted device
- `/careers.html` - lightweight career exploration
- `/employer.html` - employer directory and low-friction claim request
- `/employer/post.html` - JD/poster/URL parsing, preview and verified draft save
- `/employer/dashboard.html` - verified HR workspace for owned jobs, drafts, publish and candidate pipeline

## Official-source data pipeline

The repository includes the V1 official-source pipeline:

- allow-listed employer career sources in `pipeline/sources.json`
- public-page crawler with `robots.txt` checks in `scripts/crawl-official.mjs`
- raw source snapshots in `pipeline/raw/`
- normalization, department/zone mapping and canonical job IDs
- deduplication across repeated official sources
- freshness ledger (`fresh` → `needs_recheck` → `expired`)
- generated static fallback dataset in `data/jobs.js`
- provenance/evidence artifacts in `data/*.generated.json`
- scheduled GitHub Action to refresh official-source data twice daily after merge
- optional D1 sync that remains disabled until Cloudflare credentials and `ENABLE_D1_SYNC=true` are explicitly configured

Current offline seed: 16 normalized jobs, 5 employer/property entities, 3 official source registries, 0 duplicate canonical keys. Additional official sources are added only when a stable public career listing can be verified; expired jobs are not used to inflate the live dataset.

## Cloudflare/D1 production topology

Production is locked to one Worker origin:

`Workers Static Assets + /api/* Worker + D1`

This keeps candidate/HR calls same-origin and avoids splitting the approved UI onto GitHub Pages with a separate API domain.

Important files:

- `wrangler.toml` - Worker, static assets, D1, rate limits and fail-closed launch switches
- `.assetsignore` - prevents server/config/source files from becoming public assets
- `.dev.vars.example` - local secret template only
- `docs/DEPLOYMENT.md` - provisioning, migrations, smoke, staged activation and rollback
- `scripts/check-deploy-config.mjs` - deployment contract verifier
- `scripts/smoke.mjs` - same-origin post-deploy smoke test

No real D1 ID or production secret is committed.

## Fail-closed launch model

Sensitive flows are **OFF by default** even after infrastructure exists:

```toml
CANDIDATE_WRITES_ENABLED = "false"
EMPLOYER_CLAIMS_ENABLED = "false"
HR_AUTH_MODE = "disabled"
```

A first deployment can therefore serve live/read-only jobs without accidentally accepting candidate PII, employer claims or exposing HR candidate APIs.

`GET /api/readiness` reports infrastructure readiness plus the non-secret launch state.

## D1 / Worker backbone

- `migrations/0001_core.sql` - employer, HR identity/membership, jobs, provenance, guest, intent, application and event schema
- `migrations/0002_application_tracking.sql` - private guest tracking, withdrawal and acquisition-source fields
- `migrations/0003_employer_claims.sql` - employer claim review records
- `migrations/0004_employer_sessions.sql` - verified HR sessions
- `migrations/0005_job_drafts.sql` - employer-owned JD drafts and published-job linkage
- `migrations/0006_guest_phone_uniqueness.sql` - one guest identity per non-null phone hash
- `worker/src/router.mjs` - hardened Worker entrypoint, readiness and launch gates
- `worker/src/index.mjs` - legacy/core read, tracking, HR and internal bridges
- `worker/src/public-writes.mjs` - hardened candidate application/intent and employer-claim writes
- `worker/src/drafts.mjs` - parser-aware employer draft API with server-side URL/length validation
- `worker/src/extensions.mjs` - runtime public jobs + verified draft publish
- `worker/src/admin.mjs` - internal employer-claim review queue/detail
- `worker/src/access-admin.mjs` - internal HR membership inspection + session revocation kill switch
- `scripts/export-d1-seed.mjs` - normalized data → idempotent D1 seed
- `docs/API_V1.md` - current API/security contract
- `docs/CLAIM_REVIEW.md` - claim operations runbook
- `docs/DATA_LIFECYCLE.md` - engineering/operations privacy lifecycle gates

## Runtime public data

Public job pages keep the approved static frontend and use a progressive runtime layer:

`data/jobs.js -> /api/jobs.js -> assets/app.js`

The generated static dataset loads first. When Worker/D1 is available, `/api/jobs.js` replaces `window.PQC_JOBS` before the page app renders. If runtime data is unavailable, the static seed still works.

This means an employer-published D1 job can appear in homepage/search/detail without rebuilding the static site. A requested dynamic job that cannot be loaded is never silently replaced with another seed job.

Tri-state benefit data remains truthful: `unknown` stays unknown rather than being converted to `no`.

## Candidate privacy and write hardening

Candidate PII is encrypted with `PII_KEY`; D1 stores a separate HMAC phone hash only for lookup/deduplication.

Application write rules now include:

- explicit job/employer consent
- bounded public input fields
- fresh/non-expired job validation
- unique phone-hash identity in D1
- concurrent guest-identity insert race recovery
- application dedupe per guest/job
- application rate limit keyed by phone HMAC, not shared IP
- tracking secret stored only as hash and never placed in URL
- withdrawal without account

Application lifecycle:

`submitted -> viewed -> shortlisted -> interview -> offer -> joined`

Open applications may also end as `rejected` or `withdrawn`.

Acquisition source (`direct`, `facebook`, `zalo`, `google`, `referral`, `other`) is stored on intent/application records so hiring effectiveness can later be measured through interview/offer/join, not only page traffic.

## Employer identity and permissions

HR identity is separate from employer membership. This is deliberate: one cluster HR account may legitimately manage multiple Phu Quoc properties.

Flow:

`claim employer -> pending review -> verified HR identity -> active membership -> HR session -> scoped data access`

Rules:

- submitting a claim never grants candidate access
- employer claims are OFF by default until operations is ready
- work email helps verification but does not auto-approve a claim
- personal email requires an official `http/https` proof URL for manual review
- claim writes are bounded/idempotent and rate-limited by email HMAC
- review queue does not expose full HR email; privileged claim detail decrypts it only behind internal auth
- candidate PII is decrypted only after a valid HR session **and** an active membership for the employer that owns the job
- a single-property HR identity cannot query candidates/jobs from another employer
- a cluster HR identity can hold multiple explicit memberships
- internal ops can inspect memberships and revoke all live sessions for a compromised HR identity
- JD drafts are owned by both the HR identity and selected employer/property

## Draft to public job

Verified HR can publish an eligible text-JD draft from HR Workspace after HR auth is deliberately enabled.

Publish rules:

- session + active employer membership are required
- `viewer` cannot publish
- another HR user's draft requires `owner` or `admin`
- URL/poster drafts stay `needs_parser` until the production server parser/OCR confirms them
- untrusted draft fields are bounded server-side; source URL accepts only `http/https`
- a `needs_parser` or closed draft cannot publish
- repeat publish is idempotent
- if the employer already has the same job title, publish confirms/refreshes that job instead of blindly creating another record
- unknown draft benefits cannot overwrite an existing confirmed yes/no benefit value
- successful publish sets `employer_confirmed_at`, refreshes the job and links `published_job_id` back to the draft

## Commands

```bash
npm run crawl
npm run data:build
npm run data:check
npm run db:seed
npm run deploy:check
npm run deploy:check:strict
npm run smoke
npm test
```

CI syntax-checks frontend/Worker modules, verifies deployment structure, runs unit/data tests, generates the D1 seed, applies migrations `0001 -> 0006 -> seed` to clean SQLite, verifies HR multi-property isolation and guest-phone uniqueness, and validates runtime/source/draft rules.

## Still intentionally not production-wired

- real Cloudflare D1 instance and Worker deployment
- production `PII_KEY` and `INTERNAL_API_TOKEN`
- user-facing HR OTP/magic-link delivery provider and final session transport
- candidate OTP/Zalo identity and cross-device recovery
- production poster OCR/file storage and server-side URL/JD parser
- notification delivery
- final public privacy notice + approved retention/deletion policy

These pieces must be connected without changing the locked V1 visual/product principles above.
