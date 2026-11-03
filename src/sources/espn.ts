export type TeamLine = {
  name: string; // "Trail Blazers" — matches NBA highlight titles when uppercased
  displayName: string; // "Portland Trail Blazers"
  abbreviation: string;
  logo: string;
  score: number | null;
  record: string | null;
  winner: boolean;
};

export type Game = {
  id: string;
  start: Date;
  status: string; // "Final", "Final/OT", "Postponed", ...
  completed: boolean;
  away: TeamLine;
  home: TeamLine;
};

/** ESPN's public (unofficial) scoreboard. `date` is YYYYMMDD in US/Eastern. */
export async function fetchScoreboard(date: string): Promise<Game[]> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`,
  );
  if (!res.ok) throw new Error(`ESPN scoreboard: HTTP ${res.status}`);
  const data: any = await res.json();

  return (data.events ?? []).map((e: any): Game => {
    const comp = e.competitions[0];
    const line = (side: "home" | "away"): TeamLine => {
      const c = comp.competitors.find((c: any) => c.homeAway === side);
      return {
        name: c.team.name,
        displayName: c.team.displayName,
        abbreviation: c.team.abbreviation,
        logo: c.team.logo,
        score: c.score === undefined || c.score === "" ? null : Number(c.score),
        record: c.records?.find((r: any) => r.type === "total")?.summary ?? null,
        winner: Boolean(c.winner),
      };
    };
    return {
      id: e.id,
      start: new Date(e.date),
      status: e.status.type.shortDetail,
      completed: Boolean(e.status.type.completed),
      away: line("away"),
      home: line("home"),
    };
  });
}
