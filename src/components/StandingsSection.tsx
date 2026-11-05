import type { Standings, StandingsTeam } from "../sources/espnStandings.ts";

function Conference({ title, teams }: { title: string; teams: StandingsTeam[] }) {
  return (
    <section class="text-black">
      <h3 class="inline bg-green px-1 font-mono uppercase">{title}</h3>
      <table class="my-4 w-full">
        <tbody>
          {teams.map((t) => (
            <tr key={t.abbreviation} class="py-4">
              <td class="text-center font-mono text-sm text-black/50">{t.seed}</td>
              <td>
                <img class="ml-2" src={t.logo} alt="" width={24} height={24} />
              </td>
              <td class="text-lg">{t.name}</td>
              <td class="text-right font-mono text-black">[{t.record}]</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function StandingsSection({ s }: { s: Standings }) {
  return (
    <div class="border-4 border-red p-4">
      <Conference title="East" teams={s.east} />
      <Conference title="West" teams={s.west} />
    </div>
  );
}
