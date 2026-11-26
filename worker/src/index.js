import catalog from "../../catalog.json";

const PEOPLE = new Set(catalog.people.map(p => p.id));
const CHARACTERS = Object.fromEntries(catalog.licences.map(l => [l.id, new Set(l.characters.map(c => c.id))]));
const VOTER_RE = /^[0-9a-f-]{36}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGINS.split(",").includes(origin) ? origin : "";
    const cors = { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
    const json = (body, status = 200) => Response.json(body, { status, headers: cors });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);

    // tally[person][licence][character] = count; mine[person][licence] = character
    if (url.pathname === "/votes" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT person, licence, character, COUNT(*) AS n FROM votes GROUP BY person, licence, character").all();
      const tally = {};
      for (const r of results) ((tally[r.person] ??= {})[r.licence] ??= {})[r.character] = r.n;
      const mine = {};
      const voter = url.searchParams.get("voter");
      if (voter && VOTER_RE.test(voter)) {
        const own = await env.DB.prepare("SELECT person, licence, character FROM votes WHERE voter = ?").bind(voter).all();
        for (const r of own.results) (mine[r.person] ??= {})[r.licence] = r.character;
      }
      return json({ tally, mine });
    }

    if (url.pathname === "/vote" && request.method === "POST") {
      const { voter, person, licence, character } = await request.json().catch(() => ({}));
      if (!VOTER_RE.test(voter || "") || !PEOPLE.has(person) || !CHARACTERS[licence]) return json({ error: "invalid" }, 400);
      if (character === null) {
        await env.DB.prepare("DELETE FROM votes WHERE voter = ? AND person = ? AND licence = ?").bind(voter, person, licence).run();
      } else if (CHARACTERS[licence].has(character)) {
        await env.DB.prepare(
          "INSERT INTO votes (voter, person, licence, character) VALUES (?, ?, ?, ?) ON CONFLICT (voter, person, licence) DO UPDATE SET character = excluded.character"
        ).bind(voter, person, licence, character).run();
      } else return json({ error: "invalid" }, 400);
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
};
