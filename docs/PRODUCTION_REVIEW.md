# Standalone production review

## Changes made

The previous implementation relied on platform identity headers and a hosting-specific SQLite adapter. These have been replaced with Better Auth session cookies, direct email/password and optional Google OAuth, standard Next.js route handlers and PostgreSQL.

Admin pages check authorization before reading data, independently of the layout. Admin writes require a verified database grant plus an operator-configured email allowlist. Mutation APIs check origin; JSON bodies are size-bounded and validated. Auth has database-backed rate limiting. Photos are restricted by type/size/pixel count, re-encoded without metadata, privately stored and moderated before publication.

Donation claims use an atomic conditional update inside a PostgreSQL transaction and a unique claim constraint. Lifecycle changes lock the donation row and update claims, notifications and audit records together. Pickup details are restricted to participants and admins. Available-food matching uses coordinates and a beneficiary radius when both locations are present; otherwise it falls back to normalized city. Acceptance checks capacity, location and deadline.

## Tested locally

- TypeScript and optimized Next.js production build.
- Fresh PostgreSQL migration and concurrent claim competition: one winner only.
- Unauthorized pickup changes rejected; completion synchronizes claim status; expired food cannot be claimed.
- Service-timezone date boundaries, admin allowlist checks and cross-origin rejection.
- Real signup, SMTP verification delivery, verified login, onboarding, non-admin denial and spoofed platform headers rejected.
- Password reset delivery and completion; old password rejected and prior session revoked.
- Production Docker image built and health/database connectivity checked; authentication suite also passed against the container.
- Full HTTP workflow: administrator review, donation creation/claim/collection, image privacy before moderation, publication, volunteer referral updates and notifications.
- Dependency advisory scan: no high/critical findings at review time; moderate development/transitive tool advisories remain. Do not use development servers publicly. Re-scan at release time.

## Required before public launch

### Five-feature extension checks (September 17, 2026)

Lint, TypeScript and the optimized production build passed. Unit tests cover radius/date-line matching, coordinate validation, immutable privilege fields and push endpoint restrictions. PostgreSQL tests passed for migrations, competing claims, profile revision conflicts, active-pickup edit restrictions, radius acceptance and notification queue deduplication. Real HTTP tests passed for email verification/login/reset, profile re-review, incident access controls/private notes, personal export, photo withdrawal, worker email delivery, deletion safeguards and session invalidation after account deletion. Browser push and Google OAuth still require live provider acceptance testing on the deployment domain. The new code has not been published to the old hosted site.

1. Configure domain/TLS, database, persistent uploads, SMTP sender authentication, real secrets and administrator identities.
2. Supply Google OAuth credentials and test its live callback/consent flow. It cannot be end-to-end verified without your provider configuration.
3. Enable expiry, notification-delivery and media-cleanup schedulers, reverse-proxy rate limits and abuse monitoring. Configure SMTP and optional VAPID browser-push credentials. Run real-browser push acceptance tests on your HTTPS domain. SMS is not implemented.
4. Establish backup retention, off-host copies, restore drills, uptime alerts and an incident-response owner.
5. Publish organization-specific privacy/retention terms, support contact and consent procedures. Do not upload identifying photos of children without legally appropriate consent; default to food/volunteer photos.
6. Set the operating timezone and organization-verification process. The app enforces same-day pickup deadlines, not food temperature, transport conditions or actual same-day consumption. Operators must approve food-safety procedures before real distribution.
7. Perform deployment-specific penetration testing, accessibility review and load testing. No blanket production-security certification is claimed.

## Scope boundaries

The five-feature extension implements profile edits/re-review, administrator incident cases, personal export and administrator-fulfilled deletion requests, photo-consent withdrawal, radius matching and opt-in email/browser-push delivery. Read FEATURE_OPERATIONS.md for operating instructions and retention boundaries. There is no chat, likes/comments, address geocoding, road-distance routing, document-verification integration, automated food-quality certification, SMS delivery or multi-host media storage. The old hosted database is not copied to PostgreSQL automatically.

The Word operations guide predates this extension. Its registration and core donation workflows still apply; FEATURE_OPERATIONS.md supersedes its feature-boundary and notification sections. Do not describe the package as launch-certified: deployment credentials, live OAuth/push tests, accessibility/load/security review and operational sign-off remain necessary.
