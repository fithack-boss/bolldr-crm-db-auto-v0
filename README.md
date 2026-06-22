# Bolldr CRM

A self-hosted, HubSpot-style sales CRM for the Bolldr team. Built entirely with
free, open-source tools and designed to deploy on **Vercel** alongside
`bolldr.com`.

- 🔐 **Username / password login** with role-based access (Admin vs. Sales Rep)
- 👥 **Master contacts table** — the single source of truth for every lead,
  with **industry** and **interests** segmentation (the Bolldr CRM verticals
  and services from Notion)
- 🎯 **Per-rep assignment** — each sales rep only sees the contacts the admin
  assigns to them
- 🗣️ **Interaction tracking** — every call, email, meeting, WhatsApp or note is
  logged on a contact timeline (with optional stage changes)
- 📈 **Pipeline stages** — New → Contacted → Qualified → Meeting → Proposal →
  Negotiation → Won / Lost
- ⬆️ **CSV & Excel import** — admins upload a spreadsheet; columns are
  auto-mapped and appended to the master table (with optional de-duplication)
- 📊 **Dashboards** — each rep sees their contacts by stage, calls made, hours
  worked and deals won; admins get a team-wide view and a rep leaderboard
- 📝 **Standardized daily log** — reps submit an end-of-day report (hours, calls,
  meetings, deals) that feeds the dashboards

## Tech stack (all free & open source)

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Framework      | Next.js 14 (App Router) + React 18       |
| Language       | TypeScript                               |
| Styling        | Tailwind CSS                             |
| Auth           | Auth.js (NextAuth v4), email + password (JWT) |
| Database       | Supabase (Postgres) via Prisma ORM       |
| Charts         | Recharts                                 |
| Spreadsheets   | SheetJS (`xlsx`) + PapaParse             |
| Hosting        | Vercel (dedicated subdomain, e.g. crm.bolldr.com) |

The database is **Supabase** — a free, open-source hosted Postgres. (Supabase
*is* Postgres, so there's nothing extra to install; you just paste its
connection strings into the env vars.) Any other Postgres works too, but the
guide below uses Supabase end to end.

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   edit .env and set DATABASE_URL + DIRECT_URL (from Supabase) and
#   NEXTAUTH_SECRET (generate: openssl rand -base64 32)

# 3. Create the database schema
npm run db:push

# 4. Seed the first admin + demo data
npm run db:seed

# 5. Run
npm run dev    # http://localhost:3000
```

Default seeded logins — **sign in with the email** (change these via `.env`
before seeding in production):

| Role  | Email              | Password       |
| ----- | ------------------ | -------------- |
| Admin | `admin@bolldr.com` | `ChangeMe!123` |
| Sales | `sara@bolldr.com`  | `password123`  |
| Sales | `omar@bolldr.com`  | `password123`  |

---

## Deploying to a dedicated URL (crm.bolldr.com) with Supabase

Because `bolldr.com` already runs your marketing site, the CRM is deployed as a
**separate Vercel project on its own subdomain** — `crm.bolldr.com` — so it
doesn't touch your existing site. Your sales team just goes to that URL and signs
in with their email + password.

### 1. Create the Supabase database (free)
1. Sign up at [supabase.com](https://supabase.com) → **New project**. Pick a
   region close to your team and set a database password (save it).
2. Once it's ready: **Project Settings → Database → Connection string**. Copy two
   strings and add your password to each:
   - **Transaction pooler** (port `6543`) → this is your `DATABASE_URL`
     (append `?pgbouncer=true&sslmode=require`).
   - **Session / direct** (port `5432`) → this is your `DIRECT_URL`
     (append `?sslmode=require`).

### 2. Import the repo into Vercel
**Add New… → Project** → pick this repo. Vercel auto-detects Next.js — no build
config needed (the `build` script runs `prisma db push`, creating the schema on
first deploy).

### 3. Add environment variables (Project → Settings → Environment Variables)

| Name                  | Value                                                     |
| --------------------- | --------------------------------------------------------- |
| `DATABASE_URL`        | Supabase **transaction pooler** string (port 6543)        |
| `DIRECT_URL`          | Supabase **direct** string (port 5432)                    |
| `NEXTAUTH_SECRET`     | `openssl rand -base64 32`                                  |
| `NEXTAUTH_URL`        | `https://crm.bolldr.com`                                   |
| `SEED_ADMIN_EMAIL`    | your admin email (used to log in)                         |
| `SEED_ADMIN_PASSWORD` | a strong password                                         |
| `SEED_ADMIN_NAME`     | your name                                                  |

### 4. Deploy, then create the admin account
Click **Deploy**. After it succeeds, seed the first admin once from your machine
(pointing at the prod DB):

```bash
DIRECT_URL="<your-direct-url>" DATABASE_URL="<your-pooled-url>" \
  SEED_ADMIN_EMAIL="you@bolldr.com" SEED_ADMIN_PASSWORD="<strong-pass>" \
  SEED_ADMIN_NAME="Your Name" npm run db:seed
```

From then on, **add the rest of your sales team from the in-app Team page** — no
command line needed. Each person logs in with the email + password you set.

### 5. Point crm.bolldr.com at the app
1. In the CRM's Vercel project → **Settings → Domains → Add** → `crm.bolldr.com`.
2. Vercel shows a DNS record (a `CNAME` for `crm` → `cname.vercel-dns.com`). Add
   it wherever `bolldr.com`'s DNS is managed (e.g. your registrar / Cloudflare).
3. Once DNS propagates, `https://crm.bolldr.com` serves the CRM with an automatic
   SSL certificate. Make sure `NEXTAUTH_URL` matches exactly.

### Linking it from your main site
Add a normal link/button on `bolldr.com` (e.g. a “Team Login” item) pointing to
`https://crm.bolldr.com`. Because it's a separate subdomain, the two sites stay
fully independent and nothing on your marketing site changes.

> Prefer it under a path like `bolldr.com/crm` instead of a subdomain? That's
> possible too (Next.js `basePath` + a rewrite from the main site), but a
> subdomain is simpler, isolates the apps, and works best with the auth cookies —
> so it's the recommended setup.

---

## How it works

### Roles & access
- **Admin**: full access — manage users, import data, assign contacts, see
  team-wide analytics.
- **Sales Rep**: sees only contacts assigned to them, logs interactions, submits
  daily logs, and sees their own dashboard. All access is enforced server-side
  in every action and query.

### Importing spreadsheets
Go to **Import Data** (admin only), choose a `.csv`, `.xls` or `.xlsx` file. The
first row must be column headers. Headers are normalized (accent-insensitive) and
mapped to fields. Both **English and Spanish headers** are recognized, so an
export of the Bolldr CRM in Notion imports cleanly:

| Spreadsheet column (ES / EN)                   | Maps to                     |
| ---------------------------------------------- | --------------------------- |
| Nombre del Cliente / Cliente / Company         | Company (+ display name)    |
| Industria / Industry / Sector                  | Industry                    |
| Estado de Llamada / Stage / Status             | Stage                       |
| Teléfono / Phone · Celular                      | Phone                       |
| WhatsApp                                        | WhatsApp                    |
| Página Web / Website / URL                      | Website                     |
| Intereses / Interests (comma-separated)        | Interests                   |
| Notas de Llamada / Notes                        | Notes                       |
| Ciudad / City · País / Country · Valor / Value  | City / Country / Deal value |

`Estado de Llamada` values (`Sin Llamar`, `Contactado ✅`, `No Contestó /
Devolución ❌`) are translated to pipeline stages automatically. CSVs are decoded
as UTF-8 so Spanish accents are preserved. Any unrecognized columns (e.g.
`Resumen del Perfil`, `Responsable`) are preserved on each contact under
"Imported fields" so nothing is lost. You can assign all imported rows to a rep
and optionally update existing contacts matched by email or phone. A ready-made
`sample-contacts.csv` (in the Bolldr column format) is included to try it out.

### Dashboards & daily logs
Dashboards aggregate two sources:
1. **The master CRM** — contacts by stage, deal values, and logged interactions
   (calls, meetings) in real time.
2. **Daily logs** — the standardized end-of-day form each rep submits (hours
   worked, calls made, meetings, deals won).

This gives both an objective activity trail and a self-reported summary.

---

## Security note

The `xlsx` (SheetJS) package distributed on npm carries published advisories. For
an internal tool with trusted admin uploads this is acceptable; for higher
assurance, install SheetJS from the official source per
<https://docs.sheetjs.com/docs/getting-started/installation/nodejs/>. Always
change the seeded passwords before going live.
