# PHUQUOCCAREERS - VISUAL + DECISION UX LOCK

Status: LOCKED for `feat/visual-rebuild`
Scope: candidate-facing presentation and decision UX. Backend contracts, D1 schema, crawler, identity, consent, lifecycle and security stay unchanged unless a later architecture decision explicitly changes them.

## 1. PRODUCT POSITIONING

PhuQuocCareers is not a generic job board and not an employer-branding directory.

Candidate-side product flow:

`Situation -> Need -> Options -> Trade-offs -> Decision -> Intent -> Apply -> Track`

The basic unit of the experience is a **decision**, not a job post.

Employer is supporting metadata and trust evidence, not the main content object.

## 2. APPROVED VISUAL REFERENCE

Use the latest approved mock as the primary visual direction.

Visual feeling to preserve:
- warm premium hospitality, not SaaS dashboard
- bright white + soft beige + light blue surfaces
- navy as main editorial text color
- teal/green for confirmed positive facts
- orange/amber for caution / needs confirmation
- restrained red only for explicit unresolved questions / warnings
- real Phu Quoc / hospitality work imagery, not generic tropical postcards
- high information density but with generous spacing and clear hierarchy
- consumer-grade, inviting and easy to browse

Do not blindly copy pixels. Preserve the visual hierarchy and emotional feel.

## 3. VISUAL SYSTEM RULES

### Radius
- large information panels: 4-6px
- job cards / search panels: 4-6px
- chips, badges, status controls: may use pill radius
- circular controls only when semantically appropriate
- avoid large 12-24px SaaS-style rounded containers

### Shadows
- very light only
- no floating glass cards
- no heavy elevation stack
- hierarchy should come from spacing, typography, borders and image contrast

### Motion
- 180-220ms typical transition
- subtle hover lift 2-3px maximum
- no bounce, glow, animated gradients or decorative motion
- smart-search parsing may reveal interpreted needs progressively but calmly

### Typography
- strong editorial hierarchy
- hero may use a premium serif/display face if it harmonizes with the brand
- body/UI remains highly readable sans-serif
- avoid tiny low-contrast metadata

## 4. HOMEPAGE INFORMATION ARCHITECTURE

Homepage is candidate-first and situation-first.

Primary navigation candidate side:
- Tìm việc
- Nghề của tôi
- Đã lưu
- So sánh
- Dành cho nhà tuyển dụng

Do not promote Employer Directory in main candidate navigation.

### Hero
Hero message centers on a better work-life decision in Phu Quoc.

Approved direction:
> Công việc tốt hơn cho cuộc sống của bạn ở Phú Quốc.

Supporting idea:
> Không chỉ là lương. Xem cả gói công việc, điều kiện sống và lựa chọn phù hợp với bạn.

Use real work/hospitality imagery with Phu Quoc context.

### Situation shortcuts
Preferred examples:
- Tôi cần việc ngay
- Tôi muốn đổi resort
- Tôi cần chỗ ở
- Tôi muốn tăng thu nhập
- Tôi mới đến Phú Quốc
- Tôi chưa biết hợp nghề gì

These are intent/situation entry points, not decorative chips.

### Search
Two equal first-class modes:
1. natural-language need search
2. manual search/filter

Do not visually make manual search look secondary.

Natural-language example:
> Tôi đang làm lễ tân 2 năm, muốn Nam đảo, có staff house, lương khoảng 12 triệu.

After input, interpretation should be explicit and editable.

Example interpreted need:
- Lễ tân
- 2 năm kinh nghiệm
- Nam đảo
- cần chỗ ở
- khoảng 12 triệu

No opaque AI ranking language.

### Market snapshot
Show real live values only.

Examples:
- việc đang tuyển / recently checked
- việc có hỗ trợ chỗ ở
- việc công khai service charge
- việc cần người sớm
- việc theo khu vực
- latest check timestamp
- department with most active demand

Never use fake launch numbers.

## 5. JOB CARD - CORE VISUAL OBJECT

The job card must communicate a work decision in 3-5 seconds.

Hierarchy:
1. role/title
2. location / job environment / direct recruitment status
3. base salary
4. service charge
5. work package
6. fit evidence
7. unresolved questions
8. freshness/source
9. employer identity as supporting trust metadata

### Work package fields
Candidate-facing package should prioritize:
- base salary
- service charge
- staff house / accommodation
- meals
- shuttle / transport
- days off
- shift / work hours when known
- location

Tri-state semantics must remain explicit:
- yes / confirmed
- no / explicitly unavailable
- unknown / not yet confirmed

Unknown is NOT false.

### Visual unknown state
Unknown must have a recognizable visual language across all pages:
- soft amber/yellow background or marker
- `?` or explicit text `Chưa xác nhận`
- never imply negative

This becomes one of PhuQuocCareers' visual signatures.

### Freshness
Avoid labels like `VERIFIED`, `ACTIVE`, or `fresh` as generic system badges.

Prefer factual evidence:
- `Kiểm tra trên nguồn tuyển dụng lúc 06:10 hôm nay`
- `Nhà tuyển dụng xác nhận hôm qua`
- `Cần kiểm tra lại`

Evidence > badge.

## 6. FIT EVIDENCE - NO MATCH SCORE

Never show:
- 92% match
- perfect match
- AI recommended
- job winner

Show explicit evidence instead.

Example:
### Khớp với điều bạn tìm
- đúng nhóm F&B
- có hỗ trợ chỗ ở
- mức lương nằm trong khoảng bạn nhập
- đúng Nam đảo

### Điểm cần cân nhắc
- shuttle sau ca 23h chưa xác nhận
- ca đêm có thể có
- yêu cầu kinh nghiệm giám sát

All fit statements must trace to:
`declared need <-> job field`

Do not infer personality or hidden intent.

## 7. JOB DETAIL - DECISION SHEET FIRST

Job detail should not open like a traditional JD page.

Preferred hierarchy:
1. title + concise trust metadata
2. primary actions: Quan tâm / Ứng tuyển
3. Gói công việc
4. location / commute / shift context
5. Khớp với điều bạn tìm
6. Điểm cần cân nhắc
7. `N điều cần xác nhận với HR`
8. job description / requirements
9. source evidence
10. employer information, minimal

### Do not use data-completeness score language
Avoid:
- `3/7 unknown`
- `information score`

Prefer:
> 3 điều cần xác nhận với HR

### HR questions
Examples:
- Shuttle có chạy sau ca 23h không?
- Staff house cách nơi làm bao xa?
- Có hỗ trợ chỗ ở cho cặp vợ chồng không?
- Service charge trong thời gian thử việc thế nào?

Long-term loop:
`unknown -> candidate question -> HR answer -> confirmed structured fact`

Do not turn this into a discussion forum.

## 8. LOCATION AS A DECISION FACTOR

Location must be stronger than in a nationwide job board.

Relevant Phu Quoc context:
- Bắc đảo
- Dương Đông
- Bãi Trường
- Nam đảo
- An Thới / Hòn Thơm where relevant

When user location/home area is known or voluntarily supplied, system may show practical commute context.

Examples:
- approximate commute
- shuttle availability
- shift end time
- late-shift transport uncertainty

Do not fabricate exact commute if data is unavailable.

## 9. COMPARE

Compare is a major decision function, not a decorative secondary page.

Trigger compare drawer only after the user has selected/saved at least 2 jobs.

Comparison should expose trade-offs, not declare a winner.

Compare rows prioritize:
- salary
- service charge
- housing
- meals
- shuttle
- days off
- shift
- location
- unresolved items
- freshness

No score, ranking or `best job` verdict.

## 10. CAREER NAVIGATION - `NGHỀ CỦA TÔI`

Move away from generic personality quiz behavior.

For experienced workers, show career navigation.

Example:
`Waiter -> Captain -> Supervisor -> Assistant Manager`

Useful context:
- jobs currently visible in each step
- common requirements
- English expectation
- skills commonly requested
- work package patterns when enough data exists

For new workers, simple guided discovery remains available.

## 11. CANDIDATE PROFILE = WORK STATE, NOT CV FIRST

Candidate profile should focus on:
- what I do now
- what I want next
- when I can move
- must-have conditions
- areas I prefer
- income expectation
- housing / transport needs
- whether employers may contact me

CV is optional supporting material.

Intent states remain explicit, time-bounded and user-controlled.

## 12. EMPLOYER ROLE IN CANDIDATE UX

Employer data remains important for trust and source integrity, but employer storytelling is not the candidate product core.

Candidate-facing employer information should normally be limited to:
- employer/property name
- property type when useful
- area
- direct employer / agency status
- source provenance
- last confirmed/checked time
- response behavior only if factual and supported

Do not build long `About company`, culture, mission or employer-brand storytelling in V1 candidate flow.

Employer directory may exist for SEO/source integrity but is not a main navigation destination.

## 13. HR SIDE

HR UI shares brand DNA but should be visually denser and operational.

HR priorities:
- job status
- active candidate intent
- candidate stage
- interview confirmation
- offer state
- join outcome
- unresolved job information

Do not make HR workspace look like the candidate homepage.

## 14. MOBILE IS PRIMARY

Candidate experience must be designed mobile-first.

Requirements:
- package fields readable without horizontal table scrolling
- sticky actions on job detail: Quan tâm / Ứng tuyển
- filters as bottom sheet or compact mobile control
- compare must work vertically
- unknown/freshness states remain understandable at small sizes
- no oversized hero that pushes all useful information below the fold

## 15. IMAGE POLICY

Use real Phu Quoc / real hospitality work imagery where possible.

Good subjects:
- front office
- F&B service
- housekeeping
- resort operations
- shuttle/commute context
- property context
- retail/service/tour work as coverage expands

Avoid:
- generic AI people as production content
- generic tropical-beach hero with no work context
- overuse of luxury imagery that implies the product is only for five-star resorts

## 16. WHAT TO LEARN FROM OTHER PRODUCTS

Take principles, not visual copies.

- Airbnb: decision-first discovery, meaningful attributes, trade-off browsing
- Levels.fyi: compensation/data as the product object
- Wellfound: upfront economics and low application friction
- LinkedIn: explicit preference interpretation and explainability
- Welcome to the Jungle: selective inspiration for premium imagery and workplace context only, not employer-story architecture

## 17. HARD NOs

Do not regress into:
- generic job-board layout
- employer logo wall as a main experience
- generic SaaS dashboard aesthetic
- excessive large-radius cards
- glassmorphism
- animated gradients
- AI badges
- fake statistics
- hidden match scores
- unknown treated as no
- `verified/active/fresh` system jargon
- long forced onboarding before seeing jobs
- forced account creation before search

## 18. IMPLEMENTATION RULE

Do not recreate the previous failed approach of stacking a large visual override layer on top of old CSS/JS.

For `feat/visual-rebuild`:
- rebuild presentation cleanly page-by-page
- start with Homepage -> Search Result -> Job Detail
- validate desktop and mobile before propagating to other pages
- preserve existing data/API contracts
- do not deploy public preview merely because CI passes
- visual QA by actual rendering is required before approval

## 19. ACCEPTANCE TEST

If the PhuQuocCareers logo is hidden, a user should still be able to recognize the product by these traits:

- Phu Quoc work/life context
- work package visible immediately
- unknown fields shown honestly
- freshness backed by evidence
- explicit fit reasons and trade-offs
- easy comparison
- no job score or AI theater

The desired reaction is not:
> `Một website tuyển dụng đẹp.`

The desired reaction is:
> `Trang này cho mình thấy công việc thực sự có gì, cái gì còn chưa rõ, và có hợp cuộc sống của mình ở Phú Quốc không.`
