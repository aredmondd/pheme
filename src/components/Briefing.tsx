import type { Recap, Section } from "../collect.ts";
import { Warning } from "./Notice.tsx";

export function Briefing({ briefing }: { briefing: Recap["briefing"] }) {
  if (!briefing.nba && !briefing.fantasy && !briefing.news) return null;
  return (
    <>
      <h2 class="bg-blue p-2 text-center font-mono text-2xl text-black">AI SUMMARY</h2>
      <section class="mb-10 border-4 border-blue p-4">
        <div class="flex flex-col gap-8">
          {briefing.nba && <Group title="HIGHLIGHTS" summary={briefing.nba} />}
          {briefing.news && <Group title="LEAGUE" summary={briefing.news} />}
          {briefing.fantasy && <Group title="FANTASY" summary={briefing.fantasy} />}
        </div>
      </section>
    </>
  );
}

function Group({ title, summary }: { title: string; summary: Section<string[]> }) {
  if (!summary.ok) {
    return (
      <Warning>
        {title} summary: {summary.error}
      </Warning>
    );
  }
  return (
    <div class="grid items-start gap-4 md:grid-cols-5">
      <h3 class="bg-blue px-1 text-center font-mono text-black/75">{title}</h3>
      <ul class="col-span-4 mt-[-3px] flex flex-col gap-4 text-sm leading-snug">
        {summary.data.map((b) => (
          <li key={b}>
            <span class="text-black/75">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
