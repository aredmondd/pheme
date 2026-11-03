import {
  CHANNELS,
  NBA_CHANNEL_ID,
  NBA_HIGHLIGHTS_PLAYLIST_ID,
  type Channel,
} from "./config.ts";
import { previousEtDateKey } from "./dates.ts";
import { findHighlight, type HighlightLink } from "./highlights.ts";
import { fetchScoreboard, type Game } from "./sources/espn.ts";
import { fetchLongFormUploads, fetchPlaylistFeed, type Video } from "./sources/youtube.ts";

/** A page section that either loaded or failed — failures render as a warning, not a crash. */
export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export type GameWithHighlight = Game & { highlight: HighlightLink };
export type ChannelVideos = { channel: Channel; videos: Section<Video[]> };

export type Recap = {
  generatedAt: Date;
  windowStart: Date;
  gamesDateKey: string; // ET date of "last night"
  channels: ChannelVideos[];
  games: Section<GameWithHighlight[]>;
};

async function section<T>(fn: () => Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[section failed] ${error}`);
    return { ok: false, error };
  }
}

export async function collect(now: Date, windowStart: Date): Promise<Recap> {
  const gamesDateKey = previousEtDateKey(now);

  const channelsP = Promise.all(
    CHANNELS.map(async (channel) => ({
      channel,
      videos: await section(async () =>
        (await fetchLongFormUploads(channel.channelId))
          .filter((v) => v.published > windowStart && v.published <= now)
          .sort((a, b) => b.published.getTime() - a.published.getTime()),
      ),
    })),
  );

  const gamesP = section(async () => {
    const games = await fetchScoreboard(gamesDateKey.replaceAll("-", ""));
    // Highlight sources are best-effort: a failure here just means search links.
    const candidates = (
      await Promise.allSettled([
        fetchPlaylistFeed(NBA_HIGHLIGHTS_PLAYLIST_ID),
        fetchLongFormUploads(NBA_CHANNEL_ID),
      ])
    ).flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    return games.map((g) => ({ ...g, highlight: findHighlight(g, gamesDateKey, candidates) }));
  });

  return {
    generatedAt: now,
    windowStart,
    gamesDateKey,
    channels: await channelsP,
    games: await gamesP,
  };
}
