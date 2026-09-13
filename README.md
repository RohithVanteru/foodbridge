# SharePlate

SharePlate is a full-stack prototype for coordinating same-day surplus-food donations between food suppliers, old-age homes, orphanages, and volunteers.

## What works

- Responsive role-aware dashboard
- Protected Sign in with ChatGPT sessions and server-side identity checks
- Guided onboarding for suppliers, beneficiaries, and volunteers
- First-owner administrator bootstrap and protected admin console
- Organization verification and donation status administration
- Nearby donation search
- Supplier donation form with required same-day safety confirmation
- Beneficiary acceptance flow
- Durable D1 schema and authenticated donation/claim API routes
- Community impact feed concept
- Custom brand theme and favicon

The interface includes representative starter records when the database is empty so the workflow is immediately testable.

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
npm run dev
```

Open `http://localhost:5173`. Local sign-in helpers are provided by the starter runtime.

## Important next work before real-world use

This is a pilot implementation, not a production food-safety certification system. Before onboarding real organizations, complete notification delivery, document-based verification, consent/privacy controls, incident escalation, and a local legal and food-safety review.
