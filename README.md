# FoodBridge

FoodBridge is a full-stack prototype for coordinating same-day surplus-food donations between food suppliers, old-age homes, orphanages, and volunteers.

## What works

- Responsive role-aware dashboard
- Landing, login, signup, onboarding, sign-out, and protected account flows
- Platform-managed authentication with Google-linked ChatGPT accounts
- Signed-in login redirects, verification-state gating, and a dedicated account-status screen
- Guided onboarding for suppliers, beneficiaries, and volunteers
- Environment allowlisted administrators revalidated on every admin request
- Separate admin monitoring pages for users, donations, pickups, audit history, and system health
- Organization verification and donation status administration
- Nearby donation search
- Supplier donation form with required same-day safety confirmation
- Beneficiary acceptance flow
- Durable D1 schema, authenticated donation/claim APIs, pickup history, and an operations audit log
- Community impact feed placeholder without fabricated activity
- Custom brand theme and favicon

## Stack

- Next.js 16, React 19, TypeScript
- Vinext/Vite on Cloudflare Workers
- Cloudflare D1 and Drizzle ORM
- Tailwind CSS and accessible local UI primitives

See [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) for the product roadmap, safety requirements, production architecture, data model, and pilot metrics.

## Local development

```bash
npm install
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_last_chat.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_regular_slapstick.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_black_franklin_storm.sql
npm run dev
```

Apply every migration in `drizzle/` in filename order, then open `http://localhost:5173`. Local sign-in helpers are provided by the starter runtime. In production, configure `FOODBRIDGE_ADMIN_EMAILS` as a comma-separated allowlist through the hosting environment settings.

## Authentication model

The deployed Site uses platform-managed Sign in with ChatGPT. FoodBridge never receives or stores a password. People can use a Google-linked ChatGPT account, while backend routes authorize every request from trusted platform identity headers plus the role and verification state stored in D1.

## Important next work before real-world use

This is a production-hardened pilot, not a food-safety certification system. Before onboarding real organizations, complete notification delivery, document-based verification, consent/privacy controls, incident escalation, automated backups/restore testing, monitoring, and a local legal and food-safety review.
