# Bolldr CRM

A self-hosted, HubSpot-style sales CRM for the Bolldr team. Built entirely with
free, open-source tools and designed to deploy on **Vercel** alongside
`bolldr.com`.

- 🔐 **Username / password login** with role-based access (Admin vs. Sales Rep)
- 👥 **Master contacts table** — the single source of truth for every lead
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
| Auth           | Auth.js (NextAuth v4), credentials + JWT |
| Database       | PostgreSQL via Prisma ORM                |
| Charts         | Recharts                                 |
| Spreadsheets   | SheetJS (`xlsx`) + PapaParse             |
| Hosting        | Vercel                                   |

The database is **not** bundled — pick any free Postgres provider:
[Neon](https://neon.tech) (recommended), [Supabase](https://supabase.com), or
**Vercel Postgres** (provisioned from the Vercel dashboard).

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   edit .env and set DATABASE_URL + NEXTAUTH_SECRET (generate: openssl rand -base64 32)

# 3. Create the database schema
npm run db:push

# 4. Seed the first admin + demo data
npm run db:seed

# 5. Run
npm run dev    # http://localhost:3000
```

Default seeded logins (change these via `.env` before seeding in production):

| Role  | Username | Password       |
| ----- | -------- | -------------- |
| Admin | `admin`  | `ChangeMe!123` |
| Sales | `sara`   | `password123`  |
| Sales | `omar`   | `password123`  |

---

## Deploying to Vercel (bolldr.com)

1. **Push this repo to GitHub** (already on the `claude/crm-database-webapp-pu6qa3`
   branch).

2. **Create a free Postgres database**
   - Easiest: in the Vercel dashboard → *Storage* → *Create Database* → *Postgres*.
   - Or create one at Neon / Supabase and copy the **pooled** connection string.

3. **Import the project into Vercel** → *Add New… → Project* → pick this repo.

4. **Add environment variables** (Project → Settings → Environment Variables):

   | Name                | Value                                            |
   | ------------------- | ------------------------------------------------ |
   | `DATABASE_URL`      | your Postgres pooled connection string           |
   | `NEXTAUTH_SECRET`   | `openssl rand -base64 32`                         |
   | `NEXTAUTH_URL`      | `https://bolldr.com` (your production URL)        |
   | `SEED_ADMIN_EMAIL`  | your admin email                                  |
   | `SEED_ADMIN_USERNAME` | your admin username                             |
   | `SEED_ADMIN_PASSWORD` | a strong password                               |
   | `SEED_ADMIN_NAME`   | your name                                          |

   (If you use Vercel Postgres, `DATABASE_URL` is added automatically.)

5. **Deploy.** The `build` script runs `prisma db push` automatically, so the
   schema is created on first deploy. No migration step needed.

6. **Seed the admin account** once (from your machine, pointing at the prod DB):

   ```bash
   DATABASE_URL="<prod-url>" npm run db:seed
   ```

   Or just create the admin through any one-off run — after that, manage all
   users from the in-app **Team** page.

### Pointing bolldr.com at this app

In Vercel → Project → *Settings → Domains*, add `bolldr.com` (and/or
`crm.bolldr.com`). Update the domain's DNS to the records Vercel shows. If
`bolldr.com` already hosts a marketing site, deploy the CRM to a subdomain like
`crm.bolldr.com` instead and set `NEXTAUTH_URL` accordingly.

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
first row must be column headers. Headers are normalized and mapped to fields
(`name`/`full name`, `email`, `phone`, `company`, `job title`, `stage`,
`value`/`amount`, `city`, `country`, `notes`, …). Any unrecognized columns are
preserved on each contact under "Imported fields" so nothing is lost. You can
assign all imported rows to a rep and optionally update existing contacts matched
by email or phone. A ready-made `sample-contacts.csv` is included to try it out.

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
