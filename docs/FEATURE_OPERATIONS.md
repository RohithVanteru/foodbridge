# FoodBridge: five-feature operations addendum

This addendum describes the standalone source in this release. It supplements the Word operations guide and replaces that guide’s statements that profile editing, radius matching, incidents, privacy controls and push are future work. It does not describe changes to the old hosted prototype.

## Registration and daily user flow

1. Register with email/password, verify the email link and log in, or use Google when the deployment has its own OAuth credentials.
2. Complete supplier, beneficiary or volunteer onboarding. Only the configured owner receives initial administrator access; other accounts wait for review.
3. An administrator checks the organization and approves it under **Organization review**. Rejected users can correct their details in **Account → Profile & notifications**.
4. Suppliers list safe surplus food for pickup later the same service day. Beneficiaries see matching food within their capacity and reserve a complete listing. Pickup remains the beneficiary’s responsibility.
5. Participants use **My pickups** for private contact details, collection or cancellation. Volunteers submit organization referrals and may publish moderated community updates.

## 1. Profile management

Open `/settings` from Account. Display name, organization, phone, city, address, capacity, optional latitude/longitude, matching radius and notification preferences are editable. Roles, email identities and admin grants cannot be changed through this form.

Changing organization/contact/capacity/coordinates returns the account to pending review. Finish or cancel active donations and pickups before such changes. Profile changes carry a revision: if another tab saves first, refresh before retrying. Display name, radius and notification preferences do not require review. Administrator organization edits are deliberately not self-service; an operator must review and coordinate them separately.

Admins use `/admin/organization-review` to see the actual contact, address, capacity and coordinates before approving. Verification is an operational check, not automated certification.

## 2. Incident reporting

Open `/incidents` to report food safety, missed pickup, misconduct or another concern. Include the donation number in the description when relevant. Avoid sensitive resident/child information. Users see only their own reports and the public response.

Admins use `/admin/incidents`: read the report, change it to investigating, record private notes, contact the parties through established support procedures and provide a resolution before marking it resolved. Private notes never appear in the reporter API or personal export. Revision checks prevent overwriting another administrator’s update. Status changes create a notification and audit event. This is not an emergency service; assign a human monitoring schedule and emergency escalation contact before launch.

## 3. Privacy and account deletion

At `/privacy`, a user can download their profile, settings, donation records, claims, posts, notifications, referrals and reports as JSON. This export excludes authentication secrets, sessions, OAuth tokens and private admin notes. Photo references are included; users can view their current photos while signed in.

Withdrawing photo consent removes access immediately and strips the photo from posts, returning those posts to moderation. A withdrawn photo cannot be reused in a new post. The authenticated cleanup job permanently removes its unreferenced storage file once older than 24 hours; restored backups need the same cleanup policy. Previously downloaded copies cannot be recalled.

Users request deletion by typing `DELETE MY ACCOUNT`. Finish/cancel active pickups first. Pending deletion blocks new donations, claims, content, subscriptions and profile edits. The user may cancel the pending request. Administrators cannot delete their own admin account through this workflow.

At `/admin/operations`, an administrator checks the request and resolves the user’s open incident cases. Completion requires typing `ANONYMIZE AND DELETE LOGIN`. It removes the authentication user and cascading sessions/accounts, erases preferences/subscriptions/referrals/notifications, removes media access, and scrubs identifying fields in the profile, donated-food records and community posts. Completed incident descriptions/notes are also removed.

Donation counts/statuses, claims, opaque account IDs and audit history remain for operational integrity. This is anonymization of application records, not a promise that every trace vanishes: email provider records, infrastructure logs, backups, other people’s free-text reports and external copies require an operator retention process. Document your retention periods and review exports/erasure procedures before launch. Restoration must replay deletion decisions before reopening access.

## 4. Radius matching

Enter the organization’s coordinates in settings and select 1–200 km. Coordinates require review; the app does not geocode addresses or request device GPS. When a supplier’s pickup address exactly matches its registered address, its reviewed coordinates are attached to the donation. A different pickup address has no coordinates and uses same-city fallback.

When both parties have coordinates, matching uses straight-line Haversine distance and the beneficiary’s radius. If either is missing, normalized city is used. This rule applies to listings, acceptance and matching notifications. Feed cards show rounded distance or an explicit fallback label, never raw pickup coordinates. Distances are not road routes or a transport feasibility guarantee.

## 5. Notification operations

In-app notices always remain available. Email and browser push are opt-in at `/settings`. Register each browser explicitly, grant its permission, enable push and save. Unsubscribe the browser before sharing it with another account. Supported push destinations are restricted to known browser provider domains; arbitrary URLs are rejected.

Configure SMTP and the three VAPID variables in `.env.example`. Preserve the VAPID key pair across releases. Generate keys using the installed web-push CLI; never commit the private key. See the upstream [web-push documentation](https://github.com/web-push-libs/web-push) for key generation and supported provider behavior.

Schedule authenticated POST requests:

| Endpoint | Schedule | Purpose |
| --- | --- | --- |
| `/api/jobs/expire` | Every minute | Expire overdue food and synchronize claims |
| `/api/jobs/notifications` | Every minute | Generate 30-minute pickup reminders, queue channel deliveries, retry failures |
| `/api/jobs/media-cleanup` | Daily | Remove unreferenced upload files older than 24 hours |

Each requires `Authorization: Bearer <CRON_SECRET>` with a secret of at least 32 characters. Never expose the secret in browser code. A notification run queues up to 100 notices and processes 20 deliveries; monitor throughput/backlog for your traffic. Run expiry before notifications where practical. Reminder content tells users to check the current pickup status; an already queued notice can outlive a cancellation.

Delivery workers lease records for five minutes and fence completion with a unique token. Provider failures retry with exponential delay, up to five attempts. A crashed worker’s lease can be reclaimed. Delivery is at-least-once: if the provider accepted a message just before a crash, retry may duplicate it. “Sent” means provider acceptance, not inbox delivery or reading. Messages contain a generic sign-in link, not private pickup information. Preferences are checked again before sending, but a message already handed to a provider cannot be recalled. Notices older than 24 hours are not delivered externally.

At `/admin/operations`, review failures and attempt counts, check SMTP/VAPID configuration and provider health, then retry failed deliveries. Expired push subscriptions are removed automatically. No SMS integration is included.

## Release acceptance

- Apply both PostgreSQL migrations before starting the new code; preserve database and upload backups.
- Run `npm run lint`, `npm run typecheck`, `npm run build` and `node --import tsx --test tests/*.test.ts`.
- Set TEST_DATABASE=1 only against a disposable migrated database for transactional tests.
- Run the HTTP suites with TEST_APP_URL, TEST_WORKFLOWS=1 and a test-only allowlisted admin fixture. Setting CRON_SECRET additionally exercises email delivery through the worker.
- On the real HTTPS deployment, test Google sign-in, email delivery, browser push opt-in/opt-out, scheduled jobs, photo withdrawal and a complete disposable-account deletion.
- Confirm privacy/support wording, food-safety procedures, backup restoration, rate limiting, accessibility and incident staffing before public launch.

Successful local checks do not replace deployment-specific security, load or food-safety review.
