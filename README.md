# GPCL Transfer Tracker

A transfer-window tracker for the GPCL league — logs player purchases per team, calculates when a purchased player is eligible to be sold again, and looks up real player data (name, team, position, rating, nationality) from [pesdb.net](https://pesdb.net/efootball/)'s eFootball database while you type.

Originally a single static HTML file (`GPCL Tracker.html`) using vanilla JS and `localStorage`. Rebuilt as a Next.js app backed by Supabase so data persists across devices/browsers and multiple people can maintain it, deployable on Vercel.

## Features

- Log a transfer: buying team, player name (autocomplete), fee, season, transfer window, date.
- Auto-calculates the earliest season/window a purchased player can be resold, per the league's lock rule.
- Search, filter by team, and sort the transfer log.
- Team management (add/rename/remove) — renaming a team cascades to its existing transfer logs.
- Player name autocomplete backed by a local copy of pesdb.net's ~19k-player eFootball database, with each result's position/team/rating and a nationality flag, deduplicated so the same real player (who can appear multiple times in pesdb under different team/card snapshots) only shows once — while two *different* people who happen to share a name (e.g. two "David Silva"s) both still show, since they're distinguished by nationality.
- Supabase Auth: viewing is public, editing (add/edit/delete teams or logs) requires signing in.
- Custom-built dark UI controls (dropdowns, date picker, live clock) instead of native browser widgets, styled to match the rest of the app.

## Tech stack

- **Next.js 16** (App Router, plain JavaScript, no TypeScript)
- **Tailwind CSS v4**
- **Supabase** — Postgres database, Auth, Row Level Security
- **cheerio** — HTML parsing for the one-off pesdb.net scraper

## Project structure

```
app/
  layout.js            root shell, Inter font, page metadata
  page.js              main dashboard — owns all Supabase reads/writes, wires everything together
  login/page.js         email/password sign-in
  globals.css           Tailwind import + custom scrollbar + clock blink keyframes

components/
  TransferForm.jsx       "Log New Purchase" / edit form
  TransferTable.jsx      transfer log table + search/filter/sort toolbar
  TeamManager.jsx        add/edit/remove teams
  PlayerAutocomplete.jsx  player name field, queries the `players` table
  AuthButton.jsx          sign-in/out control in the header
  CustomSelect.jsx        reusable dropdown (used for team/season/window/sort/filter)
  CustomDatePicker.jsx    reusable calendar dropdown (used for transaction date)
  LiveClock.jsx           live local time next to the page title

lib/
  supabase/client.js      browser Supabase client; returns null if env vars aren't set (app degrades gracefully instead of crashing)
  useSession.js            React hook wrapping Supabase auth state
  utils.js                 sale-eligibility calculation, currency formatting
  countryFlags.js          nationality string → flag image URL (flagcdn.com)

scripts/
  scrape-pesdb.mjs         one-off scraper, see below

supabase/
  schema.sql               run once in the Supabase SQL editor to create tables + RLS policies
```

## Setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`. This creates `teams`, `transfer_logs`, `players`, and RLS policies (public read on all three, write requires an authenticated user, `players` is only writable via the service-role key).
3. Copy `.env.local.example` to `.env.local` and fill in (Project Settings → Data API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — secret; only used by the local scraper script, never shipped to the browser.
4. In Supabase Studio → Authentication → Users, create an account for yourself (and anyone else who should be able to edit data), with **Auto Confirm User** checked. There's no sign-up form in the app on purpose — accounts are admin-created only.
5. `npm install`
6. `node scripts/scrape-pesdb.mjs` — populates the `players` table. See below for details/timing.
7. `npm run dev` — http://localhost:3000

If `.env.local` isn't set up yet, the app still runs — it shows an inline banner instead of crashing, and edit controls stay hidden.

## The pesdb.net scraper

`scripts/scrape-pesdb.mjs` is not run by the app or by Vercel — it's a manual, one-off (or occasional re-run) script.

- Paginates `https://pesdb.net/efootball/?page=N` until a page comes back empty, parsing each page's player table with cheerio.
- Upserts into the `players` table (`onConflict: id`, pesdb's own player id), so re-running is always safe and idempotent — it refreshes existing rows rather than duplicating them.
- pesdb.net rate-limits aggressively (HTTP 429) after roughly 90–100 requests. The script backs off automatically (honors `Retry-After`, otherwise exponential backoff) and keeps going — a full run naturally takes on the order of an hour due to these built-in waits, not because anything is stuck.
- If it ever gives up after retries, it prints a resume command with the page number it stopped at: `node scripts/scrape-pesdb.mjs <page>`. Safe to resume from any page since upserts don't duplicate.
- A full run currently pulls all ~18,958 players.

## Player search: dedup and flags

pesdb.net lists the same real player multiple times (different `id`) across team transfers or card/campaign versions — e.g. two "Cristiano Ronaldo" rows for different club affiliations. `PlayerAutocomplete.jsx` dedupes by `name + nationality`, keeping the highest-rated entry, so those collapse to one result. Nationality is part of the key (not name alone) so two genuinely different real players who happen to share a name — e.g. a Colombian David Silva and a Brazilian David Silva both exist in the data — still both show up, distinguished by their flag.

Flags come from `lib/countryFlags.js`, which maps pesdb's nationality strings to flag images via flagcdn.com (not emoji — flag emoji render as plain text on Windows). The mapping covers common footballing nations; anything unmapped just shows no flag rather than guessing.

## Deploy

Push to GitHub, import into Vercel, set the same three env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in the Vercel project settings, deploy. The scraper isn't part of the deploy — run it locally against the same Supabase project whenever you want to refresh player data.
