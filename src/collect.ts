import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CHANNELS,
  DATA_DIR,
  ESPN_LEAGUE_ID,
  MY_FANTASY_TEAM,
  NBA_CHANNEL_ID,
  NBA_HIGHLIGHTS_PLAYLIST_ID,
  type Channel,
} from "./config.ts";
import { etDateKey, previousEtDateKey } from "./util/dates.ts";
import { fetchFantasy, type Fantasy } from "./sources/espnFantasy.ts";
import { findHighlight, type HighlightLink } from "./highlights.ts";
import { fetchScoreboard, type Game } from "./sources/espn.ts";
import { fetchGameRecap, type GameRecap } from "./sources/espnRecap.ts";
import { fetchStandings, type Standings } from "./sources/espnStandings.ts";
import { fantasyPrompt, nbaPrompt, summarizeFantasy, summarizeNba } from "./summaries.ts";
import { fetchLongFormUploads, fetchPlaylistVideos, type Video } from "./sources/youtube.ts";
import { timed } from "./util/timing.ts";

/** A page section that either loaded or failed — failures render as a warning, not a crash. */
export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export type GameWithHighlight = Game & { highlight: HighlightLink };
export type ChannelVideos = { channel: Channel; videos: Section<Video[]> };

export type InjuryChange = { name: string; from: string; to: string };
export type FantasyRecap = Fantasy & { injuryChanges: InjuryChange[] };

export type Recap = {
  generatedAt: Date;
  windowStart: Date;
  gamesDateKey: string; // ET date of "last night"
  channels: ChannelVideos[];
  games: Section<GameWithHighlight[]>;
  fantasy: Section<FantasyRecap>;
  /** Optional: days saved before standings existed don't have it. */
  standings?: Section<Standings>;
  /** AI summaries; null = nothing to summarize (no games or news videos / no fantasy data). */
  briefing: {
    /** Last night: games plus news-channel video titles. */
    nba: Section<string[]> | null;
    fantasy: Section<string[]> | null;
    /** Only on days saved before news was folded into `nba`. */
    news?: Section<string[]> | null;
  };
};

async function section<T>(label: string, fn: () => Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, data: await timed(label, fn) };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[section failed] ${label}: ${error}`);
    return { ok: false, error };
  }
}

export async function collect(now: Date, windowStart: Date): Promise<Recap> {
  const gamesDateKey = previousEtDateKey(now);

  const channelsP = Promise.all(
    CHANNELS.map(async (channel) => ({
      channel,
      videos: await section(`videos: ${channel.name}`, async () =>
        (await fetchLongFormUploads(channel.channelId))
          .filter((v) => v.published > windowStart && v.published <= now)
          .sort((a, b) => b.published.getTime() - a.published.getTime()),
      ),
    })),
  );

  const gamesP = section("games (total)", async () => {
    const games = await timed("games: ESPN scoreboard", () =>
      fetchScoreboard(gamesDateKey.replaceAll("-", "")),
    );
    // Highlight sources are best-effort: a failure here just means search links.
    const candidates = (
      await Promise.allSettled([
        timed("games: highlights playlist", () => fetchPlaylistVideos(NBA_HIGHLIGHTS_PLAYLIST_ID)),
        timed("games: NBA channel uploads", () => fetchLongFormUploads(NBA_CHANNEL_ID)),
      ])
    ).flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    return games.map((g) => ({ ...g, highlight: findHighlight(g, gamesDateKey, candidates) }));
  });

  const fantasyP = section("fantasy: ESPN", async () => {
    const fantasy = await fetchFantasy({
      leagueId: ESPN_LEAGUE_ID,
      myTeamName: MY_FANTASY_TEAM,
      gamesDateKey,
    });
    return { ...fantasy, injuryChanges: await injuryChanges(fantasy, etDateKey(now)) };
  });

  const standingsP = section("standings: ESPN", fetchStandings);

  const [channels, games, fantasy, standings] = await timed("fetch phase (parallel)", () =>
    Promise.all([channelsP, gamesP, fantasyP, standingsP]),
  );

  const finished = games.ok ? games.data.filter((g) => g.completed) : [];
  const newsVideos = channels
    .filter((c) => c.channel.news && c.videos.ok)
    .flatMap((c) => (c.videos.ok ? c.videos.data : []));

  const [nbaBriefing, fantasyBriefing] = await timed("summary phase (parallel)", () =>
    Promise.all([
      finished.length || newsVideos.length
        ? section("briefing: NBA (total)", async () => {
            // Recaps are best-effort: a missing one just means less detail for that game.
            const recaps = new Map<string, GameRecap>();
            await timed(`briefing: ${finished.length} game recaps`, () =>
              Promise.all(
                finished.map((g) =>
                  fetchGameRecap(g.id).then(
                    (r) => recaps.set(g.id, r),
                    (err) => console.warn(`Game recap ${g.id}: ${err.message}`),
                  ),
                ),
              ),
            );
            return timed("briefing: NBA Groq", () =>
              summarizeNba(nbaPrompt(gamesDateKey, finished, recaps, newsVideos)),
            );
          })
        : null,
      fantasy.ok
        ? section("briefing: fantasy Groq", () =>
            summarizeFantasy(fantasyPrompt(fantasy.data), fantasy.data.me.name),
          )
        : null,
    ]),
  );

  return {
    generatedAt: now,
    windowStart,
    gamesDateKey,
    channels,
    games,
    fantasy,
    standings,
    briefing: { nba: nbaBriefing, fantasy: fantasyBriefing },
  };
}

/** Compare my roster's injury statuses to the most recent earlier saved day. */
async function injuryChanges(fantasy: Fantasy, todayKey: string): Promise<InjuryChange[]> {
  let previous: Recap | null = null;
  try {
    const dir = join(DATA_DIR, "days");
    const files = (await readdir(dir))
      .filter((f) => f.endsWith(".json") && f < `${todayKey}.json`)
      .sort();
    if (files.length) previous = JSON.parse(await readFile(join(dir, files.at(-1)!), "utf8"));
  } catch {
    return [];
  }
  if (!previous?.fantasy?.ok) return [];
  const before = new Map(previous.fantasy.data.myPlayers.map((p) => [p.id, p.injuryStatus]));
  return fantasy.myPlayers.flatMap((p) => {
    const from = before.get(p.id);
    return from && from !== p.injuryStatus ? [{ name: p.name, from, to: p.injuryStatus }] : [];
  });
}
