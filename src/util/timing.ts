/** Build-step timing logs: `[time] ESPN scoreboard  1.23s ✓`. */

const started = performance.now();

function fmt(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export function logTime(label: string, ms: number, ok = true): void {
  console.log(`[time] ${label.padEnd(28)} ${fmt(ms).padStart(7)} ${ok ? "✓" : "✗"}`);
}

/** Run `fn`, log how long it took and whether it threw (errors are rethrown). */
export async function timed<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  const t0 = performance.now();
  try {
    const result = await fn();
    logTime(label, performance.now() - t0);
    return result;
  } catch (err) {
    logTime(label, performance.now() - t0, false);
    throw err;
  }
}

/** Log time since the process started loading this module. */
export function logTotal(label = "total"): void {
  logTime(label, performance.now() - started);
}
