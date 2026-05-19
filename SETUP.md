# Kinyu Realty — Setup Guide

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

### 1. Clerk Authentication
1. Go to https://clerk.com → Create application
2. Copy `Publishable Key` and `Secret Key` to `.env.local`

### 2. Supabase Database
1. Go to https://app.supabase.com → New project
2. Copy `Project URL` and `anon key` and `service_role key` to `.env.local`
3. Run the migration in Supabase SQL Editor:
   ```sql
   -- Copy and paste the contents of: supabase/migrations/001_initial.sql
   ```
   This creates the `buildings` and `reports` tables and seeds 15 sample buildings.

### 3. Anthropic API
1. Go to https://console.anthropic.com/settings/keys
2. Create a new API key and add to `.env.local`

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to sign-in.

## Adding More Buildings

In Supabase SQL Editor:
```sql
INSERT INTO buildings (name, address, total_units) VALUES
  ('Your Building Name', '123 Street, City, State ZIP', 10);
```

## URL Structure
- `/` → redirects to `/dashboard`
- `/dashboard` → buildings list + recent reports
- `/dashboard/buildings/[id]` → report generation form
- `/dashboard/reports` → all reports archive
- `/dashboard/reports/[id]` → individual report viewer
- `/sign-in`, `/sign-up` → Clerk auth pages

## Report Download
Reports download as `.html` files that can be opened in any browser.
To save as PDF: open the file → File → Print → Save as PDF.

## Tech Stack
- **Next.js 16** (Turbopack, App Router)
- **TypeScript** + **Tailwind CSS v4**
- **Clerk** — authentication
- **Supabase** — PostgreSQL database
- **Anthropic API** (claude-sonnet-4-5) — report generation
- **Vercel** — deployment target
