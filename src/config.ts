export const TIMEZONE = "America/New_York";

/** Where the static site is written. Override with OUT_DIR. */
export const OUT_DIR = process.env.OUT_DIR ?? "out";
/** Where run state (last run time) lives. Override with DATA_DIR. */
export const DATA_DIR = process.env.DATA_DIR ?? "data";

/** If there's no record of a previous run, look back this far. */
export const FIRST_RUN_LOOKBACK_HOURS = 24;

export type Channel = {
  name: string;
  handle: string;
  channelId: string;
  /** Feed this channel's video titles into the "Around the league" AI summary. */
  news?: boolean;
};

/** Creators whose full uploads (no Shorts) appear on the page. */
export const CHANNELS: Channel[] = [
  { name: "Chaz NBA", handle: "@ChazNBA", channelId: "UChgDp_uE5PVqnpdV05xKOOA", news: true },
  { name: "Chris PG-1", handle: "@Chrispg1", channelId: "UCXy9KvLa5VyndfpX7zsgeAQ" },
];

export const NBA_CHANNEL_ID = "UCWJ2lWNubArHWmf3FIHbfcQ";

/**
 * NBA's "Nightly Full Game Highlights" playlist. This changes every season
 * (and possibly for playoffs) — find the new one on youtube.com/@NBA/playlists.
 * If it's stale, highlights fall back to NBA long-form uploads, then a search link.
 */
export const NBA_HIGHLIGHTS_PLAYLIST_ID = "PLftRqjkDhxkg"; // 2026-27 season

/** ESPN Fantasy league (must be set to "viewable to public" in league settings). */
export const ESPN_LEAGUE_ID = "634038353";
export const MY_FANTASY_TEAM = "Red's Rockets";
