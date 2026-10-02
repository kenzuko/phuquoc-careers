# Employer Claim Review - V1 Operations

Purpose: verify that an HR user is legitimately associated with an existing Phu Quoc employer/property before granting membership and candidate access.

This is an internal operations process. Do not expose `INTERNAL_API_TOKEN` to browsers, public admin pages or third-party automation.

## Review principle

A claim is evidence to review, not proof by itself.

- A corporate/work email is a useful signal but does **not** auto-approve a claim.
- A free/personal email requires an official proof URL and manual review.
- A website/Facebook/career page URL is supporting evidence, not automatic authorization.
- If evidence is unclear, leave the claim `pending` instead of guessing.
- Candidate access starts only after claim approval creates an active employer membership and HR auth is deliberately enabled.

## 1. List pending claims

Use the internal token in an Authorization header:

```bash
curl -sS \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  "https://YOUR_ORIGIN/api/internal/employer-claims?status=pending&limit=50"
```

The queue intentionally returns only the HR email domain, not the decrypted full email address.

Review:

- employer/property requested
- requested role
- email domain
- verification method
- proof URL when supplied
- request timestamp

## 2. Open one claim detail

```bash
curl -sS \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  "https://YOUR_ORIGIN/api/internal/employer-claims/CLAIM_ID"
```

This privileged detail route decrypts the submitted HR email for the reviewer. Do not paste this output into public tickets/chats/logs.

## 3. Evidence checks

For a work-email claim, check at minimum:

- domain plausibly belongs to the employer/operator
- employer/property relationship is plausible
- role requested matches the recruiting context
- no conflicting active membership/claim evidence exists

For a manual/free-email claim, additionally check:

- proof URL is an official employer-controlled or clearly attributable channel
- the claimant can be corroborated through that channel or another employer-controlled contact path

When needed, contact the employer using a contact method independently sourced from the employer's official website/channel, not only a phone/email supplied by the claimant.

## 4. Approve

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"approved"}' \
  "https://YOUR_ORIGIN/api/internal/employer-claims/CLAIM_ID"
```

Approval:

- creates or verifies the HR identity
- creates/activates the explicit employer membership
- marks the employer claimed/verified in the current V1 model
- does **not** itself deliver a login session to the HR user

The user-facing HR login/OTP/magic-link delivery remains a separate production integration.

## 5. Reject

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"rejected"}' \
  "https://YOUR_ORIGIN/api/internal/employer-claims/CLAIM_ID"
```

Reject when the claim is demonstrably invalid or unauthorized. If evidence is merely incomplete, prefer keeping it pending until follow-up is complete.

## Inspect an HR identity's memberships

```bash
curl -sS \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  "https://YOUR_ORIGIN/api/internal/hr-identities/HR_ID/memberships"
```

This is useful for cluster HR where one verified identity legitimately belongs to more than one property.

## Emergency session revocation

If a session token may have leaked, the HR user's device is lost, or access should be stopped immediately:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  "https://YOUR_ORIGIN/api/internal/hr-identities/HR_ID/revoke-sessions"
```

This revokes all currently live sessions for that HR identity. Employer memberships remain unchanged and can be reviewed separately.

## Operational safety

- Keep `HR_AUTH_MODE=disabled` until real HR authentication/session delivery is ready.
- Rotate `INTERNAL_API_TOKEN` if it may have leaked.
- Never include the token in a query string.
- Never send the token to frontend JavaScript.
- Keep claim-detail output containing HR email out of ordinary analytics/event logs.
- Do not export candidate PII as part of claim review.
- Review activity should have a named human owner before public launch.
