/**
 * Smoke test for the YouTube Data API sources — hits every playlist the daily
 * run uses and prints what came back. No LLM calls, nothing written to disk.
 *
 *   npm run check:youtube
 */
import { CHANNELS, NBA_CHANNEL_ID, NBA_HIGHLIGHTS_PLAYLIST_ID } from "./config.ts";
import { fetchLongFormUploads, fetchPlaylistVideos, type Video } from "./sources/youtube.ts";

try {
  process.loadEnvFile();
} catch {}

const checks: [string, () => Promise<Video[]>][] = [
  ...CHANNELS.map((c): [string, () => Promise<Video[]>] => [
    c.name,
    () => fetchLongFormUploads(c.channelId),
  ]),
  ["NBA long-form", () => fetchLongFormUploads(NBA_CHANNEL_ID)],
  ["NBA highlights playlist", () => fetchPlaylistVideos(NBA_HIGHLIGHTS_PLAYLIST_ID)],
];

const dayAgo = Date.now() - 24 * 3_600_000;
let failed = false;
for (const [name, fn] of checks) {
  try {
    const videos = await fn();
    const recent = videos.filter((v) => v.published.getTime() > dayAgo);
    console.log(`OK   ${name}: ${videos.length} videos, ${recent.length} in the last 24h`);
    for (const v of videos.slice(0, 3)) {
      console.log(`       ${v.published.toISOString()}  ${v.title}`);
    }
  } catch (err) {
    failed = true;
    console.log(`FAIL ${name}: ${err instanceof Error ? err.message : err}`);
  }
}
process.exitCode = failed ? 1 : 0;
