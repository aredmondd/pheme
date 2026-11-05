export type StandingsTeam = {
  seed: number;
  name: string; // "Bulls"
  displayName: string; // "Chicago Bulls"
  abbreviation: string;
  logo: string;
  record: string; // "1-7"
};

export type Standings = { east: StandingsTeam[]; west: StandingsTeam[] };

/** ESPN's public (unofficial) standings, split by conference and sorted by seed. */
export async function fetchStandings(): Promise<Standings> {
  const res = await fetch("https://site.api.espn.com/apis/v2/sports/basketball/nba/standings");
  if (!res.ok) throw new Error(`ESPN standings: HTTP ${res.status}`);
  const data: any = await res.json();

  const conference = (abbr: "East" | "West"): StandingsTeam[] => {
    const conf = data.children?.find((c: any) => c.abbreviation === abbr);
    if (!conf) throw new Error(`ESPN standings: missing ${abbr} conference`);
    return conf.standings.entries
      .map((e: any): StandingsTeam => {
        const stat = (name: string) => e.stats.find((s: any) => s.name === name);
        return {
          seed: stat("playoffSeed")?.value ?? 0,
          name: e.team.name,
          displayName: e.team.displayName,
          abbreviation: e.team.abbreviation,
          logo: e.team.logos?.[0]?.href ?? "",
          record:
            stat("overall")?.displayValue ?? `${stat("wins")?.value}-${stat("losses")?.value}`,
        };
      })
      .sort((a: StandingsTeam, b: StandingsTeam) => a.seed - b.seed);
  };

  return { east: conference("East"), west: conference("West") };
}
