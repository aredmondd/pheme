import { TIMEZONE } from "../config.ts";

/**
 * ESPN Fantasy Basketball (unofficial v3 API). Works without auth because the
 * league is set to "viewable to public". ESPN calls each day a "scoring period"
 * and each H2H week a "matchup period"; the 2026-27 season is seasonId 2027.
 */

const HOST = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons";

// ESPN lineup slot IDs for basketball.
const BENCH_SLOT = 12;
const IR_SLOT = 13;

export type FantasyTeam = {
  id: number;
  name: string;
  abbrev: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
};

export type MatchupSide = { team: FantasyTeam; points: number };
export type Matchup = { away: MatchupSide; home: MatchupSide };

export type RosterPlayer = {
  id: number;
  name: string;
  proTeam: string;
  headshot: string;
  /** Fantasy points last night; null = no game; 0 can mean DNP. */
  points: number | null;
  hadGame: boolean;
  slot: "starter" | "bench" | "ir";
  injuryStatus: string; // ACTIVE, OUT, DAY_TO_DAY, ...
  /** Season average fantasy points per game; null before their first game. */
  average: number | null;
  /** Their pro team's games left in this matchup week, after last night. */
  gamesLeft: number;
};

/** A team's rest-of-week outlook, from ESPN's per-game projections. */
export type SideOutlook = {
  /** Games their players have left this week, capped at the starting slots each day. */
  gamesLeft: number;
  projectedFinal: number;
};

export type TopPerformer = {
  id: number;
  name: string;
  proTeam: string;
  headshot: string;
  points: number;
  fantasyTeam: FantasyTeam | null; // null = free agent
};

export type Fantasy = {
  leagueName: string;
  matchupPeriodId: number;
  scoringPeriodId: number; // "last night"
  me: FantasyTeam;
  myMatchup: Matchup | null;
  /** Days left in the matchup after last night, and each side's outlook. */
  outlook: { daysLeft: number; me: SideOutlook; opponent: SideOutlook } | null;
  myPlayers: RosterPlayer[];
  opponentTop: RosterPlayer[];
  otherMatchups: Matchup[];
  topPerformers: TopPerformer[];
  standings: FantasyTeam[];
};

export function seasonIdFor(dateKey: string): number {
  const [y, m] = dateKey.split("-").map(Number);
  return m >= 8 ? y + 1 : y; // season spans Oct–Jun; named for the year it ends
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ESPN fantasy: HTTP ${res.status} ${body.slice(0, 120)}`);
  }
  return res.json();
}

const etDate = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(ms);

/** The Sunday ending the Mon–Sun matchup week that contains `dateKey` (itself, if a Sunday). */
function weekEnd(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  return d.toISOString().slice(0, 10);
}

const headshot = (id: number) => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;

export async function fetchFantasy(opts: {
  leagueId: string;
  myTeamName: string;
  gamesDateKey: string; // ET date of last night
}): Promise<Fantasy> {
  const season = seasonIdFor(opts.gamesDateKey);

  // 1. Pro schedules → which scoring period is "last night", and pro team abbrevs.
  const pro = await getJson(`${HOST}/${season}?view=proTeamSchedules_wl`);
  const proAbbrev = new Map<number, string>();
  const proGamePeriods = new Map<number, Set<number>>(); // proTeamId → periods with a game
  const periodDate = new Map<number, string>(); // scoring period → ET date
  let scoringPeriodId: number | null = null;
  for (const t of pro.settings.proTeams) {
    proAbbrev.set(t.id, t.abbrev.toUpperCase());
    const periods = new Set<number>();
    for (const [period, games] of Object.entries<any[]>(t.proGamesByScoringPeriod ?? {})) {
      periods.add(Number(period));
      if (games[0]) periodDate.set(Number(period), etDate(games[0].date));
      if (games.some((g) => etDate(g.date) === opts.gamesDateKey)) scoringPeriodId = Number(period);
    }
    proGamePeriods.set(t.id, periods);
  }
  if (scoringPeriodId === null)
    throw new Error(`No fantasy scoring period for ${opts.gamesDateKey}`);
  const sp = scoringPeriodId;
  // Assumes Mon–Sun matchup weeks (ESPN's default; longer opening/All-Star weeks are undercounted).
  const end = weekEnd(opts.gamesDateKey);
  const periodsLeft = [...periodDate]
    .filter(([, date]) => date > opts.gamesDateKey && date <= end)
    .map(([period]) => period);

  // 2. League: teams, rosters (as of last night), matchups.
  const base = `${HOST}/${season}/segments/0/leagues/${opts.leagueId}`;
  const league = await getJson(
    `${base}?view=mSettings&view=mStatus&view=mTeam&view=mRoster&view=mMatchupScore&scoringPeriodId=${sp}`,
  );

  const teams = new Map<number, FantasyTeam>(
    league.teams.map((t: any) => [
      t.id,
      {
        id: t.id,
        name: (t.name ?? `${t.location ?? ""} ${t.nickname ?? ""}`).trim(),
        abbrev: t.abbrev,
        wins: t.record.overall.wins,
        losses: t.record.overall.losses,
        ties: t.record.overall.ties,
        pointsFor: t.record.overall.pointsFor,
      } satisfies FantasyTeam,
    ]),
  );
  const me = [...teams.values()].find((t) => t.name === opts.myTeamName);
  if (!me) throw new Error(`Team "${opts.myTeamName}" not found in league`);

  const starterSlots = Object.entries<number>(league.settings.rosterSettings.lineupSlotCounts)
    .filter(([slot]) => Number(slot) !== BENCH_SLOT && Number(slot) !== IR_SLOT)
    .reduce((sum, [, n]) => sum + n, 0);

  const seasonAverage = (player: any, source: 0 | 1): number | null => {
    const s = (player.stats ?? []).find(
      (s: any) => s.seasonId === season && s.statSplitTypeId === 0 && s.statSourceId === source,
    );
    return typeof s?.appliedAverage === "number" ? s.appliedAverage : null;
  };

  const pointsFor = (player: any): number | null => {
    const s = (player.stats ?? []).find(
      (s: any) => s.scoringPeriodId === sp && s.statSplitTypeId === 5 && s.statSourceId === 0,
    );
    return s ? s.appliedTotal : null;
  };

  const projected = new Map<number, number>(); // player id → projected fpts per game
  const rosterOf = (teamId: number): RosterPlayer[] => {
    const t = league.teams.find((t: any) => t.id === teamId);
    return (t?.roster?.entries ?? [])
      .map((e: any): RosterPlayer => {
        const p = e.playerPoolEntry.player;
        const pts = pointsFor(p);
        const average = seasonAverage(p, 0);
        projected.set(p.id, seasonAverage(p, 1) ?? average ?? 0);
        const teamPeriods = proGamePeriods.get(p.proTeamId);
        return {
          id: p.id,
          name: p.fullName,
          proTeam: proAbbrev.get(p.proTeamId) ?? "",
          headshot: headshot(p.id),
          points: pts,
          hadGame: pts !== null || (proGamePeriods.get(p.proTeamId)?.has(sp) ?? false),
          slot:
            e.lineupSlotId === BENCH_SLOT ? "bench" : e.lineupSlotId === IR_SLOT ? "ir" : "starter",
          injuryStatus: p.injuryStatus ?? "ACTIVE",
          average: average === null ? null : Math.round(average),
          gamesLeft: periodsLeft.filter((period) => teamPeriods?.has(period)).length,
        };
      })
      .sort((a: RosterPlayer, b: RosterPlayer) => (b.points ?? -1) - (a.points ?? -1));
  };

  const matchupPeriodId: number = league.status.currentMatchupPeriod;
  const side = (s: any): MatchupSide => ({
    team: teams.get(s.teamId)!,
    points: s.totalPointsLive ?? s.totalPoints ?? 0,
  });
  const matchups: Matchup[] = league.schedule
    .filter((m: any) => m.matchupPeriodId === matchupPeriodId && m.away && m.home)
    .map((m: any) => ({ away: side(m.away), home: side(m.home) }));
  const myMatchup =
    matchups.find((m) => m.away.team.id === me.id || m.home.team.id === me.id) ?? null;
  const opponentId = myMatchup
    ? myMatchup.away.team.id === me.id
      ? myMatchup.home.team.id
      : myMatchup.away.team.id
    : null;

  /** Each remaining day, the best projected players with a game fill the starting slots. */
  const outlookFor = (roster: RosterPlayer[], current: number): SideOutlook => {
    const pro = new Map(
      [...proAbbrev].map(([id, abbrev]) => [abbrev, proGamePeriods.get(id) ?? new Set<number>()]),
    );
    const available = roster.filter((p) => p.slot !== "ir" && p.injuryStatus !== "OUT");
    let gamesLeft = 0;
    let points = current;
    for (const period of periodsLeft) {
      const playing = available
        .filter((p) => pro.get(p.proTeam)?.has(period))
        .map((p) => projected.get(p.id) ?? 0)
        .sort((a, b) => b - a)
        .slice(0, starterSlots);
      gamesLeft += playing.length;
      points += playing.reduce((a, b) => a + b, 0);
    }
    return { gamesLeft, projectedFinal: Math.round(points) };
  };

  const myPlayers = rosterOf(me.id);
  const opponentPlayers = opponentId ? rosterOf(opponentId) : [];
  let outlook: Fantasy["outlook"] = null;
  if (myMatchup && opponentId !== null) {
    const [mine, theirs] =
      myMatchup.away.team.id === me.id
        ? [myMatchup.away, myMatchup.home]
        : [myMatchup.home, myMatchup.away];
    outlook = {
      daysLeft: periodsLeft.length,
      me: outlookFor(myPlayers, mine.points),
      opponent: outlookFor(opponentPlayers, theirs.points),
    };
  }

  // 3. League-wide top 5 for last night (includes free agents).
  const filter = {
    players: {
      limit: 5,
      sortAppliedStatTotalForScoringPeriodId: { sortAsc: false, sortPriority: 1, value: sp },
    },
  };
  const kona = await getJson(`${base}?view=kona_player_info&scoringPeriodId=${sp}`, {
    "X-Fantasy-Filter": JSON.stringify(filter),
  });
  const topPerformers: TopPerformer[] = (kona.players ?? [])
    .map((e: any) => ({
      id: e.player.id,
      name: e.player.fullName,
      proTeam: proAbbrev.get(e.player.proTeamId) ?? "",
      headshot: headshot(e.player.id),
      points: pointsFor(e.player) ?? 0,
      fantasyTeam: teams.get(e.onTeamId) ?? null,
    }))
    .slice(0, 5);

  const standings = [...teams.values()].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || b.pointsFor - a.pointsFor,
  );

  return {
    leagueName: league.settings.name,
    matchupPeriodId,
    scoringPeriodId: sp,
    me,
    myMatchup,
    outlook,
    myPlayers,
    opponentTop: opponentPlayers.filter((p) => p.slot === "starter").slice(0, 3),
    otherMatchups: matchups.filter((m) => m !== myMatchup),
    topPerformers,
    standings,
  };
}
