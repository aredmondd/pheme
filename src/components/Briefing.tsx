import type { Recap, Section } from "../collect.ts";

export function Briefing({ briefing }: { briefing: Recap["briefing"] }) {
  if (!briefing.nba && !briefing.fantasy && !briefing.news) return null;
  return (
    <section class="mb-10 rounded-2xl p-4 ring-1 ring-red">
      <h2 class="text-xs font-bold uppercase tracking-widest text-red">
        Last night in 30 seconds
      </h2>
      <div class="mt-3 space-y-4">
        {briefing.nba && <Group title="NBA" summary={briefing.nba} />}
        {briefing.news && <Group title="Around the league" summary={briefing.news} />}
        {briefing.fantasy && <Group title="Your fantasy" summary={briefing.fantasy} />}
      </div>
    </section>
  );
}

function Group({ title, summary }: { title: string; summary: Section<string[]> }) {
  return (
    <div>
      <h3 class="mb-1.5 text-sm font-bold">{title}</h3>
      {summary.ok ? (
        <ul class="space-y-1.5 text-sm leading-snug">
          {summary.data.map((b) => (
            <li key={b} class="flex gap-2">
              <span class="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p class="text-sm text-zinc-500">Summary unavailable ({summary.error}).</p>
      )}
    </div>
  );
}
