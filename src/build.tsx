/**
 * Builds the recap site.
 *
 *   tsx src/build.tsx               preview build: window = since last saved run (or 24h); state untouched
 *   tsx src/build.tsx --save-state  the daily run: also records this run as the new window start
 *   --notify                        send the ntfy push (needs NTFY_TOPIC + SITE_URL)
 */
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";

// Load .env if present (systemd also passes it via EnvironmentFile; real env vars win).
try {
  process.loadEnvFile();
} catch {}

import { join } from "node:path";
import { renderToString } from "preact-render-to-string";
import { collect, type Recap } from "./collect.ts";
import { DATA_DIR, FIRST_RUN_LOOKBACK_HOURS, OUT_DIR } from "./config.ts";
import { etDateKey } from "./dates.ts";
import { dayLinks } from "./components/DayPicker.tsx";
import { Page } from "./components/Page.tsx";
import { FIXTURES, fixtureRecap, type FixtureName } from "./fixtures.ts";
import { sendNotification } from "./notify.ts";
import { readLastRunAt, writeLastRunAt } from "./state.ts";

const fixture = process.argv.find((a) => a.startsWith("--fixture="))?.slice("--fixture=".length);
if (fixture && !(FIXTURES as readonly string[]).includes(fixture)) {
  throw new Error(`Unknown fixture "${fixture}" — use one of: ${FIXTURES.join(", ")}`);
}
// Fixtures behave like --cached: no API calls, no saved data, no state, no push.
const cached = process.argv.includes("--cached") || !!fixture;
const saveState = process.argv.includes("--save-state") && !cached;
const notify = process.argv.includes("--notify") && !cached;

const now = new Date();
let recap: Recap;
if (fixture) {
  console.log(`Using fixture "${fixture}" (no API calls)`);
  recap = fixtureRecap(fixture as FixtureName, now);
} else if (cached) {
  recap = await loadLatestRecap();
} else {
  const windowStart =
    (await readLastRunAt()) ?? new Date(now.getTime() - FIRST_RUN_LOOKBACK_HOURS * 3_600_000);
  console.log(`Collecting videos since ${windowStart.toISOString()}…`);
  recap = await collect(now, windowStart);
}

const todayKey = cached ? etDateKey(recap.generatedAt) : etDateKey(now);
const days = dayLinks([...(await listDayKeys()), todayKey]);
const html = "<!doctype html>" + renderToString(<Page recap={recap} days={days} />);

await mkdir(join(OUT_DIR, todayKey), { recursive: true });
// Static assets (self-hosted fonts, icons…) are served from the site root: public/fonts/x.woff2 → /fonts/x.woff2
await cp("public", OUT_DIR, { recursive: true, filter: (src) => !src.endsWith(".gitkeep") }).catch(
  (err) => {
    if (err.code !== "ENOENT") throw err;
  },
);
await writeFile(join(OUT_DIR, "index.html"), html);
await writeFile(join(OUT_DIR, todayKey, "index.html"), html);
// Older pages read this on load so their day picker can reach days built after them.
await writeFile(join(OUT_DIR, "days.json"), JSON.stringify(days));

// Keep the raw data per day — useful later for the AI overview / debugging / --cached dev builds.
if (!cached) {
  await mkdir(join(DATA_DIR, "days"), { recursive: true });
  await writeFile(join(DATA_DIR, "days", `${todayKey}.json`), JSON.stringify(recap, null, 2));
}

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
  await sendNotification(recap).catch((err) =>
    console.error(`Notification failed: ${err.message}`),
  );
}

/** Newest saved recap from data/days, with ISO date strings revived into Dates. */
async function loadLatestRecap(): Promise<Recap> {
  const dir = join(DATA_DIR, "days");
  const files = (await readdir(dir).catch(() => [] as string[]))
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const latest = files.at(-1);
  if (!latest) throw new Error(`No cached recap in ${dir} — run \`npm run build\` once first.`);
  console.log(`Using cached recap ${dir}/${latest} (no API calls)`);
  const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  return JSON.parse(await readFile(join(dir, latest), "utf8"), (_k, v) =>
    typeof v === "string" && isoDate.test(v) ? new Date(v) : v,
  );
}

/** Every day that already has a page in out/ (YYYY-MM-DD directories). */
async function listDayKeys(): Promise<string[]> {
  try {
    const entries = await readdir(OUT_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
      .map((e) => e.name);
  } catch {
    return [];
  }
}
