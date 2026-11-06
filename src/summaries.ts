/**
 * The AI summaries at the top of the page: last night (games + news titles) and fantasy. Prompts are built only from
 * data we already fetched, and every bullet is checked: if it contains a number
 * that isn't in the input, it's dropped (the model got a stat wrong).
 */
import { formatDateKey } from "./dates.ts";
import { complete } from "./llm/groq.ts";
import type { Game } from "./sources/espn.ts";
import type { GameRecap } from "./sources/espnRecap.ts";
import type { FantasyRecap } from "./collect.ts";
import type { RosterPlayer } from "./sources/espnFantasy.ts";

const NBA_SYSTEM = `You write the top of a morning NBA briefing for a fan who missed last night. They scan it in 15 seconds. Scores and box scores are already shown below your text, so your job is only to say what mattered and why.

Input: each game from last night (final score, records, flags, and the opening of the AP recap), then titles of YouTube videos from the past day.

Pick the 4 to 6 biggest stories of the night, ranked:
1. Career highs, historic marks, and real news (injuries, trades, suspensions).
2. Dramatic finishes (game-winners, overtime, big comebacks) and notable streaks.
3. Fights, ejections, beef, and memorable moments from video titles.
A story can come from a game, a video title, or both. When they're about the same thing, combine them into one bullet. Skip routine games.

Each bullet:
- One sentence, 20 words or fewer.
- Says what happened and why it matters, using the input's own framing (career high, game-winner, sixth straight win, first since...).
- At most two numbers. Never include the final score. Never list a stat line.
- No emoji, no profanity, no filler verbs ("erupted", "poured in", "dropped", "delivered", "notched").

Good: "Jayson Tatum's step-back three with two seconds left beat the Knicks and extended Boston's win streak to seven."
Bad: "Jayson Tatum scored 38 points with 7 rebounds and 5 assists in Boston's 110-108 win over New York."

Facts: only what the input states. How a game unfolded must come from the AP recap or a video title. Keep details exactly as strong as the source, no stronger and no weaker: "with a second left" is not a buzzer-beater, and "sixth straight game with 35" must keep "straight". Copy numbers exactly as written (write "1996-1997", not "1996-97").
Video titles are exaggerated slang. A bullet built from a title is a plain paraphrase of that title and nothing more: keep every person it names and who did what to whom, and add no reactions, consequences, timing, or causes it doesn't state. If a title doesn't make clear who was involved, skip it.

Output only the bullets, each starting with "- ".`;

const FANTASY_SYSTEM = `You write the fantasy basketball part of a morning briefing for the manager of the team named in the data. Address them as "you". The page already shows the matchup score, every player's points, the league's top scorers, other matchups, and standings, so don't restate those. Your job is to say how their week is going and what's worth knowing.

Write 2 to 4 bullets, in this order, skipping any that has nothing notable:
1. Where the matchup is headed: the current margin, then how the games left compare and the projected margin. Say whether it looks comfortable, close, or slipping away.
2. Injuries that affect the rest of their week: status changes since yesterday, and starters currently listed as out or day to day.
3. Which of their players beat their average by the most last night, and which fell furthest below it (not raw points). Bench and IR points didn't count toward the matchup.
4. At most one thing from elsewhere, only if it touches their week: the opponent's biggest night, a free agent in the top five, or their own standings position. Skip players on other fantasy teams.

Each bullet: one sentence, 20 words or fewer, at most two numbers. Plain and conversational. No emoji, no filler verbs ("exploded", "erupted", "dropped", "lagged").
Good: "You're up 81 with 3 more player-games than Blanco, projected to win by 134."
Good: "Bam Adebayo scored 62, 24 above his average; Jamal Murray was 16 under his."
Bad: "Bam Adebayo overperformed by +24, while Jamal Murray underperformed by -16 versus their averages."

Facts: only what the data states, with numbers copied exactly. Never calculate a new number (differences, ranks, totals). State injury statuses as given, with nothing added: no "could miss games" or "for the rest of the week". Projections are ESPN estimates: say "projected", never "will". Don't give advice (start, sit, add, drop, trade). Only use words like "best" or "top" when the data's ranking shows it.

Output only the bullets, each starting with "- ".`;

/** Games plus news-channel video titles, for the combined "last night" summary. */
export function nbaPrompt(
  gamesDateKey: string,
  games: Game[],
  recaps: Map<string, GameRecap>,
  videos: { title: string }[],
): string {
  const day = formatDateKey(gamesDateKey, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const blocks = games
    .filter((g) => g.completed && g.away.score !== null && g.home.score !== null)
    .map((g) => {
      const [w, l] = g.away.score! > g.home.score! ? [g.away, g.home] : [g.home, g.away];
      const recap = recaps.get(g.id);
      const margin = w.score! - l.score!;
      const flags = [
        ...(g.status.includes("OT") ? ["overtime"] : []),
        ...(margin <= 3 ? ["one-possession finish"] : []),
        ...(margin >= 20 ? ["blowout"] : []),
      ];
      const deficit = recap?.largestLead.get(l.abbreviation) ?? 0;
      if (deficit >= 12) flags.push(`${w.name} came back from ${deficit} down`);
      const records =
        w.record && l.record ? ` Records now: ${w.name} ${w.record}, ${l.name} ${l.record}.` : "";
      return [
        `${w.displayName} ${w.score}, ${l.displayName} ${l.score} (${g.status}).${records}${flags.length ? ` [${flags.join("; ")}]` : ""}`,
        `AP recap: ${recap?.ap ?? "(none)"}`,
      ].join("\n");
    });
  const parts = [`LAST NIGHT'S GAMES (${day})`, "", blocks.join("\n\n") || "(no games)"];
  if (videos.length)
    parts.push(
      "",
      "YOUTUBE VIDEO TITLES FROM THE PAST DAY (newest first)",
      "",
      ...videos.map((v) => `- ${v.title}`),
    );
  return parts.join("\n");
}

export function fantasyPrompt(f: FantasyRecap): string {
  const rec = (t: { wins: number; losses: number }) => `${t.wins}-${t.losses}`;
  const status = (s: string) => s.replaceAll("_", " ").toLowerCase();
  const pl = (p: RosterPlayer) => {
    const diff = p.points !== null && p.average !== null ? p.points - p.average : null;
    const vsAvg =
      diff === null
        ? ""
        : ` (${diff === 0 ? "exactly" : `${Math.abs(diff)} ${diff > 0 ? "above" : "below"}`} his ${p.average} average)`;
    const notes = [
      ...(p.slot !== "starter" ? [`${p.slot.toUpperCase()}, points didn't count`] : []),
      ...(p.injuryStatus !== "ACTIVE" ? [status(p.injuryStatus)] : []),
    ];
    return `- ${p.name} (${p.proTeam}): ${p.points === null ? "no game" : `${p.points} fpts`}${vsAvg}${notes.length ? ` [${notes.join(", ")}]` : ""}`;
  };
  const out = [
    `My team: ${f.me.name} (${rec(f.me)}). League: ${f.leagueName}, H2H points, ${f.standings.length} teams.`,
  ];
  if (f.myMatchup) {
    const [mine, opp] =
      f.myMatchup.away.team.id === f.me.id
        ? [f.myMatchup.away, f.myMatchup.home]
        : [f.myMatchup.home, f.myMatchup.away];
    const diff = mine.points - opp.points;
    out.push(
      `Week ${f.matchupPeriodId} matchup so far: ${f.me.name} ${mine.points} vs ${opp.team.name} ${opp.points} (${diff >= 0 ? `leading by ${diff}` : `trailing by ${-diff}`}).`,
    );
    if (f.outlook) {
      const { me, opponent, daysLeft } = f.outlook;
      const margin = me.projectedFinal - opponent.projectedFinal;
      out.push(
        daysLeft === 0
          ? "No games left in this matchup."
          : `Rest of the week (${daysLeft} more days with games): ${f.me.name} have ${me.gamesLeft} player-games left, projected final ${me.projectedFinal}; ${opp.team.name} have ${opponent.gamesLeft} player-games left, projected final ${opponent.projectedFinal}. Projected ${margin >= 0 ? `win by ${margin}` : `loss by ${-margin}`}.`,
      );
    }
  }
  if (f.injuryChanges.length)
    out.push(
      "",
      "Injury status changes on my roster since yesterday:",
      ...f.injuryChanges.map((c) => `- ${c.name}: ${status(c.from)} → ${status(c.to)}`),
    );
  out.push("", "My players last night:", ...f.myPlayers.map(pl));
  if (f.opponentTop.length)
    out.push("", "Opponent's top starters last night:", ...f.opponentTop.map(pl));
  out.push(
    "",
    "League-wide top 5 fantasy scorers last night (ranked, #1 = highest):",
    ...f.topPerformers.map(
      (p, i) =>
        `#${i + 1} ${p.name} (${p.proTeam}): ${p.points} fpts, rostered by ${p.fantasyTeam?.name ?? "nobody (free agent)"}`,
    ),
  );
  if (f.otherMatchups.length)
    out.push(
      "",
      `Other Week ${f.matchupPeriodId} matchups:`,
      ...f.otherMatchups.map(
        (m) => `- ${m.away.team.name} ${m.away.points} vs ${m.home.team.name} ${m.home.points}`,
      ),
    );
  out.push(
    "",
    "Standings:",
    ...f.standings.map((t, i) => `${i + 1}. ${t.name} ${rec(t)}, ${t.pointsFor} PF`),
  );
  return out.join("\n");
}

export const summarizeNba = (prompt: string) => summarize(NBA_SYSTEM, prompt);
/** Fantasy bullets say "you"; ground those numbers against the manager's team name. */
export const summarizeFantasy = (prompt: string, myTeamName: string) =>
  summarize(FANTASY_SYSTEM, prompt, (b) => b.replace(/\byou(?:'re|r)?\b/gi, myTeamName));

async function summarize(
  system: string,
  user: string,
  /** Rewrites a bullet before the grounding check only (e.g. "you" → a team name). */
  forGrounding: (bullet: string) => string = (b) => b,
): Promise<string[]> {
  const raw = await complete(system, user);
  const bullets = parseBullets(raw);
  const kept = bullets.filter((b) => {
    if (numbersAreGrounded(forGrounding(b), user)) return true;
    console.warn(`Dropped summary bullet with numbers not in the data: ${b}`);
    return false;
  });
  if (kept.length === 0) throw new Error("Summary had no usable bullets");
  return kept;
}

export function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 0);
}

const NOT_SUBJECTS = new Set([
  "League-wide",
  "PTS",
  "REB",
  "AST",
  "3PM",
  "BENCH",
  "IR",
  "NBA",
  "Final",
  "Each",
  "My",
]);

/**
 * Every number in the bullet must come from a fact in the input that is about
 * something the bullet names. The input is split into facts (one per line or
 * per "; "-separated player line); a fact's subjects are its capitalized words
 * (player, team, and fantasy team names). So "Luka Doncic … 15 rebounds" fails
 * when 15 is only on Walker Kessler's line.
 */
export function numbersAreGrounded(bullet: string, input: string): boolean {
  // Normalize unicode hyphens/dashes so "117‑112" splits into 117 and 112.
  const b = stripAccents(bullet).replace(/[‐-―]/g, "-");
  // Sources often spell numbers out ("five blocks") where bullets use digits.
  input = stripAccents(input).replace(NUMBER_WORDS_RE, (w) =>
    String(NUMBER_WORDS.indexOf(w.toLowerCase())),
  );
  const bLower = b.toLowerCase();
  const nums = b.match(/\d+(?:\.\d+)?/g) ?? [];
  if (nums.length === 0) return true;

  const facts = input.split(/\n|; /).map((text) => ({
    nums: new Set(text.match(/\d+(?:\.\d+)?/g) ?? []),
    subjects: (text.match(/\b[A-Z][\p{L}'’.-]{2,}/gu) ?? [])
      .filter((w) => !NOT_SUBJECTS.has(w))
      .map((w) => w.toLowerCase()),
  }));

  return nums.every((n) =>
    facts.some(
      (f) =>
        f.nums.has(n) && f.subjects.some((s) => new RegExp(`\\b${escape(s)}\\b`, "u").test(bLower)),
    ),
  );
}

const NUMBER_WORDS =
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(
    " ",
  );
const NUMBER_WORDS_RE = new RegExp(`\\b(?:${NUMBER_WORDS.join("|")})\\b`, "gi");
const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
