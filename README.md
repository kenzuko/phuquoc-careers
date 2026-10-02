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

Current seed: 16 normalized jobs, 5 employer/property entities, 3 official source registries, 0 duplicate canonical keys. Additional official sources are added only when a stable public career listing can be verified; expired jobs are not used to inflate the live dataset.

## D1 / Worker backbone

Schema and API code are present but **not deployed to production yet**.

- `migrations/0001_core.sql` - employer, HR identity/membership, jobs, provenance, guest, intent, application and event schema
- `migrations/0002_application_tracking.sql` - private guest tracking, withdrawal and acquisition-source fields
- `migrations/0003_employer_claims.sql` - employer claim review records
- `migrations/0004_employer_sessions.sql` - verified HR sessions
- `migrations/0005_job_drafts.sql` - employer-owned JD drafts and published-job linkage
- `worker/src/router.mjs` - Worker entrypoint
- `worker/src/index.mjs` - core candidate/claim/HR APIs
- `worker/src/drafts.mjs` - parser-aware employer draft API
- `worker/src/extensions.mjs` - runtime public jobs + verified draft publish
- `scripts/export-d1-seed.mjs` - exports normalized job data to `pipeline/generated/d1-seed.sql`
- `docs/API_V1.md` - API/security contract

### Runtime public data

Public job pages keep the approved static frontend and use a progressive runtime layer:

`data/jobs.js -> /api/jobs.js -> assets/app.js`

The generated static dataset loads first. When Worker/D1 is available, `/api/jobs.js` replaces `window.PQC_JOBS` before the page app renders. If runtime data is unavailable, the static seed still works.

This means an employer-published D1 job can appear in homepage/search/detail without rebuilding the static site. A requested dynamic job that cannot be loaded is never silently replaced with another seed job.

Tri-state benefit data remains truthful: `unknown` stays unknown rather than being converted to `no`.

### Candidate privacy

Candidate PII is designed to be encrypted with `PII_KEY`; the database stores a separate phone hash only for lookup/deduplication. Guest application tracking uses a high-entropy token returned once; only its hash is stored in D1, and the browser sends the secret in a request header rather than putting it in a URL.

Application lifecycle:

`submitted -> viewed -> shortlisted -> interview -> offer -> joined`

Open applications may also end as `rejected` or `withdrawn`. Candidates can withdraw from their private tracking page without creating an account.

Acquisition source (`direct`, `facebook`, `zalo`, `google`, `referral`, `other`) is stored on intent/application records so hiring effectiveness can later be measured through interview/offer/join, not only page traffic.

### Employer identity and permissions

HR identity is separate from employer membership. This is deliberate: one cluster HR account may legitimately manage multiple Phu Quoc properties.

Flow:

`claim employer -> pending review -> verified HR identity -> active membership -> HR session -> scoped data access`

Rules:

- submitting a claim never grants candidate access
- work email helps verification but does not auto-approve a claim
- personal email requires an official proof URL for manual review
- candidate PII is decrypted only after a valid HR session **and** an active membership for the employer that owns the job
- a single-property HR identity cannot query candidates/jobs from another employer
- a cluster HR identity can hold multiple explicit memberships
- JD drafts are owned by both the HR identity and the selected employer/property

### Draft to public job

Verified HR can publish an eligible text-JD draft from HR Workspace.

Publish rules:

- session + active employer membership are required
- `viewer` cannot publish
- another HR user's draft requires `owner` or `admin`
- URL/poster drafts stay `needs_parser` until the production server parser/OCR confirms them
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
npm test
```

CI syntax-checks frontend bridges and Worker modules, runs unit/data tests, generates the D1 seed, applies `0001 -> 0002 -> 0003 -> 0004 -> 0005 -> seed` to a clean SQLite database, verifies multi-property HR memberships, checks single-property isolation, validates draft ownership/publish schema, and tests truthful runtime job mapping.

## Still intentionally not production-wired

- Cloudflare D1 instance and real Worker deployment
- production `PII_KEY` and `INTERNAL_API_TOKEN`
- delivery provider for HR login verification / OTP or magic link
- candidate OTP/Zalo identity and cross-device recovery
- production poster OCR/file storage and server-side URL/JD parser
- notification delivery
- real-world claim review/admin operations UI

These pieces must be connected without changing the locked V1 visual/product principles above.
