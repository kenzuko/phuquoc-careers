# PhuQuocCareers V1 - Deployment Runbook

Status: deployment contract only. No production credentials belong in Git.

## Architecture lock

Production is a **single Cloudflare Worker deployment**:

- approved static UI is served through Workers Static Assets
- `/api/*` runs Worker code first
- D1 is bound as `DB`
- candidate and HR API calls remain same-origin
- do not split production into GitHub Pages + a separate `workers.dev` API unless the frontend/API contract is redesigned intentionally

The repo-root asset directory is safe only because `.assetsignore` excludes Worker source, migrations, pipeline, tests, scripts, docs and config files.

## Before provisioning cloud resources

Run:

```bash
npm test
npm run db:seed
npm run deploy:check
```

CI must be green.

## 1. Create D1

For a Phu Quoc/Vietnam workload, use the Asia-Pacific location hint:

```bash
npx wrangler d1 create phuquoc-careers --location=apac
```

Copy the returned database UUID into `wrangler.toml` and replace:

```toml
database_id = "REPLACE_AFTER_D1_CREATE"
```

Then run:

```bash
npm run deploy:check:strict
```

Do not continue while strict check fails.

## 2. Configure secrets

Required Worker secrets:

- `PII_KEY` - encryption/HMAC root for candidate and HR PII
- `INTERNAL_API_TOKEN` - internal operations authorization

They are declared under `[secrets]` in `wrangler.toml`, so deployment should fail if either is absent.

Use Cloudflare secret management. Do not put real values in `wrangler.toml`, `.env`, GitHub commits, issue comments or PR comments.

For local development only, copy `.dev.vars.example` to `.dev.vars` and replace the placeholders. `.dev.vars` is ignored by Git.

## 3. Apply schema

Check unapplied migrations first:

```bash
npx wrangler d1 migrations list phuquoc-careers --remote
```

Apply migrations:

```bash
npx wrangler d1 migrations apply phuquoc-careers --remote
```

The V1 migration chain is additive. Do not edit an already-applied migration in place. Add a new numbered migration instead.

## 4. Seed official-source jobs

Generate the current normalized seed:

```bash
npm run db:seed
```

Import it:

```bash
npx wrangler d1 execute phuquoc-careers --remote --file=pipeline/generated/d1-seed.sql
```

The seed uses stable IDs/upserts so re-running refreshes known official-source records instead of intentionally creating duplicates.

## 5. Deploy Worker + static UI together

```bash
npx wrangler deploy
```

Do not separately deploy the static HTML to a different production origin.

## 6. Smoke test

Run against the exact deployed origin:

```bash
PQC_BASE_URL=https://YOUR_DEPLOYED_ORIGIN npm run smoke
```

Smoke must verify:

- homepage loads
- job results page loads
- `/api/health` responds
- `/api/readiness` reports ready
- `/api/jobs.js` returns runtime D1 data
- `wrangler.toml` is not publicly served
- Worker source is not publicly served

## 7. Custom domain

Attach the final PhuQuocCareers domain only after smoke passes on the deployment origin. Re-run smoke against the custom domain after DNS/TLS is active.

## Scheduled official-source refresh

The crawler can continue to run on GitHub Actions twice daily. In production, the refresh process has two separate responsibilities:

1. update evidence/normalized data in Git
2. sync the generated idempotent seed into D1

The D1 sync workflow must stay disabled until repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` exist and the operator explicitly enables it.

## Rollback rules

- Worker/static UI: roll back the Worker deployment as one unit.
- D1: do not assume a Worker rollback reverses database migrations.
- Migrations must remain forward/additive whenever practical.
- Before a risky data migration, take an explicit D1 export/backup according to current Cloudflare procedures.
- A failed official-source crawl must not delete healthy jobs immediately; freshness/expiry rules remain authoritative.

## Production gates before real candidate traffic

Technical:

- D1 provisioned and migrated
- required secrets configured
- strict deploy check passes
- smoke passes on final origin
- official-source refresh has a monitored D1 sync path
- claim review operations have a human owner
- HR login delivery is real, not simulated
- candidate OTP/Zalo recovery is either implemented or clearly unavailable

Privacy/operations:

- candidate privacy notice published
- explicit application consent remains scoped to the selected employer/job
- retention/deletion procedure defined for candidate PII
- incident response contact/process defined
- no candidate/talent data is scraped from third-party job services

Do not call the system production-ready until these gates are satisfied.
