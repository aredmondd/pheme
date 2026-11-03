import type { Recap, Section } from "../collect.ts";

export function Briefing({ briefing }: { briefing: Recap["briefing"] }) {
  if (!briefing.nba && !briefing.fantasy && !briefing.news) return null;
  return (
    <>
      <h2 class="bg-blue p-1 text-center font-mono text-2xl text-black">AI SUMMARY</h2>
      <section class="mb-10 p-4 border-4 border-blue">
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
  return (
    <div class="grid md:grid-cols-5 items-start gap-4">
      {summary.ok ? (
        <>
          <h3 class="bg-blue font-mono text-center text-black/75 px-1">{title}</h3>
          <ul class="flex flex-col gap-4 text-sm leading-snug col-span-4 mt-[-3px]">
            {summary.data.map((b) => (
              <li key={b}>
                <span class="text-black/75">{b}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p class="text-sm text-red">Summary unavailable ({summary.error}).</p>
      )}
    </div>
  );
}
