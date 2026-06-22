# Serving the CRM at `bolldr.com/login` (Multi-Zones)

This integrates the CRM into your existing **bolldr.com** site **without merging
codebases**. The CRM stays its own Vercel app; `bolldr.com` simply *routes* the
CRM's paths to it. Your team uses `https://bolldr.com/login` to register / sign
in, and everything (dashboard, contacts, daily log, admin) lives under
`bolldr.com`.

```
                      bolldr.com (marketing site, existing repo)
                      ├── /                → marketing site
                      ├── /login           ─┐
                      ├── /register         │  rewritten to the CRM app
                      ├── /dashboard        │  (this repo, deployed separately)
                      ├── /contacts         │
                      ├── /daily-log        │
                      ├── /admin/*          │
                      ├── /api/auth/*       │
                      └── /api/admin/*     ─┘
                                 │
                                 ▼
                      crm.bolldr.com  (the CRM Vercel deployment)
                      └── serves /_next/* assets (via ASSET_PREFIX)
```

## Step 1 — Deploy the CRM (this repo)
Deploy this repo as its own Vercel project (see `README.md`) with a Supabase DB.
Give it a domain you control, e.g. **`crm.bolldr.com`**, and set env vars:

| Var               | Value                                            |
| ----------------- | ------------------------------------------------ |
| `DATABASE_URL`    | Supabase pooled connection string (port 6543)    |
| `DIRECT_URL`      | Supabase direct connection string (port 5432)    |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32`                          |
| `NEXTAUTH_URL`    | **`https://bolldr.com`** (the URL users actually see) |
| `ASSET_PREFIX`    | **`https://crm.bolldr.com`** (the CRM's own origin) |
| `ADMIN_EMAIL`     | `jadabboud@bolldr.com`                            |
| `ALLOWED_SIGNUP_DOMAINS` | `bolldr.com,fithack.ae`                    |

`NEXTAUTH_URL` is the public host the browser sees (bolldr.com) so auth callbacks
and cookies are correct. `ASSET_PREFIX` is the CRM's own origin so its JS/CSS
load directly from crm.bolldr.com and never clash with the marketing site.

## Step 2 — Add the rewrites in the `bolldr-website` repo

### If bolldr-website is a **Next.js** app — `next.config.js`
```js
const CRM = "https://crm.bolldr.com"; // the CRM deployment origin

const crmPaths = [
  "/login", "/register", "/dashboard", "/daily-log",
  "/contacts", "/contacts/:path*",
  "/admin", "/admin/:path*",
  "/api/auth/:path*", "/api/admin/:path*",
];

module.exports = {
  async rewrites() {
    return crmPaths.map((source) => ({
      source,
      destination: `${CRM}${source}`,
    }));
  },
};
```

### If bolldr-website is **any other framework** (Vite/Astro/static) — `vercel.json`
```json
{
  "rewrites": [
    { "source": "/login",            "destination": "https://crm.bolldr.com/login" },
    { "source": "/register",         "destination": "https://crm.bolldr.com/register" },
    { "source": "/dashboard",        "destination": "https://crm.bolldr.com/dashboard" },
    { "source": "/daily-log",        "destination": "https://crm.bolldr.com/daily-log" },
    { "source": "/contacts/:path*",  "destination": "https://crm.bolldr.com/contacts/:path*" },
    { "source": "/contacts",         "destination": "https://crm.bolldr.com/contacts" },
    { "source": "/admin/:path*",     "destination": "https://crm.bolldr.com/admin/:path*" },
    { "source": "/admin",            "destination": "https://crm.bolldr.com/admin" },
    { "source": "/api/auth/:path*",  "destination": "https://crm.bolldr.com/api/auth/:path*" },
    { "source": "/api/admin/:path*", "destination": "https://crm.bolldr.com/api/admin/:path*" }
  ]
}
```

> Make sure none of these paths already exist on the marketing site. If the
> marketing site already uses `/login`, we can namespace the CRM (e.g. serve it
> under `/app/*` with a `basePath`) — easy to adjust.

## Step 3 — Link it from the site
Add a **"Team Login"** button on bolldr.com pointing to `/login`. That's it —
clicking it serves the CRM login under your own domain.

## Why this design
- **Independent deploys**: the CRM (a database app) evolves without touching or
  risking the marketing site, and vice-versa.
- **Exact URL**: users get `bolldr.com/login`, not a separate domain.
- **Tiny change to the live site**: just a rewrites block — easy to review and
  revert.
