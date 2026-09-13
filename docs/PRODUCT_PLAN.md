# SharePlate product and delivery plan

## Product goal

SharePlate coordinates same-day transfers of safe surplus food from verified suppliers to verified old-age homes and orphanages. The product must optimize for speed, food safety, accountability, and low-friction use on a phone.

## MVP users and permissions

| Role | MVP capabilities |
| --- | --- |
| Food supplier | Complete verification; create, edit, cancel, and track a donation; confirm safe handling and pickup window |
| Beneficiary | Complete organization verification; set serving capacity; see nearby donations; accept one; confirm collection |
| Volunteer | Refer organizations; view assignments; coordinate calls; record onboarding progress without accepting food on a beneficiary’s behalf |
| Admin | Verify organizations; moderate posts; resolve disputes; audit donation and pickup events |

## Critical journey

1. A verified supplier lists food, servings, preparation time, storage method, allergens, pickup address, and a same-day deadline.
2. The system validates the deadline and food-safety declaration, then notifies eligible verified beneficiaries inside the configured radius.
3. A beneficiary accepts. The database transaction creates one claim and makes the donation unavailable to everyone else.
4. Both organizations receive contact and pickup instructions. Status moves through `claimed`, `collected`, and `completed`.
5. The beneficiary confirms quantity received. Either party may report an issue.
6. After completion, the participants may publish a moderated impact post. Beneficiary photos require explicit consent.

## Scope by phase

### Phase 1 — working pilot

- Role-aware onboarding and organization verification
- Donation creation, nearby discovery, single-acceptance claim, pickup status
- In-app and email notifications
- Food-safety checklist, same-day expiry, allergen notes
- Admin verification queue and audit history
- Basic community posts after completed donations
- One-city launch with manually configured service radius

### Phase 2 — operational reliability

- SMS/WhatsApp notifications and escalation
- Volunteer assignments and call notes
- Pickup OTP or QR confirmation
- Cancellation, no-show, incident, and dispute workflows
- Organization reliability indicators
- Consent-aware image uploads and moderation
- Impact reports by organization, ward, and month

### Phase 3 — multi-city scale

- City/zone administration and partner NGO management
- Capacity forecasting and smarter matching
- Multi-language UI and accessibility testing
- Configurable local food-safety policies
- Public impact pages with privacy controls
- Data exports and partner integrations

## Technical architecture

### Executable prototype in this repository

- Next.js 16 + React 19 UI, built with Vinext for a Cloudflare Worker runtime
- Next route handlers as the backend boundary
- Cloudflare D1 + Drizzle for donations, claims, profiles, and community-post metadata
- Platform-provided signed-in user headers for authenticated write operations
- Static optimized image for the representative community post

This stack keeps the pilot inexpensive and deployable as one service. The API and database layer are intentionally small so they can be replaced without rewriting the UI.

### Recommended production stack before a public city launch

- Next.js/React application deployed at the edge
- Managed PostgreSQL with PostGIS for radius queries, operational reporting, and transaction-heavy matching
- Managed authentication with phone/email OTP and server-enforced role-based access
- Object storage for consented images; signed upload URLs; malware scanning and moderation
- Queue-based notification service with email plus SMS/WhatsApp provider adapters
- Error monitoring, structured audit logs, backups, rate limiting, and admin access controls

PostgreSQL/PostGIS is the better long-term data backend because proximity search, city zoning, analytics, and transactional claims are central to this product. D1 is suitable for validating the first pilot and the user experience.

## Core data model

- `profiles`: identity, role, organization, verification state
- `organizations`: type, registration evidence, address, coordinates, capacity, service radius
- `donations`: supplier, food, servings, allergens, timestamps, storage, coordinates, pickup deadline, status
- `claims`: donation, beneficiary, status, acceptance and collection timestamps; unique active claim per donation
- `pickup_events`: append-only status history and actor
- `community_posts`: author, completed donation, caption, moderation state, image metadata
- `volunteer_assignments`: volunteer, organization, task, notes, status
- `notifications`: channel, recipient, event, delivery status, attempts
- `incidents`: donation, reporter, category, severity, resolution

## Safety and trust requirements

- Do not position the app as certifying food safety; require suppliers to attest to preparation, storage, allergens, and handoff time.
- Make same-day expiry automatic and prevent acceptance after the pickup deadline.
- Display allergens and storage/transport instructions prominently.
- Verify organizations before they can donate or accept food.
- Keep an append-only audit trail for claim, cancellation, collection, and incident events.
- Require consent before publishing beneficiary photos; do not make images mandatory.
- Define local legal terms, privacy policy, retention policy, and incident response with qualified counsel and local food-safety experts before launch.

## API surface for the MVP

- `GET /api/donations` — active same-day donations, later filtered by coordinates and radius
- `POST /api/donations` — create a safety-confirmed donation
- `POST /api/donations/:id/accept` — atomically claim an available donation
- Next: status transitions, organization onboarding, post creation, moderation, and notification callbacks

## Delivery sequence

1. Validate the workflow with 3–5 suppliers and 3–5 beneficiaries in one neighborhood.
2. Complete authentication, organization verification, admin queue, and legal/safety review.
3. Add transactional claim handling and real notification delivery; run failure and no-show simulations.
4. Pilot for four weeks with direct support and weekly data review.
5. Fix operational bottlenecks, then expand one zone at a time.

## Pilot success metrics

- Donation claim rate
- Median time from listing to claim
- Successful same-day collection rate
- Servings listed, claimed, and confirmed delivered
- Cancellation/no-show and incident rates
- Weekly active verified suppliers and beneficiaries
- Repeat donation rate after 30 days
- Beneficiary satisfaction and coordinator workload

## Explicit non-goals for the first release

- Delivery fleet ownership or route optimization
- Monetary donations or payments
- Public unverified accounts
- AI-based food-safety certification
- Inter-city transfers or next-day food storage
