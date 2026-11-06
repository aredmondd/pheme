/**
 * Fake recaps for testing how the page handles empty and failed sections. No API calls.
 *
 *   npm run dev -- --fixture=empty    every section loaded, but nothing happened
 *   npm run dev -- --fixture=errors   every section failed
 */
import type { Recap } from "./collect.ts";
import { CHANNELS } from "./config.ts";
import { previousEtDateKey } from "./util/dates.ts";

export const FIXTURES = ["empty", "errors"] as const;
export type FixtureName = (typeof FIXTURES)[number];

export function fixtureRecap(name: FixtureName, now: Date): Recap {
  const base = {
    generatedAt: now,
    windowStart: new Date(now.getTime() - 24 * 3_600_000),
    gamesDateKey: previousEtDateKey(now),
  };

  if (name === "empty") {
    return {
      ...base,
      channels: CHANNELS.map((channel) => ({ channel, videos: { ok: true, data: [] } })),
      games: { ok: true, data: [] },
      // A loaded-but-empty fantasy league isn't representable, so it shows as unavailable.
      fantasy: { ok: false, error: "No fantasy data (fixture)" },
      standings: { ok: true, data: { east: [], west: [] } },
      briefing: { nba: null, fantasy: null, news: null },
    };
  }

  const fail = (what: string) => ({ ok: false as const, error: `${what} failed (fixture)` });
  return {
    ...base,
    channels: CHANNELS.map((channel) => ({ channel, videos: fail(`${channel.name} feed`) })),
    games: fail("Scoreboard"),
    fantasy: fail("ESPN fantasy"),
    standings: fail("ESPN standings"),
    briefing: {
      nba: fail("NBA summary"),
      fantasy: fail("Fantasy summary"),
      news: fail("News summary"),
    },
  };
}
