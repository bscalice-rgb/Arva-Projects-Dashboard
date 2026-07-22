# Arva Scope-3 Projects Dashboard

An interactive web app for managing Arva Intelligence's Scope-3 regenerative-agriculture
carbon programs — Channel Partners, growers, the enrollment/execution pipeline, supply-shed
allocations, revenue share and program outcomes — replacing the season spreadsheet.

Built to mirror the **CropForce hierarchy** and to **reuse growers/CPs across program years**:

```
Org Node (Channel Partner OR direct grower)
  └── Client (grower)  ──  Legal Entity (must match the W-8)
        └── ClientSeason (per program year: pipeline + outcomes + W-8/contract/bank)
```

Stable **identity** (Org Node, Client, Legal Entity, CP, Mill) is separated from
per-**season** data so you can carry a grower or CP forward from one year to the next.

## Features

- **Channel Partners** — CRUD, filters, per-season compliance, and flexible **revenue
  share** (one or more CP/Referrer payees, percentage or fixed amount). A CP is its own
  Org Node automatically; growers can be added straight from the CP.
- **Growers (Clients)** — enrolled under a Channel Partner or as a direct grower (the Org
  Node is managed automatically — never created by hand). Per-season table with rich
  filters, **inline pipeline editing**, sortable columns and CSV export; a per-grower detail
  view with the ordered pipeline stepper (current stage highlighted), linked acres⇄hectares
  inputs, and grouped editors for pipeline + outcomes.
- **Supply Sheds** — per-season targets by CP × crop × country × region; **loaded volume
  auto-rolls up** from delivered client area, balance can go negative (over-delivery).
- **Seasons & carry-forward** — create program years and carry selected growers/CPs into a
  new season (stable identity pre-filled, **only the W-8 carries over**, everything else
  resets; a reference to last year's record is retained).
- **Dashboard** — pipeline funnel/bottleneck, needs-attention, volume roll-ups by
  CP/country/crop, financials, and a compliance snapshot; all filterable by
  season/country/crop/CP.

> Deadline tracking is **V2** and intentionally not built. The pipeline `stageIndex` hook is
> already in place for it (see `src/lib/pipeline.ts`).

## Tech stack

- **Next.js (App Router) + TypeScript** (strict)
- **Tailwind CSS** + shadcn/ui-style components (Radix primitives)
- **PostgreSQL (Neon)** + **Prisma** ORM
- **Auth.js (NextAuth v5)** single-admin credentials login (ownership seam kept for future
  multi-user)
- **Recharts** for charts; deployed on **Vercel**

Currency is **USD only**. There is **no spreadsheet import** — data is entered in the app.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in the values (see [Environment variables](#environment-variables)). For local dev
   you need a Postgres database — a local Postgres or a free Neon dev branch both work. Put
   its connection string in `DATABASE_URL`.

3. **Create the schema**

   Using migrations (recommended):

   ```bash
   npx prisma migrate deploy      # applies prisma/migrations to your database
   ```

   Or, for quick local iteration without migration files:

   ```bash
   npm run db:push
   ```

4. **Seed sample data (optional, idempotent)**

   Creates the admin user, the active **2026** season, and a few sample records:

   ```bash
   npm run db:seed
   ```

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string used for queries and migrations. On Vercel, the Neon integration injects this automatically. |
| `AUTH_SECRET` | yes | Session/JWT secret for Auth.js. Generate with `openssl rand -base64 32`. |
| `ADMIN_EMAIL` | yes | The single admin login email. |
| `ADMIN_PASSWORD` | yes* | Admin password (plain comparison). *Not needed if `ADMIN_PASSWORD_HASH` is set. |
| `ADMIN_PASSWORD_HASH` | optional | bcrypt hash of the admin password (takes precedence over `ADMIN_PASSWORD`). Generate: `node -e "console.log(require('bcryptjs').hashSync('yourpassword',10))"`. |
| `ADMIN_USER_ID` | optional | Stable owner id assigned to records (ownership seam). Defaults to `admin`. |

## Database & migrations

- The schema lives in `prisma/schema.prisma`; an initial migration is in
  `prisma/migrations/0_init`.
- Apply migrations: `npx prisma migrate deploy`.
- Create a new migration after schema changes (needs a dev DB): `npm run db:migrate`.
- Inspect data: `npx prisma studio`.

## Deploy to Vercel

1. Push this repo to GitHub and **Import** it into Vercel.
2. Add the **Neon** database (Vercel → Storage → Create → Neon Postgres). The integration
   provisions the database and injects `DATABASE_URL` automatically.
3. Set the remaining env vars in **Project Settings → Environment Variables**:
   `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`).
4. Deploy. The default build command (`prisma generate && prisma migrate deploy &&
   next build`) creates the database tables automatically on each deploy — no build-command
   override needed. (If the very first deploy ran before the database was attached, just
   click **Redeploy** once the env vars are in place.)
5. After the first successful deploy, optionally run the seed once against the production
   database from your machine:

   ```bash
   DATABASE_URL="<prod-url>" npm run db:seed
   ```

   Or just create your first season in the app (**Seasons → New season**) and start entering data.

## Project structure

```
prisma/
  schema.prisma          # identity vs season split, enums, relations
  migrations/            # SQL migrations (0_init)
  seed.ts                # idempotent sample data + 2026 season
src/
  auth.ts, auth.config.ts, middleware.ts   # Auth.js v5 (edge-safe split)
  lib/
    prisma.ts            # Prisma client singleton
    enums.ts             # human labels + select options for every enum
    pipeline.ts          # ordered execution pipeline + stage computation
    revenue-share.ts     # payee payout logic
    rollups.ts           # volume aggregation by Channel Partner
    supply-shed.ts       # loaded/balance auto-roll-up
    validation.ts        # Zod schemas for all mutations
    csv.ts, utils.ts, season.ts
  components/            # UI kit + shared display components
  app/
    login/               # sign-in
    (app)/               # authenticated shell + all modules
      page.tsx           # dashboard
      clients/ channel-partners/ mills/ supply-sheds/ seasons/
  lib/org-node.ts          # automatic Org Node management (CP = node; direct = own node)
```

## Notes

- **Pipeline order** is defined once in `src/lib/pipeline.ts`; edit it there and the table,
  detail stepper and dashboard funnel all follow.
- **Enum labels** are centralized in `src/lib/enums.ts`.
- All mutations are server actions validated with Zod; areas are tracked in both
  hectares and acres, and delivered area feeds the supply-shed roll-up.
