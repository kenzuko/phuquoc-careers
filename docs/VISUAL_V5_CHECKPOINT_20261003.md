# PhuQuocCareers Visual V5 Checkpoint - 2026-10-03

Branch: `feat/visual-rebuild`

## Scope completed

Candidate side V5:
- `/` - Homepage
- `/jobs.html` - Search Result
- `/job.html` - Job Detail
- `/careers.html` - Careers
- `/compare.html` - Compare

Employer / HR V5:
- `/employer.html` - Employer Gateway / Claim
- `/employer/post.html` - Post from existing JD / poster / URL
- `/employer/dashboard.html` - HR Workspace
- HR subflows: interview, post-interview follow-up, offer response, retention windows

## Active presentation stack

Shared candidate design system:
- `assets/candidate-v5-core.css`

Candidate page layers:
- `assets/home-v5.css`
- `assets/jobs-v5.css`
- `assets/job-v5.css`
- `assets/careers-v5.css`
- `assets/compare-v5.css`

Employer / HR layers:
- `assets/employer.css` - existing operational base retained for compatibility with dynamic HR components
- `assets/affective-ui.css` - retained until final visual cleanup
- `assets/employer-v5.css` - V5 harmonization layer
- `assets/hr-workflow-v5.css` - interview / offer / follow-up / retention V5 layer

## Product rules preserved

- Manual search remains available alongside intent search.
- `unknown` is not converted to `no`.
- Compare does not choose a winner.
- Careers does not score user ability or promise a next role.
- Employer claim stays pending-capable and does not grant candidate access.
- Candidate data remains membership-gated.
- Draft publish remains gated by parser / membership permissions.
- Application lifecycle remains forward-only except documented reject / withdraw behavior.
- Interview schedule changes invalidate stale confirmation and require candidate reconfirmation.
- Offer and retention states remain evidence-based, not inferred.

## Safety / launch state at checkpoint

Expected readiness switches remain:
- `candidateWrites: false`
- `employerClaims: false`
- `hrAuth: false`

No production merge or production cutover is part of this checkpoint.

## Verification

Latest branch checkpoint after HR subflow V5 wiring:
- `761a881e369e033b5b9b4dc376a6c0642149da56`

Verified in CI / isolated preview:
- 19/19 product tests pass
- 16 normalized jobs / 16 unique ids / 16 unique canonical keys
- strict deploy contract passes
- candidate routes smoke pass
- employer / HR routes smoke pass
- V5 candidate and employer assets smoke pass
- API health / readiness / jobs.js smoke pass
- launch switches confirmed OFF

## Intentionally not done

1. Production has not been changed.
2. PR has not been merged.
3. Write / employer claim / HR auth switches have not been enabled.
4. Exact final PQC brand asset should replace the current repo logo only when the approved source artwork is available. Do not redraw or approximate it.
5. Legacy visual files are left in place but are not part of the active Candidate V5 page stack. Archive/delete cleanup should happen only after final visual sign-off so rollback remains simple.

## Next safe step

Final visual sign-off on isolated preview, then one controlled cleanup pass for unused legacy presentation assets. Only after that should merge / production release be considered.
