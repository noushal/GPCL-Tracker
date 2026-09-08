/**
 * GET /api/team-logo?name=Arsenal
 *
 * Proxies TheSportsDB (free tier, no key needed) to find a team badge.
 * Running this server-side avoids CORS issues from the browser.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") || "").trim();

  if (!name || name.length < 2) {
    return Response.json({ logo: null, teamName: null });
  }

  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`,
      { next: { revalidate: 86400 } } // cache each lookup for 24 h
    );

    if (!res.ok) return Response.json({ logo: null, teamName: null });

    const data = await res.json();
    const team = data?.teams?.[0];

    return Response.json({
      logo: team?.strBadge ?? null,
      teamName: team?.strTeam ?? null,
    });
  } catch {
    return Response.json({ logo: null, teamName: null });
  }
}
