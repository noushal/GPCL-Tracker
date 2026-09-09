import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/player-search?name=Laciné+Megnan+Pave
 *
 * Real-time fallback lookup for players directly from pesdb.net's eFootball database.
 * Ensures any player (including lower-rated or newly added players) can be found and
 * auto-completed even if they are not in the local Supabase players table.
 * Caches newly found players into the Supabase players table when service key is present.
 */

// Curated / known players that may not be easily resolved by pesdb's first page of results
const KNOWN_PLAYERS = [
  {
    id: 134512,
    name: "Juan",
    position: "CF",
    team: "Göztepe SK",
    nationality: "Brazil",
    rating: 73,
    age: 24,
    aliases: ["juan", "juan santos", "juan santos da silva", "santos da silva", "juan silva", "juan goztepe"],
  },
];

async function queryPesdb(term) {
  const url = `https://pesdb.net/efootball/players/?name=${encodeURIComponent(term)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    next: { revalidate: 86400 }, // cache search for 24h
  });
  if (!res.ok) return [];
  const html = await res.text();

  const articleRegex = /<article class="efootball-result-card">(.*?)<\/article>/gs;
  const cards = [];
  let match;
  while ((match = articleRegex.exec(html)) !== null && cards.length < 6) {
    cards.push(match[1]);
  }

  const results = await Promise.all(
    cards.map(async (cardHtml) => {
      const hrefMatch = cardHtml.match(/href="(\/efootball\/players\/[^\/"]*?-(\d+))"/);
      const nameMatch = cardHtml.match(/class="efootball-result-name"><a[^>]*>([^<]+)<\/a>/);
      const imgMatch = cardHtml.match(/alt="([^"]*?)\s*[—·•\-–]\s*([A-Z]+),\s*OVR\s*(\d+)/);

      if (!hrefMatch) return null;

      const href = hrefMatch[1];
      const id = Number(hrefMatch[2]);
      const name = nameMatch ? nameMatch[1].trim() : (imgMatch ? imgMatch[1].trim() : "");
      const position = imgMatch ? imgMatch[2].trim() : "";
      const rating = imgMatch ? parseInt(imgMatch[3], 10) : null;

      let nationality = "";
      let team = "";
      let age = null;
      try {
        const pageRes = await fetch(`https://pesdb.net${href}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          next: { revalidate: 86400 },
        });
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const natMatch = pageHtml.match(/<dt>Nationality<\/dt>\s*<dd><a[^>]*>([^<]+)<\/a>/i);
          const clubMatch = pageHtml.match(/<dt>Club<\/dt>\s*<dd><a[^>]*>([^<]+)<\/a>/i);
          const ageMatch = pageHtml.match(/<dt>Age<\/dt>\s*<dd[^>]*>\s*(\d+)\s*<\/dd>/i);
          if (natMatch) {
            nationality = natMatch[1]
              .replace(/&apos;|&#39;|’/g, "'")
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .trim();
          }
          if (clubMatch) {
            team = clubMatch[1]
              .replace(/&apos;|&#39;|’/g, "'")
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .trim();
          }
          if (ageMatch) {
            age = parseInt(ageMatch[1], 10);
          }
        }
      } catch {}

      return {
        id,
        name,
        position,
        rating,
        team,
        nationality,
        age,
      };
    })
  );

  return results.filter(Boolean);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let name = (searchParams.get("name") || "").replace(/[,.]/g, "").trim();

  if (!name || name.length < 2) {
    return Response.json([]);
  }

  try {
    const termLower = name.toLowerCase();
    const matchedKnown = KNOWN_PLAYERS.filter((p) => {
      if (p.name.toLowerCase() === termLower) return true;
      if (p.name.toLowerCase().includes(termLower)) return true;
      if (p.aliases?.some((a) => a === termLower || a.includes(termLower) || termLower.includes(a))) return true;
      return false;
    }).map(({ aliases, ...rest }) => rest);

    // 1. Try exact search term
    let players = await queryPesdb(name);

    // 2. If no results and name has accents, try normalized ASCII version
    if (players.length === 0) {
      const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalized !== name) {
        players = await queryPesdb(normalized);
      }
    }

    // 3. If still no results and multiple words, try significant words (e.g. surname)
    if (players.length === 0 && name.includes(" ")) {
      const words = name.split(/\s+/).filter((w) => w.length >= 3);
      words.sort((a, b) => b.length - a.length);
      for (const word of words) {
        players = await queryPesdb(word);
        if (players.length > 0) break;
      }
    }

    // Merge matched known players (prepend so exact known matches appear first, deduping by id)
    if (matchedKnown.length > 0) {
      const existingIds = new Set(players.map((p) => p.id));
      const newKnown = matchedKnown.filter((p) => !existingIds.has(p.id));
      players = [...newKnown, ...players];
    }

    // Optional: Cache newly found players to Supabase
    if (
      players.length > 0 &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const rows = players.map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          team: p.team,
          rating: p.rating,
          nationality: p.nationality,
          age: p.age,
          updated_at: new Date().toISOString(),
        }));
        let { error: upsertErr } = await supabase.from("players").upsert(rows, { onConflict: "id" });
        if (upsertErr && (upsertErr.message?.includes("age") || upsertErr.code === "PGRST204")) {
          const rowsWithoutAge = rows.map(({ age, ...rest }) => rest);
          await supabase.from("players").upsert(rowsWithoutAge, { onConflict: "id" });
        }
      } catch (upsertErr) {
        console.warn("Could not cache players to Supabase:", upsertErr);
      }
    }

    return Response.json(players.slice(0, 8));
  } catch (error) {
    console.error("Player search route error:", error);
    return Response.json([]);
  }
}
