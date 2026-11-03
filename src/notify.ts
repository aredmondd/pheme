import type { Recap } from "./collect.ts";
import { etDateKey, formatDateKey } from "./dates.ts";

/**
 * Push a "your recap is ready" notification via ntfy. Tapping it opens SITE_URL.
 * Env: NTFY_TOPIC (required), SITE_URL (optional: no tap-to-open without it), NTFY_SERVER (default https://ntfy.sh).
 * Deliberately spoiler-free: counts only, no NBA scores.
 */
export async function sendNotification(recap: Recap): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  const siteUrl = process.env.SITE_URL;
  if (!topic) {
    console.warn("Skipping notification: NTFY_TOPIC not set.");
    return;
  }

  const day = formatDateKey(etDateKey(recap.generatedAt), { weekday: "short", month: "short", day: "numeric" });
  const res = await fetch(process.env.NTFY_SERVER ?? "https://ntfy.sh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      title: `NBA Catchup · ${day}`,
      message: summaryLine(recap),
      ...(siteUrl ? { click: siteUrl } : {}),
      tags: ["basketball"],
    }),
  });
  if (!res.ok) throw new Error(`ntfy: HTTP ${res.status} ${await res.text()}`);
  console.log("Notification sent.");
}

function summaryLine(recap: Recap): string {
  const parts: string[] = [];

  if (recap.games.ok) {
    const n = recap.games.data.length;
    parts.push(n === 0 ? "No games last night" : `${n} game${n === 1 ? "" : "s"}`);
  }

  const videos = recap.channels.reduce((sum, c) => sum + (c.videos.ok ? c.videos.data.length : 0), 0);
  parts.push(`${videos} new video${videos === 1 ? "" : "s"}`);

  if (recap.fantasy.ok && recap.fantasy.data.myMatchup) {
    const { myMatchup: m, me } = recap.fantasy.data;
    const [mine, theirs] = m.away.team.id === me.id ? [m.away, m.home] : [m.home, m.away];
    const diff = Math.round(mine.points - theirs.points);
    parts.push(diff === 0 ? "fantasy tied" : diff > 0 ? `fantasy up ${diff}` : `fantasy down ${-diff}`);
  }

  const failed = [
    ...recap.channels.filter((c) => !c.videos.ok).map((c) => c.channel.name),
    ...(recap.games.ok ? [] : ["scores"]),
    ...(recap.fantasy.ok ? [] : ["fantasy"]),
  ];
  let line = parts.join(" · ");
  if (failed.length) line += `\n⚠️ Couldn't load: ${failed.join(", ")}`;
  return line;
}
