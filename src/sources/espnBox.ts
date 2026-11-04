export type PlayerLine = {
  name: string;
  points: number;
  rebounds: number;
  assists: number;
  threes: number;
};

/** Top `n` scorers per team (keyed by team abbreviation) from ESPN's game summary. */
export async function fetchBoxTopScorers(
  gameId: string,
  n = 3,
): Promise<Map<string, PlayerLine[]>> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`,
  );
  if (!res.ok) throw new Error(`ESPN box score ${gameId}: HTTP ${res.status}`);
  const data: any = await res.json();

  const out = new Map<string, PlayerLine[]>();
  for (const team of data.boxscore?.players ?? []) {
    const stats = team.statistics?.[0];
    if (!stats) continue;
    const idx = (key: string) => stats.keys.indexOf(key);
    const [iPts, iReb, iAst, i3] = [
      idx("points"),
      idx("rebounds"),
      idx("assists"),
      idx("threePointFieldGoalsMade-threePointFieldGoalsAttempted"),
    ];
    const lines: PlayerLine[] = (stats.athletes ?? [])
      .filter((a: any) => !a.didNotPlay && a.stats?.length)
      .map((a: any) => ({
        name: a.athlete.displayName,
        points: Number(a.stats[iPts]) || 0,
        rebounds: Number(a.stats[iReb]) || 0,
        assists: Number(a.stats[iAst]) || 0,
        threes: Number(String(a.stats[i3] ?? "0").split("-")[0]) || 0,
      }))
      .sort((a: PlayerLine, b: PlayerLine) => b.points - a.points)
      .slice(0, n);
    out.set(team.team.abbreviation, lines);
  }
  return out;
}
