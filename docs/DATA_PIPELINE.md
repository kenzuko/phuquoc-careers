# PhuQuocCareers official-source data pipeline

## Rule
Job demand may be seeded from public **official employer career sources**. Candidate/talent data is never scraped.

## Flow
1. `pipeline/sources.json` is the allow-listed registry of official career domains.
2. `scripts/crawl-official.mjs` checks `robots.txt`, fetches public pages only, follows job links conservatively, and extracts `JobPosting` JSON-LD when available.
3. Raw snapshots are immutable evidence in `pipeline/raw/`.
4. `scripts/build-data.mjs` normalizes titles/departments/zones, deduplicates, updates freshness state, and generates frontend data.
5. UI reads `data/jobs.js` for V1 compatibility.

## Freshness
- Seen in latest run: `fresh`
- Missing in 1-2 consecutive runs: `needs_recheck`
- Missing in 3 consecutive runs: `expired`

A missing run does not immediately delete a job. This avoids false expiry from pagination or temporary source failures.

## Non-negotiables
- No login-wall bypass, CAPTCHA bypass, anti-bot evasion, or scraping of candidate profiles.
- Do not infer salary/benefits that the official source does not state.
- `mentioned` and `confirmed` are different states.
- Preserve source URL and observation timestamp.
- Employer claim/confirmation may upgrade fields later, but never erase provenance.

## Local commands
- `npm run crawl` - live crawl when network access is available.
- `npm run data:build` - normalize snapshots and generate frontend data.
- `npm run data:check` - validate uniqueness/provenance.
- `npm test` - parser + normalizer + freshness tests.
