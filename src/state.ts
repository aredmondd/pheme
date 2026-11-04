import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DATA_DIR } from "./config.ts";

const STATE_FILE = join(DATA_DIR, "state.json");

type State = { lastRunAt: string };

export async function readLastRunAt(): Promise<Date | null> {
  try {
    const state: State = JSON.parse(await readFile(STATE_FILE, "utf8"));
    return new Date(state.lastRunAt);
  } catch {
    return null;
  }
}

export async function writeLastRunAt(d: Date): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    STATE_FILE,
    JSON.stringify({ lastRunAt: d.toISOString() } satisfies State, null, 2),
  );
}
