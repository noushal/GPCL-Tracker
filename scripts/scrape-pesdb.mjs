// One-off scraper: pulls the eFootball player database from pesdb.net and
// upserts it into the Supabase `players` table. Not run by the app or by
// Vercel — run manually with `node scripts/scrape-pesdb.mjs` whenever you
// want to (re)populate/refresh player data.
//
// Requires env vars (put them in .env.local or export before running):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

// minimal .env.local loader (avoids adding a dotenv dependency)
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env / .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BASE_URL = "https://pesdb.net/efootball/";
const DELAY_MS = 600;
const MAX_RETRIES = 6;

// resume from a given page: `node scripts/scrape-pesdb.mjs 90`
const START_PAGE = Math.max(1, parseInt(process.argv[2], 10) || 1);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) return res;

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoffMs = retryAfter > 0 ? retryAfter * 1000 : DELAY_MS * 2 ** attempt;
      console.log(`  ${res.status} on ${url}, retrying in ${Math.round(backoffMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      continue;
    }

    return res; // non-retryable error status, let caller handle
  }
  throw new Error(`Gave up after ${MAX_RETRIES} retries on ${url}`);
}

function parsePage(html) {
  const $ = cheerio.load(html);
  const rows = [];

  $("table.players tr").each((_, el) => {
    const tds = $(el).find("td");
    if (tds.length < 8) return; // skip header row

    const nameLink = $(tds[1]).find("a");
    const href = nameLink.attr("href") || "";
    const idMatch = href.match(/[?&]id=(\d+)/);
    if (!idMatch) return;

    rows.push({
      id: Number(idMatch[1]),
      name: nameLink.text().trim(),
      position: $(tds[0]).find("div").text().trim(),
      team: $(tds[2]).text().trim(),
      nationality: $(tds[3]).text().trim(),
      rating: parseInt($(tds[7]).text().trim(), 10) || null,
      updated_at: new Date().toISOString(),
    });
  });

  return rows;
}

async function main() {
  let page = START_PAGE;
  let totalUpserted = 0;
  if (page > 1) console.log(`Resuming from page ${page}`);

  while (true) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      console.error(`Request failed for page ${page}: ${res.status}. Resume later with: node scripts/scrape-pesdb.mjs ${page}`);
      break;
    }
    const html = await res.text();
    const rows = parsePage(html);

    if (rows.length === 0) {
      console.log(`No more players at page ${page}, stopping.`);
      break;
    }

    const { error } = await supabase.from("players").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error(`Upsert failed on page ${page}:`, error.message, `. Resume later with: node scripts/scrape-pesdb.mjs ${page}`);
      break;
    }

    totalUpserted += rows.length;
    console.log(`Page ${page}: upserted ${rows.length} players (total ${totalUpserted})`);

    page += 1;
    await sleep(DELAY_MS);
  }

  console.log(`Done. Total players upserted: ${totalUpserted}`);
}

main();
