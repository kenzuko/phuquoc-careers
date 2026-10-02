# PhuQuocCareers V1 - Deployment Runbook

Status: deployment contract only. No production credentials belong in Git.

## Architecture lock

Production is a **single Cloudflare Worker deployment**:

- approved static UI is served through Workers Static Assets
- `/api/*` runs Worker code first
- D1 is bound as `DB`
- candidate and HR API calls remain same-origin
- application and employer-claim writes use Worker Rate Limiting bindings keyed by hashed identity, not shared IP
- do not split production into GitHub Pages + a separate `workers.dev` API unless the frontend/API contract is redesigned intentionally

The repo-root asset directory is safe only because `.assetsignore` excludes Worker source, migrations, pipeline, tests, scripts, docs and config files.

## Fail-closed launch switches

A first cloud deployment is intentionally read-only for sensitive flows:

```toml
CANDIDATE_WRITES_ENABLED = "false"
EMPLOYER_CLAIMS_ENABLED = "false"
HR_AUTH_MODE = "disabled"
```

Meaning:

- public jobs/search/runtime D1 data may operate
- `Quan tâm` / application API writes remain disabled
- employer claim submission remains disabled
- verified HR workspace APIs remain disabled

Do **not** turn all three on together just because infrastructure is ready.

Recommended staged activation:

1. deploy read-only and pass static/API smoke
2. enable `EMPLOYER_CLAIMS_ENABLED = "true"` only after claim-review ownership/process is live
3. enable `CANDIDATE_WRITES_ENABLED = "true"` only after privacy notice, retention/deletion process and controlled write smoke are ready
4. keep `HR_AUTH_MODE = "disabled"` until real user-facing HR authentication and secure session transport are implemented; the current internal bearer-session bridge is integration scaffolding, not the production login solution

Each switch change should be reviewed in Git and redeployed deliberately.

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

Current V1 sequence includes:

- `0001_core.sql`
- `0002_application_tracking.sql`
- `0003_employer_claims.sql`
- `0004_employer_sessions.sql`
- `0005_job_drafts.sql`
- `0006_guest_phone_uniqueness.sql`

Migration 0006 is required before public application traffic because it enforces one guest identity per non-null phone hash; the Worker handles concurrent insert races by reusing the identity that won the unique constraint.

The migration chain is additive. Do not edit an already-applied migration in place. Add a new numbered migration instead.

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

The deployment config declares two public-write rate-limit bindings:

- `APPLICATION_RATE_LIMITER`
- `CLAIM_RATE_LIMITER`

Before the first real Cloudflare deployment, confirm the chosen rate-limit `namespace_id` values are reserved/unique for this account/environment. If they conflict with another Worker, change the IDs in `wrangler.toml` before deploy; the binding names must remain aligned with Worker code.

Do not remove or rename the bindings without updating the Worker and deploy verifier together. The application fails open if the binding service itself is temporarily unavailable, so rate limiting is abuse protection, not an availability dependency.

## 6. Smoke test

Run against the exact deployed origin:

```bash
PQC_BASE_URL=https://YOUR_DEPLOYED_ORIGIN npm run smoke
```

Smoke must verify:

- homepage loads
- job results page loads
- `/api/health` responds
- `/api/readiness` reports ready and exposes current launch-switch state
- `/api/jobs.js` returns runtime D1 data
- `wrangler.toml` is not publicly served
- Worker source is not publicly served

Do not perform candidate/claim write smoke while the matching launch switch is intentionally off.

Before enabling a write switch, perform a controlled test in a non-public/pilot context and verify D1 writes, encryption, dedupe and rate limiting. Delete/test-isolate those records according to the pilot data procedure.

## 7. Custom domain

Attach the final PhuQuocCareers domain only after smoke passes on the deployment origin. Re-run smoke against the custom domain after DNS/TLS is active.

## Scheduled official-source refresh

The crawler can continue to run on GitHub Actions twice daily. In production, the refresh process has two separate responsibilities:

1. update evidence/normalized data in Git
2. sync the generated idempotent seed into D1

The D1 sync workflow must stay disabled until repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` exist and the operator explicitly enables it with `ENABLE_D1_SYNC=true`.

## Employer claim operations

Use `docs/CLAIM_REVIEW.md` for the review queue, detail inspection and approval/rejection process.

A named human owner must exist before public claim traffic is accepted. Work email is evidence, not automatic approval.

If an HR identity may be compromised, use the internal revoke-sessions operation before investigating further.

## Data lifecycle

Use `docs/DATA_LIFECYCLE.md` as the engineering/operations contract for consent boundaries, PII handling and launch blockers. Final retention periods and public privacy wording still require explicit approval/review before candidate writes are enabled.

## Rollback rules

- Worker/static UI: roll back the Worker deployment as one unit.
- D1: do not assume a Worker rollback reverses database migrations.
- Migrations must remain forward/additive whenever practical.
- Before a risky data migration, take an explicit D1 export/backup according to current Cloudflare procedures.
- A failed official-source crawl must not delete healthy jobs immediately; freshness/expiry rules remain authoritative.

## Production gates before real candidate traffic

Technical:

- D1 provisioned and all migrations through 0006 applied
- required secrets configured
- application/claim rate-limit bindings configured and namespace IDs confirmed
- strict deploy check passes
- smoke passes on final origin
- read-only deploy verified before enabling sensitive switches
- controlled write smoke passes without leaking raw PII
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
