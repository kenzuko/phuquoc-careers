# PhuQuocCareers V1

Decision-first recruitment marketplace prototype for the Phu Quoc labor market.

## What is implemented
- Smart homepage: natural-language need input + manual search in parallel.
- Quick intent shortcuts.
- Job list with structured Phu Quoc-specific fields.
- Job detail with source provenance/freshness.
- Optional guest-first candidate flow.
- Employer JD paste -> local parser -> normalized preview -> confirm flow.
- Demo seed jobs drawn from official employer career sources and marked with source URLs.

## Run locally
```bash
python3 -m http.server 4173
```
Open http://localhost:4173

## Notes
This is a front-end V1 prototype. Authentication, crawler, database and Zalo integration are represented in the UI/data contract but are not wired to production services yet.
