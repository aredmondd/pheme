import type { Game } from "./sources/espn.ts";
import type { Video } from "./sources/youtube.ts";
import { formatDateKey } from "./dates.ts";

export type HighlightLink = { kind: "video"; video: Video } | { kind: "search"; url: string };

/**
 * NBA full-game highlight titles look like:
 *   "TRAIL BLAZERS at NUGGETS | FULL GAME HIGHLIGHTS | November 2, 2026"
 *   "#2 SPURS at #3 KNICKS | NBA FINALS GAME 4 HIGHLIGHTS | June 10, 2026"
 * Match on both team names + "HIGHLIGHTS" + the game date.
 */
export function findHighlight(game: Game, gameDateKey: string, candidates: Video[]): HighlightLink {
  const away = game.away.name.toUpperCase();
  const home = game.home.name.toUpperCase();
  const dateText = formatDateKey(gameDateKey, { month: "long", day: "numeric", year: "numeric" });

  const match = candidates.find((v) => {
    const t = v.title.toUpperCase().replace(/#\d+\s+/g, ""); // drop playoff seeds
    return (
      t.includes(`${away} AT ${home}`) &&
      t.includes("HIGHLIGHTS") &&
      !t.startsWith("EXTENDED") &&
      v.title.includes(dateText)
    );
  });
  if (match) return { kind: "video", video: match };

  const q = `${game.away.name} at ${game.home.name} full game highlights ${dateText}`;
  return {
    kind: "search",
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  };
}
