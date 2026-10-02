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
- Visual ADN is shared across homepage, results, job detail, careers, employer directory and HR ingestion.

## Current prototype routes

- `/index.html` - decision-first homepage
- `/jobs.html` - smart/manual search results and working filters
- `/job.html?id=...` - structured job detail, interest/apply flows
- `/careers.html` - lightweight career exploration
- `/employer.html` - employer directory and claim concept
- `/employer/post.html` - JD/poster/URL ingestion and confirmation preview

## Official-source data pipeline

The repository now includes the V1 official-source pipeline:

- allow-listed employer career sources in `pipeline/sources.json`
- public-page crawler with `robots.txt` checks in `scripts/crawl-official.mjs`
- raw source snapshots in `pipeline/raw/`
- normalization, department/zone mapping and canonical job IDs
- deduplication across repeated official sources
- freshness ledger (`fresh` → `needs_recheck` → `expired`)
- generated frontend dataset in `data/jobs.js`
- provenance/evidence artifacts in `data/*.generated.json`
- scheduled GitHub Action to refresh official-source data twice daily after merge

Commands:

```bash
npm run crawl
npm run data:build
npm run data:check
npm test
```

Current offline validation: 16 normalized jobs, 5 employer/property entities, 3 official source registries, 0 duplicate canonical keys. Live crawl code is present but was not network-executed in the current sandbox because outbound DNS is unavailable.

## Still not production-wired

Persistent database, employer verification, OTP/Zalo identity, production JD/poster OCR/parser, notifications, real applications and analytics remain backend milestones.