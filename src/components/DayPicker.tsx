import { formatDateKey } from "../dates.ts";

/** One entry in /days.json — also what the picker renders at build time. */
export type DayLink = { key: string; href: string; label: string };

/** Day keys (any order, dupes ok) → links, newest first. */
export function dayLinks(keys: string[]): DayLink[] {
  return [...new Set(keys)]
    .sort()
    .reverse()
    .map((key) => ({
      key,
      href: `/${key}/`,
      label: formatDateKey(key, { weekday: "short", month: "short", day: "numeric" }),
    }));
}

/**
 * Pages are frozen snapshots, so the list rendered here goes stale. On load, the script swaps in
 * the current list from /days.json so an old page can still reach newer days.
 */
const script = `(() => {
  const s = document.getElementById("day-picker");
  s.addEventListener("change", () => { location.href = s.value; });
  fetch("/days.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((days) => s.replaceChildren(
      ...days.map((d) => new Option(d.label, d.href, false, d.key === s.dataset.current)),
    ))
    .catch(() => {});
})();`;

export function DayPicker({ days, current }: { days: DayLink[]; current: string }) {
  return (
    <footer class="mt-12 flex flex-col items-center justify-center gap-3 border-4 border-green p-4">
      <label for="day-picker" class="font-mono text-xl text-black">
        DAYS
      </label>
      <select
        id="day-picker"
        data-current={current}
        class="cursor-pointer border-4 border-black bg-silver px-2 py-1 font-mono text-sm text-black"
      >
        {days.map((d) => (
          <option key={d.key} value={d.href} selected={d.key === current}>
            {d.label}
          </option>
        ))}
      </select>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </footer>
  );
}
