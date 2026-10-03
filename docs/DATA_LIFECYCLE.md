# PhuQuocCareers V1 - Data Lifecycle Contract

Status: engineering/operations contract for review before public launch. This is not a substitute for a final legal privacy policy.

## Core rule

Collect the smallest amount of personal data needed for the action the user explicitly chose.

A job application to Employer A does not automatically create permission for Employer B to discover that person. Talent discovery/open-to-opportunities requires a separate, explicit consent surface when that feature is implemented.

## Fail-closed before policy approval

The production config defaults sensitive collection to OFF:

- `CANDIDATE_WRITES_ENABLED=false`
- `EMPLOYER_CLAIMS_ENABLED=false`
- `HR_AUTH_MODE=disabled`

This allows a read-only jobs deployment before personal-data operations are approved. Do not enable a switch merely because the technical endpoint exists.

## Data classes

### Public job/employer data
Examples:
- employer/property name
- job title and department
- location
- salary/benefit fields that are publicly sourced or employer-confirmed
- provenance URL and freshness metadata

Source: official public employer sources or verified employer input.

### Candidate PII
Current examples:
- name
- phone/Zalo contact number

Storage rules:
- encrypted before persistence
- raw phone is not used as a database lookup key
- HMAC phone hash is used for identity lookup/deduplication
- database enforces one guest identity per non-null phone hash
- an anonymous intent guest can be upgraded/merged into the same phone-based identity when that user later applies, so intent and application history do not needlessly split
- never place raw candidate PII in analytics/event payloads or URLs

### Candidate intent
Examples:
- browsing
- open to offers
- actively looking
- available soon/now

Rules:
- intent is declared by the candidate, not silently inferred as fact from browsing
- current V1 intent expires after 30 days unless reconfirmed
- expired intent must not be represented to HR as currently active

### Applications
Contains:
- candidate identity reference
- selected job
- consent scope
- interview/start preference
- application state/outcome
- acquisition channel

Current consent scope is `this_employer_only`.

### HR identity and claims
Contains:
- encrypted HR email
- hashed email lookup value
- domain
- employer/property membership
- role and verification status
- claim proof URL when supplied

Claim submission does not grant candidate access. Candidate access requires verified HR identity + active membership for the job's employer + deliberately enabled production HR auth.

### Sessions and tracking secrets
Rules:
- server stores hashes, not raw secrets
- guest tracking secret is never placed in the URL
- expired/revoked HR sessions must not authenticate requests
- internal ops has an emergency revoke-all-sessions control for one HR identity

### Events/analytics
Allowed payloads should be operational identifiers and non-PII facts such as:
- event type
- job/employer/application IDs
- source channel
- status transition

Do not copy names, phone numbers, HR emails or free-form candidate text into analytics event JSON.

## User actions and consent boundaries

### `Tôi quan tâm`
This is an intent signal, not an application.

Do not expose contact PII to an employer merely because the user saved or viewed a job.

### `Ứng tuyển`
Requires explicit consent for the selected job/employer before candidate data is sent/stored for that application.

### Future talent pool / Open to opportunities
Must use separate consent from a specific-job application. Do not backfill existing applicants into a searchable talent pool by default.

## Retention states that must exist operationally

Before public candidate traffic, the operator must approve explicit retention periods for at least:

- active application candidate PII
- rejected/withdrawn application candidate PII
- joined candidate application history
- expired candidate intent
- employer claim evidence
- rejected claims
- HR sessions
- operational event logs
- raw crawler snapshots

Do not infer statutory retention periods in code. Record the approved policy and legal basis before implementing automatic deletion schedules.

## Deletion and correction requirements before public launch

The product/ops design must provide a verified path to:

- correct candidate contact information
- withdraw an application without an account (already supported)
- request deletion of candidate PII
- remove or revoke an HR identity/membership
- revoke HR sessions (ops kill switch already supported)
- correct employer-confirmed job information
- remove erroneous source/provenance data

Full candidate-profile deletion should not be authorized from a single job tracking token alone if that candidate has multiple independent applications. Use a stronger verified identity/recovery mechanism or controlled ops process.

## Database deletion behavior to preserve

When deletion is implemented:

- do not leave orphaned encrypted PII with no operational purpose
- consider whether aggregate non-PII outcome counts can remain after personal records are removed
- event payloads must already be PII-free so analytics does not become a hidden copy of deleted personal data
- application/employer audit needs and deletion rights must be reconciled in the approved retention policy, not improvised per request

## Incident readiness

Before launch, define:

- who receives a suspected data incident report
- who can rotate `PII_KEY` and `INTERNAL_API_TOKEN`
- how HR sessions are revoked
- how access to D1/Cloudflare/GitHub is reviewed
- what logs are available without exposing candidate PII
- how affected records/time windows are identified

## Launch blocker

Do not enable candidate writes or call the candidate-data system production-ready until:

1. final privacy notice is reviewed and published
2. retention periods are explicitly approved
3. a candidate correction/deletion request process exists
4. HR access revocation process exists
5. incident owner/process exists
6. real HR authentication delivery is implemented before HR auth is enabled
7. any future talent-discovery consent is separate from job-specific application consent
