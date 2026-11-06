/** What the AI summary needs from ESPN's game summary beyond the scoreboard. */
export type GameRecap = {
  /** AP headline plus its opening paragraphs; null if ESPN has no article yet. */
  ap: string | null;
  /** Each team's largest lead (keyed by team abbreviation), for spotting comebacks. */
  largestLead: Map<string, number>;
};

const AP_PARAGRAPHS = 3;

export async function fetchGameRecap(gameId: string): Promise<GameRecap> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`,
  );
  if (!res.ok) throw new Error(`ESPN game summary ${gameId}: HTTP ${res.status}`);
  const data: any = await res.json();

  const largestLead = new Map<string, number>();
  for (const t of data.boxscore?.teams ?? []) {
    const lead = t.statistics?.find((s: any) => s.label === "Largest Lead")?.displayValue;
    if (lead !== undefined) largestLead.set(t.team.abbreviation, Number(lead) || 0);
  }
  return { ap: apText(data.article), largestLead };
}

function apText(article: any): string | null {
  if (!article?.story) return null;
  const paras = String(article.story)
    .replace(/<[^>]+>/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const end = paras.findIndex((p) => /^Up next/i.test(p));
  const body = (end === -1 ? paras : paras.slice(0, end)).slice(0, AP_PARAGRAPHS);
  return [article.headline, ...body].filter(Boolean).join(" ");
}
