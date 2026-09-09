// Utility script to fetch a player by pesdb.net ID and insert/upsert them into Supabase.
// Usage:
//   node scripts/add-player.mjs          (defaults to Juan, id: 134512)
//   node scripts/add-player.mjs 134512   (or any pesdb player id)

import { existsSync, readFileSync } from "node:fs";

// Load .env.local if present
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const DEFAULT_PLAYER_ID = 134512; // Juan (Juan Santos da Silva - Göztepe SK / Brazil)
const targetId = Number(process.argv[2]) || DEFAULT_PLAYER_ID;

async function fetchFromPesdb(id) {
  console.log(`Fetching player info from pesdb for ID: ${id}...`);
  const url = `https://pesdb.net/efootball/?id=${id}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch from pesdb: ${res.status}`);
  }
  const html = await res.text();

  const natMatch = html.match(/<dt>Nationality<\/dt>\s*<dd><a[^>]*>([^<]+)<\/a>/i);
  const clubMatch = html.match(/<dt>Club<\/dt>\s*<dd><a[^>]*>([^<]+)<\/a>/i);
  const ageMatch = html.match(/<dt>Age<\/dt>\s*<dd[^>]*>\s*(\d+)\s*<\/dd>/i);
  const posMatch = html.match(/<dt>Position<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i) || html.match(/class="[^"]*position[^"]*"[^>]*>([^<]+)<\//i);
  const ratingMatch = html.match(/class="[^"]*overall[^"]*"[^>]*>(\d+)<\//i) || html.match(/Overall Rating\s*(\d+)/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);

  return {
    id,
    name: h1Match ? h1Match[1].trim() : "Unknown",
    team: clubMatch ? clubMatch[1].replace(/&apos;|&#39;|’/g, "'").replace(/&amp;/g, "&").trim() : "",
    position: posMatch ? posMatch[1].trim() : "",
    nationality: natMatch ? natMatch[1].replace(/&apos;|&#39;|’/g, "'").replace(/&amp;/g, "&").trim() : "",
    rating: ratingMatch ? parseInt(ratingMatch[1], 10) : null,
    age: ageMatch ? parseInt(ageMatch[1], 10) : null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  let player;
  try {
    player = await fetchFromPesdb(targetId);
  } catch (err) {
    console.warn("Could not fetch live from pesdb, using fallback data for Juan (134512):", err.message);
    if (targetId === 134512) {
      player = {
        id: 134512,
        name: "Juan",
        team: "Göztepe SK",
        position: "CF",
        nationality: "Brazil",
        rating: 73,
        age: 24,
        updated_at: new Date().toISOString(),
      };
    } else {
      console.error("No fallback available for ID:", targetId);
      process.exit(1);
    }
  }

  console.log("\nPlayer Details:");
  console.log(JSON.stringify(player, null, 2));

  console.log("\n--- SQL Query (Run this in Supabase SQL Editor if inserting manually) ---");
  console.log(`INSERT INTO players (id, name, team, position, nationality, rating, age, updated_at)
VALUES (${player.id}, '${player.name.replace(/'/g, "''")}', '${player.team.replace(/'/g, "''")}', '${player.position}', '${player.nationality.replace(/'/g, "''")}', ${player.rating || "NULL"}, ${player.age || "NULL"}, now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  team = EXCLUDED.team,
  position = EXCLUDED.position,
  nationality = EXCLUDED.nationality,
  rating = EXCLUDED.rating,
  age = EXCLUDED.age,
  updated_at = EXCLUDED.updated_at;
`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      console.log("Connecting to Supabase to upsert player...");
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, serviceKey);
      let { error } = await supabase.from("players").upsert([player], { onConflict: "id" });
      if (error && (error.message?.includes("age") || error.code === "PGRST204")) {
        const { age, ...withoutAge } = player;
        const res = await supabase.from("players").upsert([withoutAge], { onConflict: "id" });
        error = res.error;
      }
      if (error) {
        console.error("Supabase upsert error:", error.message);
      } else {
        console.log(`Successfully added/updated "${player.name}" in Supabase players table!`);
      }
    } catch (e) {
      console.error("Error connecting to Supabase (or @supabase/supabase-js missing):", e.message);
    }
  } else {
    console.log("Note: Supabase credentials not found in .env.local. Run the SQL query above in your Supabase Dashboard SQL Editor.");
  }
}

main();
