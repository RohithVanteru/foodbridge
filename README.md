# FoodBridge — standalone full-stack application

React 19 + Next.js 16 (Node.js backend), Better Auth, PostgreSQL 17 and Drizzle ORM. No ChatGPT login, Sites runtime, Cloudflare account, or external app-building service is required.

## Implemented

- Email/password registration, mandatory email verification, login, password reset, session revocation and logout.
- Optional direct Google OAuth through Better Auth.
- Supplier, beneficiary and volunteer onboarding; administrator verification and rejection.
- Same-day donation creation with dietary notes, safety attestation, radius/city matching and capacity checks.
- Transactional reservation: exactly one beneficiary can claim a donation.
- Private pickup addresses and participant contacts; collection/cancellation; deadline expiry job.
- In-app notifications for matching food, reservations, status changes and account reviews.
- Community stories and photo uploads; consent attestation, image re-encoding and administrator moderation.
- Volunteer organization referrals with administrator follow-up status.
- Separate protected admin overview, users, donations, pickups, community/referrals, audit and system pages. Admin lists are paginated.
- PostgreSQL migrations, health endpoint, automated tests, CI and Docker deployment.

The five-feature extension adds profile management with re-review, incident reports, personal-data export/deletion requests/photo-consent withdrawal, coordinate-based radius matching, and opt-in email/browser push with retry monitoring. Photos are visible only to signed-in users after moderation (owners/admins can review pending photos). See [the feature operations addendum](docs/FEATURE_OPERATIONS.md) for the current workflows and limitations; it supersedes older scope statements in the Word guide.

## Deploy on a server with Docker

1. Install Docker Engine with Compose. Copy `.env.example` to `.env`.
2. Set all database, authentication and SMTP values. Use independently generated random secrets (for example `openssl rand -hex 32`). URL-encode special characters in the database password inside DATABASE_URL.
3. Set BETTER_AUTH_URL to your exact public HTTPS origin, without a trailing slash. Set FOODBRIDGE_ADMIN_EMAILS to the owner’s email **before their first onboarding**.
4. Run:

```sh
docker compose up -d --build
docker compose logs -f migrate app
```

Compose runs migrations after PostgreSQL becomes healthy, then starts the app on **127.0.0.1:3000**. Put a TLS reverse proxy such as Caddy/nginx in front of it. Forward the public Host and protocol headers. Do not expose PostgreSQL publicly. Allow request bodies up to 6 MB and enforce API rate limits at the proxy, especially uploads and content creation.

The database is hosted **on your own Docker server**, in the `postgres_data` volume. It is not hosted by this repository. For managed PostgreSQL, replace DATABASE_URL with the provider’s TLS connection string and adapt Compose to omit its local db dependency. Do not disable certificate verification.

Uploads live in the persistent `uploads` volume. This deployment supports one app host. Multiple app replicas require shared/object storage before scaling.

### Google sign-in

Create a Google OAuth web client in your own Google Cloud project. Add your public origin and this exact authorized redirect URI:

```text
https://YOUR-DOMAIN/api/auth/callback/google
```

Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET and restart the app. Without both values, the Google button is hidden. Configure the OAuth consent screen and production publishing in Google Cloud. Do not send client secrets through chat.

### First administrator

Register using an allowlisted email, verify the email, and complete onboarding. The server grants verified admin access only to this configured identity. The admin console is at `/admin`. Ordinary users cannot submit an admin flag. Removing an email from the allowlist revokes admin access after a restart. Existing non-admin profiles are not automatically elevated by changing the allowlist; an operator must deliberately update the database grant.

### Expiry schedule

Configure your hosting scheduler to POST to `/api/jobs/expire` every minute with `Authorization: Bearer YOUR_CRON_SECRET`. This retires up to 500 overdue listings per run and synchronizes their claims. Expired listings cannot be newly claimed even if the scheduler is delayed.

Also schedule `/api/jobs/notifications` every minute using the same authorization header. This creates pickup reminders, fans out up to 100 notifications and attempts up to 20 deliveries per run. Allow a five-minute request duration on the scheduler/server. Monitor throughput and backlog before increasing traffic; the database leases permit overlapping workers. Email uses the existing SMTP configuration. Generate browser-push keys with `npx web-push generate-vapid-keys`, set VAPID_SUBJECT, VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, and keep the private key in secret storage. Browser registration is explicit in `/settings`; channels default off.

Schedule `/api/jobs/media-cleanup` daily with the same header. It permanently removes up to 500 unreferenced UUID-named WebP upload files older than 24 hours. Consent withdrawal and deletion immediately remove database access; this job cleans up the corresponding files later. Backups and previously downloaded copies are outside this cleanup.

### Backups and operations

- Schedule encrypted PostgreSQL backups and upload-volume backups off-host. Test restoring both before launch.
- Monitor `GET /api/health`, process errors, disk usage, mail delivery and failed expiry jobs.
- Use provider-managed secret storage and restrict operator access. Never commit `.env`.
- Run migrations before each release. Back up before schema changes; rollback requires a compatible app build and, when necessary, database restore.
- Do not run `docker compose down -v` on production: it deletes persistent volumes.
- Pin reviewed container digests and regularly review dependency advisories.

## Local development

Node.js 22.13+ and PostgreSQL are required. Configure `.env` with a localhost DATABASE_URL, BETTER_AUTH_URL=http://localhost:3000 and UPLOAD_DIR=./data/uploads. Use a local SMTP catcher or your SMTP service.

```sh
npm ci
npm run db:migrate
npm run dev
```

`npm run build` produces the standard Next.js standalone bundle. Docker packages static assets with it. For non-Docker hosting, use a Next.js-compatible Node deployment, a PostgreSQL database, persistent upload storage and the same runtime environment variables.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Database integration tests run only when TEST_DATABASE=1 and DATABASE_URL points to a disposable, migrated PostgreSQL database. They insert test records and must never run against production. HTTP auth tests run only when TEST_APP_URL is supplied, against a disposable app configured with a Mailpit inbox at TEST_MAIL_URL (default http://localhost:58025). CI runs PostgreSQL integration tests; the HTTP suite is opt-in. The full workflows test additionally requires TEST_WORKFLOWS=1 and a test-only admin@test.invalid account with the fixture password in that test file, allowlisted before onboarding. These credentials are not seeded or enabled in the application.

## Launch review

The included [operations guide](docs/FoodBridge%20Operations%20Guide.docx) covers registration, all user roles, administrator monitoring, daily procedures and launch acceptance checks.

See [docs/PRODUCTION_REVIEW.md](docs/PRODUCTION_REVIEW.md). The application is deployable, but deployment configuration and operational sign-off are still required. A successful build is not a security audit or food-safety certification.

Legacy `.openai/hosting.json`, `drizzle/` SQLite migrations and the product-plan document describe the previous hosted prototype. They are not used by this standalone app. The active PostgreSQL migrations are in `migrations/`. Existing hosted data is not automatically migrated and the prior hosted site has not been changed.
