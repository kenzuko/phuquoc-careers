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

## Not production-wired yet

Crawler/refresh worker, persistent database, employer verification, OTP/Zalo identity, production JD/poster parser, notifications, real applications and analytics remain backend milestones after visual/product review.