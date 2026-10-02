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
- Visual ADN is shared across homepage, results, job detail, application tracking, careers, employer directory and HR ingestion.

## Current routes

- `/index.html` - decision-first homepage
- `/jobs.html` - smart/manual search results and working filters
- `/job.html?id=...` - structured job detail, intent and guest apply flows
- `/application.html?id=...` - guest application tracking on the same trusted device
- `/careers.html` - lightweight career exploration
- `/employer.html` - employer directory and claim concept
- `/employer/post.html` - JD/poster/URL ingestion and confirmation preview

## Official-source data pipeline

The repository includes the V1 official-source pipeline:

- allow-listed employer career sources in `pipeline/sources.json`
- public-page crawler with `robots.txt` checks in `scripts/crawl-official.mjs`
- raw source snapshots in `pipeline/raw/`
- normalization, department/zone mapping and canonical job IDs
- deduplication across repeated official sources
- freshness ledger (`fresh` → `needs_recheck` → `expired`)
- generated frontend dataset in `data/jobs.js`
- provenance/evidence artifacts in `data/*.generated.json`
- scheduled GitHub Action to refresh official-source data twice daily after merge

Current seed: 16 normalized jobs, 5 employer/property entities, 3 official source registries, 0 duplicate canonical keys. Additional official sources are added only when a stable public career listing can be verified; expired jobs are not used to inflate the live dataset.

## D1 / Worker backbone

Schema and API code are present but **not deployed to production yet**.

- `migrations/0001_core.sql` - employer, jobs, provenance, guest, intent, application and event schema
- `migrations/0002_application_tracking.sql` - private guest tracking, withdrawal and acquisition-source fields
- `worker/src/` - Cloudflare Worker API
- `scripts/export-d1-seed.mjs` - exports the normalized dataset to `pipeline/generated/d1-seed.sql`
- `docs/API_V1.md` - V1 API/security contract

Candidate PII is designed to be encrypted with `PII_KEY`; the database stores a separate phone hash only for lookup/deduplication. Guest application tracking uses a high-entropy token returned once; only its hash is stored in D1, and the browser sends the secret in a request header rather than putting it in a URL.

Application lifecycle:

`submitted -> viewed -> shortlisted -> interview -> offer -> joined`

Open applications may also end as `rejected` or `withdrawn`. Candidates can withdraw from their private tracking page without creating an account.

Acquisition source (`direct`, `facebook`, `zalo`, `google`, `referral`, `other`) is stored on intent/application records so hiring effectiveness can later be measured through interview/offer/join, not only page traffic.

## Commands

```bash
npm run crawl
npm run data:build
npm run data:check
npm run db:seed
npm test
```

CI syntax-checks the UI/API bridge and Worker, runs unit/data tests, generates the D1 seed, then applies `0001 -> 0002 -> seed` to a clean SQLite database.

## Still intentionally not production-wired

- Cloudflare D1 instance and real Worker deployment
- `PII_KEY` and `INTERNAL_API_TOKEN` production secrets
- employer authentication / verified HR sessions and roles
- OTP/Zalo identity and cross-device recovery for candidates
- production poster OCR and server-side JD parser
- notification delivery
- employer-facing candidate dashboard

Those pieces must be connected without changing the locked V1 visual/product principles above.
