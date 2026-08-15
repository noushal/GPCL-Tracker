GPCL Transfer Tracker — Next.js + Supabase rebuild of `GPCL Tracker.html`.

## Setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page (used only by the local scraper script, never shipped to the browser).
4. In Supabase Studio → Authentication → Users, create an account for yourself (and anyone else who should be able to edit data). There's no sign-up form in the app on purpose.
5. `npm install`
6. `node scripts/scrape-pesdb.mjs` — populates the `players` table from pesdb.net (~19k players, takes several minutes; safe to re-run later to refresh ratings).
7. `npm run dev` — http://localhost:3000

## Deploy

Push to GitHub, import into Vercel, set the same three env vars in the Vercel project settings, deploy. Reads (teams, transfer logs) are public; adding/editing/deleting requires being signed in.
