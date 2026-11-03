/**
 * Builds the recap site.
 *
 *   tsx src/build.tsx               preview build: window = since last saved run (or 24h); state untouched
 *   tsx src/build.tsx --save-state  the daily run: also records this run as the new window start
 *   --notify                        send the ntfy push (needs NTFY_TOPIC + SITE_URL)
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";

// Load .env if present (systemd also passes it via EnvironmentFile; real env vars win).
try {
  process.loadEnvFile();
} catch {}

import { join } from "node:path";
import { renderToString } from "preact-render-to-string";
import { collect } from "./collect.ts";
import { DATA_DIR, FIRST_RUN_LOOKBACK_HOURS, OUT_DIR } from "./config.ts";
import { etDateKey } from "./dates.ts";
import { Page } from "./components/Page.tsx";
import { sendNotification } from "./notify.ts";
import { readLastRunAt, writeLastRunAt } from "./state.ts";

const saveState = process.argv.includes("--save-state");
const notify = process.argv.includes("--notify");

const now = new Date();
const windowStart =
  (await readLastRunAt()) ?? new Date(now.getTime() - FIRST_RUN_LOOKBACK_HOURS * 3_600_000);

console.log(`Collecting videos since ${windowStart.toISOString()}…`);
const recap = await collect(now, windowStart);

const todayKey = etDateKey(now);
const archive = await listArchive(todayKey);
const html = "<!doctype html>" + renderToString(<Page recap={recap} archive={archive} />);

await mkdir(join(OUT_DIR, todayKey), { recursive: true });
await writeFile(join(OUT_DIR, "index.html"), html);
await writeFile(join(OUT_DIR, todayKey, "index.html"), html);

// Keep the raw data per day — useful later for the AI overview / debugging.
await mkdir(join(DATA_DIR, "days"), { recursive: true });
await writeFile(join(DATA_DIR, "days", `${todayKey}.json`), JSON.stringify(recap, null, 2));

const videosOk = recap.channels.every((c) => c.videos.ok);
if (saveState) {
  // If a channel failed, keep the old window so tomorrow picks up what we missed.
  if (videosOk) await writeLastRunAt(now);
  else console.warn("A video feed failed — not advancing the window.");
}

const summary = recap.channels
  .map((c) => `${c.channel.name}: ${c.videos.ok ? c.videos.data.length : "FAILED"}`)
  .join(", ");
console.log(
  `Wrote ${OUT_DIR}/index.html (${todayKey}) — ${summary}; games: ${
    recap.games.ok ? recap.games.data.length : "FAILED"
  }`,
);

if (notify) {
  // A failed push shouldn't fail the run — the page is already written.
  await sendNotification(recap).catch((err) => console.error(`Notification failed: ${err.message}`));
}

async function listArchive(excludeKey: string): Promise<string[]> {
  try {
    const entries = await readdir(OUT_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name) && e.name !== excludeKey)
      .map((e) => e.name)
      .sort()
      .reverse()
      .slice(0, 30);
  } catch {
    return [];
  }
}
