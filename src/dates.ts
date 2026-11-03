import { TIMEZONE } from "./config.ts";

/** YYYY-MM-DD for the given instant, in US/Eastern. */
export function etDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
}

/** The ET calendar day before `d`, as YYYY-MM-DD. ("Last night" relative to a morning run.) */
export function previousEtDateKey(d: Date): string {
  const [y, m, day] = etDateKey(d).split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, day - 1));
  return prev.toISOString().slice(0, 10);
}

/** Format a YYYY-MM-DD key with Intl options (key is treated as a calendar date, not an instant). */
export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function formatTimeEt(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
