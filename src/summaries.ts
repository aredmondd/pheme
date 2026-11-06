/**
 * The AI summaries at the top of the page: last night (games + news titles) and fantasy. Prompts are built only from
 * data we already fetched, and every bullet is checked: if it contains a number
 * that isn't in the input, it's dropped (the model got a stat wrong).
 */
import { formatDateKey } from "./dates.ts";
import { complete } from "./llm/groq.ts";
import type { Game } from "./sources/espn.ts";
import type { GameRecap } from "./sources/espnRecap.ts";
import type { Fantasy, RosterPlayer } from "./sources/espnFantasy.ts";

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

const FANTASY_SYSTEM = `You write a short morning fantasy basketball recap for the manager of the team named in the data. Address them as "you". Use ONLY the data provided: never invent stats, trends, projections, injuries, or advice. Only cite a number exactly as it appears on that player's or team's own line. Only use words like "league-high", "best", "worst", or "top" when the data's ranking directly shows it. Players marked BENCH or IR scored points that did not count toward the matchup. Write 3–5 bullets: first where the matchup stands, then the standout and the dud from their roster, then anything notable from the opponent or the rest of the league (for example a top-5 scorer who is a free agent). One sentence per bullet, plain and conversational, no emoji. Output only the bullets, each starting with "- ".`;

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

export function fantasyPrompt(f: Fantasy): string {
  const rec = (t: { wins: number; losses: number }) => `${t.wins}-${t.losses}`;
  const pl = (p: RosterPlayer) => {
    const pts = p.points === null ? "no game" : `${p.points} fpts`;
    const notes = [
      ...(p.slot !== "starter" ? [`${p.slot.toUpperCase()} (points don't count)`] : []),
      ...(p.injuryStatus !== "ACTIVE" ? [p.injuryStatus.replaceAll("_", " ").toLowerCase()] : []),
    ];
    return `- ${p.name} (${p.proTeam}): ${pts}${notes.length ? ` [${notes.join(", ")}]` : ""}`;
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
  }
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
export const summarizeFantasy = (prompt: string) => summarize(FANTASY_SYSTEM, prompt);

async function summarize(system: string, user: string): Promise<string[]> {
  const raw = await complete(system, user);
  const bullets = parseBullets(raw);
  const kept = bullets.filter((b) => {
    if (numbersAreGrounded(b, user)) return true;
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
  input = stripAccents(input);
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

const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
