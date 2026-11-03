/**
 * The two AI summaries at the top of the page. Prompts are built only from
 * data we already fetched, and every bullet is checked: if it contains a number
 * that isn't in the input, it's dropped (the model got a stat wrong).
 */
import { formatDateKey } from "./dates.ts";
import { complete } from "./llm/groq.ts";
import type { Game } from "./sources/espn.ts";
import type { PlayerLine } from "./sources/espnBox.ts";
import type { Fantasy, RosterPlayer } from "./sources/espnFantasy.ts";

const NBA_SYSTEM = `You write a quick morning NBA recap for a fan who missed last night's games. Use ONLY the data provided. Never invent stats, injuries, storylines, or context.
Rules:
- Only cite a stat that appears on that player's own line. Never combine stats from different players.
- You only know final scores and box score lines. Never describe how a game unfolded (comebacks, late runs, clutch shots, game-winners).
- Use players' full names as given and full team names.
Write 5–8 bullets, most interesting first: big individual performances, close games and overtime, blowouts. One sentence per bullet, plain and punchy, no hashtags or emoji. Don't cover every game. Output only the bullets, each starting with "- ".`;

const FANTASY_SYSTEM = `You write a short morning fantasy basketball recap for the manager of the team named in the data. Address them as "you". Use ONLY the data provided: never invent stats, trends, projections, injuries, or advice. Only cite a number exactly as it appears on that player's or team's own line. Only use words like "league-high", "best", "worst", or "top" when the data's ranking directly shows it. Players marked BENCH or IR scored points that did not count toward the matchup. Write 3–5 bullets: first where the matchup stands, then the standout and the dud from their roster, then anything notable from the opponent or the rest of the league (for example a top-5 scorer who is a free agent). One sentence per bullet, plain and conversational, no emoji. Output only the bullets, each starting with "- ".`;

const NEWS_SYSTEM = `You write the "around the league" part of a morning NBA recap, built only from the titles of videos a YouTuber posted in the last day. Titles are hype-y and full of slang and emoji; translate them into plain, neutral sentences. Use ONLY what the titles say: never add stats, scores, causes, outcomes, or context a title doesn't state.
Order bullets by importance, strictly in these tiers: (1) real news: injuries, trades, signings, suspensions, and team or league announcements such as jersey retirements or awards; (2) ejections, fights, and beef; (3) memorable moments and reactions. Every tier-1 item comes before any tier-2 item. Several titles about the same moment are one bullet. Skip titles that don't say what happened.
Write 2–5 bullets, fewer when there's little of note. One sentence per bullet, plain and punchy, no emoji, no profanity. Use players' names as given. Output only the bullets, each starting with "- ".`;

export function newsPrompt(videos: { title: string }[]): string {
  return `Video titles from the last day, newest first:\n\n${videos.map((v) => `- ${v.title}`).join("\n")}`;
}

export function nbaPrompt(
  gamesDateKey: string,
  games: Game[],
  boxes: Map<string, Map<string, PlayerLine[]>>,
): string {
  const day = formatDateKey(gamesDateKey, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const player = (p: PlayerLine) =>
    `${p.name} ${p.points} PTS, ${p.rebounds} REB, ${p.assists} AST${p.threes ? `, ${p.threes} 3PM` : ""}`;
  const lines = games
    .filter((g) => g.completed && g.away.score !== null && g.home.score !== null)
    .map((g) => {
      const margin = Math.abs(g.away.score! - g.home.score!);
      const box = boxes.get(g.id);
      const team = (t: Game["away"]) =>
        box?.get(t.abbreviation)?.length ? `\n  ${t.displayName}: ${box.get(t.abbreviation)!.map(player).join("; ")}` : "";
      return `${g.away.displayName} ${g.away.score} at ${g.home.displayName} ${g.home.score} (${g.status}, margin ${margin})${team(g.away)}${team(g.home)}`;
    });
  return `NBA games on ${day}. Each game: final score, then each team's top scorers.\n\n${lines.join("\n\n")}`;
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
  const out = [`My team: ${f.me.name} (${rec(f.me)}). League: ${f.leagueName}, H2H points, ${f.standings.length} teams.`];
  if (f.myMatchup) {
    const [mine, opp] = f.myMatchup.away.team.id === f.me.id ? [f.myMatchup.away, f.myMatchup.home] : [f.myMatchup.home, f.myMatchup.away];
    const diff = mine.points - opp.points;
    out.push(
      `Week ${f.matchupPeriodId} matchup so far: ${f.me.name} ${mine.points} vs ${opp.team.name} ${opp.points} (${diff >= 0 ? `leading by ${diff}` : `trailing by ${-diff}`}).`,
    );
  }
  out.push("", "My players last night:", ...f.myPlayers.map(pl));
  if (f.opponentTop.length) out.push("", "Opponent's top starters last night:", ...f.opponentTop.map(pl));
  out.push(
    "",
    "League-wide top 5 fantasy scorers last night (ranked, #1 = highest):",
    ...f.topPerformers.map(
      (p, i) => `#${i + 1} ${p.name} (${p.proTeam}): ${p.points} fpts, rostered by ${p.fantasyTeam?.name ?? "nobody (free agent)"}`,
    ),
  );
  if (f.otherMatchups.length)
    out.push(
      "",
      `Other Week ${f.matchupPeriodId} matchups:`,
      ...f.otherMatchups.map((m) => `- ${m.away.team.name} ${m.away.points} vs ${m.home.team.name} ${m.home.points}`),
    );
  out.push("", "Standings:", ...f.standings.map((t, i) => `${i + 1}. ${t.name} ${rec(t)}, ${t.pointsFor} PF`));
  return out.join("\n");
}

export const summarizeNba = (prompt: string) => summarize(NBA_SYSTEM, prompt);
export const summarizeFantasy = (prompt: string) => summarize(FANTASY_SYSTEM, prompt);
export const summarizeNews = (prompt: string) => summarize(NEWS_SYSTEM, prompt);

async function summarize(system: string, user: string): Promise<string[]> {
  const raw = await complete(system, user);
  const bullets = parseBullets(raw);
  const kept = bullets.filter((b) => numbersAreGrounded(b, user));
  if (kept.length < bullets.length)
    console.warn(`Dropped ${bullets.length - kept.length} summary bullet(s) with numbers not in the data.`);
  if (kept.length === 0) throw new Error("Summary had no usable bullets");
  return kept;
}

export function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 0);
}

const NOT_SUBJECTS = new Set(["League-wide", "PTS", "REB", "AST", "3PM", "BENCH", "IR", "NBA", "Final", "Each", "My"]);

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
    facts.some((f) => f.nums.has(n) && f.subjects.some((s) => new RegExp(`\\b${escape(s)}\\b`, "u").test(bLower))),
  );
}

const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
