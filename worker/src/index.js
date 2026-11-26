const PEOPLE = ["anthony"];
const CHARACTERS = [
  "michael-scott", "dwight-schrute", "jim-halpert", "pam-beesly", "ryan-howard", "andy-bernard",
  "angela-martin", "kevin-malone", "oscar-martinez", "stanley-hudson", "phyllis-vance", "meredith-palmer",
  "creed-bratton", "kelly-kapoor", "toby-flenderson", "darryl-philbin", "erin-hannon",
];
const VOTER_RE = /^[0-9a-f-]{36}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGINS.split(",").includes(origin) ? origin : "";
    const cors = { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
    const json = (body, status = 200) => Response.json(body, { status, headers: cors });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);

    if (url.pathname === "/votes" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT person, character, COUNT(*) AS n FROM votes GROUP BY person, character").all();
      const tally = {};
      for (const r of results) (tally[r.person] ??= {})[r.character] = r.n;
      const mine = {};
      const voter = url.searchParams.get("voter");
      if (voter && VOTER_RE.test(voter)) {
        const own = await env.DB.prepare("SELECT person, character FROM votes WHERE voter = ?").bind(voter).all();
        for (const r of own.results) mine[r.person] = r.character;
      }
      return json({ tally, mine });
    }

    if (url.pathname === "/vote" && request.method === "POST") {
      const { voter, person, character } = await request.json().catch(() => ({}));
      if (!VOTER_RE.test(voter || "") || !PEOPLE.includes(person)) return json({ error: "invalid" }, 400);
      if (character === null) {
        await env.DB.prepare("DELETE FROM votes WHERE voter = ? AND person = ?").bind(voter, person).run();
      } else if (CHARACTERS.includes(character)) {
        await env.DB.prepare(
          "INSERT INTO votes (voter, person, character) VALUES (?, ?, ?) ON CONFLICT (voter, person) DO UPDATE SET character = excluded.character"
        ).bind(voter, person, character).run();
      } else return json({ error: "invalid" }, 400);
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
};
