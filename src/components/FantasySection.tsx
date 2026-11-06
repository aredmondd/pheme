import type { ComponentChildren } from "preact";
import type { FantasyRecap } from "../collect.ts";
import type { Matchup, RosterPlayer } from "../sources/espnFantasy.ts";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function FantasySection({ f }: { f: FantasyRecap }) {
  const played = f.myPlayers.filter((p) => p.slot === "starter" && p.points !== null);
  const injured = f.myPlayers.filter((p) => p.injuryStatus !== "ACTIVE");

  return (
    <div>
      {f.myMatchup && <MyMatchup m={f.myMatchup} meId={f.me.id} week={f.matchupPeriodId} />}

      {f.injuryChanges.length > 0 && (
        <div class="border-b-4 border-red p-4">
          <p class="inline bg-red px-2 text-center font-mono text-lg text-black uppercase">
            Injury updates
          </p>
          <ul class="mt-1 space-y-0.5">
            {f.injuryChanges.map((c) => (
              <li key={c.name} class="text-black/75">
                {c.name}: {status(c.from)} → <span class="font-semibold">{status(c.to)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div class="border-b-4 border-red py-4">
        <div class="mb-4 flex flex-col items-center">
          <p class="inline bg-red px-2 text-center font-mono text-lg text-black">LAST NIGHT</p>
        </div>
        <div>
          {f.myPlayers.map((p) => (
            <PlayerRow key={p.id} p={p} />
          ))}
        </div>
      </div>

      {f.opponentTop.length > 0 && (
        <div class="border-b-4 border-red py-4">
          <div class="mb-4 flex items-center justify-center">
            <p class="inline bg-red px-2 font-mono text-lg text-black">OPPONENT'S BEST</p>
          </div>
          {f.opponentTop.map((p) => (
            <PlayerRow key={p.id} p={p} />
          ))}
        </div>
      )}

      <div class="mb-4 flex items-center justify-center pt-4">
        <p class="inline bg-red px-2 font-mono text-lg text-black">TOP PERFORMERS</p>
      </div>
      <ol class="border-b-4 border-red pb-4">
        {f.topPerformers.map((p, i) => {
          const mine = p.fantasyTeam?.id === f.me.id;
          return (
            <li key={p.id} class={`flex items-center gap-4 px-3 py-2 ${mine ? "bg-green" : ""}`}>
              <span class="w-4 text-center font-mono text-sm font-bold text-black">#{i + 1}</span>
              <Headshot src={p.headshot} />
              <div class="min-w-0 flex-1 text-black">
                <p class="truncate text-sm font-bold">{p.name}</p>
                <p class="font-mono text-xs text-black/33">
                  {p.proTeam} / {p.fantasyTeam ? p.fantasyTeam.name : "Free agent"}
                </p>
              </div>
              <span class="font-mono font-bold text-black">{fmt(p.points)}</span>
            </li>
          );
        })}
      </ol>

      <div class="mb-4 flex items-center justify-center pt-4">
        <p class="inline bg-red px-2 font-mono text-lg text-black">AROUND THE LEAGUE</p>
      </div>
      {f.otherMatchups.length > 0 && (
        <div class="flex flex-col gap-2 border-b-4 border-red p-4 text-black">
          {f.otherMatchups.map((m) => (
            <div key={`${m.away.team.id}-${m.home.team.id}`} class={`flex justify-between`}>
              {[m.away, m.home].map((s) => {
                const home = s === m.home;
                const leading = s.points > (s === m.away ? m.home.points : m.away.points);
                return (
                  <div
                    key={s.team.id}
                    class={`flex flex-col justify-between ${home ? "text-right" : ""} ${leading ? "font-semibold" : "text-black/50"}`}
                  >
                    <span class="truncate text-sm">{s.team.name}</span>
                    <span class="font-mono text-3xl">{fmt(s.points)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div class="mb-4 flex items-center justify-center pt-4">
        <p class="inline bg-red px-2 font-mono text-lg text-black">LEAGUE STANDINGS</p>
      </div>
      <table class={`w-full p-0 text-black`}>
        <tbody>
          {f.standings.map((t, i) => (
            <tr key={t.id} class={t.id === f.me.id ? "bg-green" : ""}>
              <td class="text-md px-3 py-2 font-mono font-bold">#{i + 1}</td>
              <td class="w-full max-w-0 truncate py-2 text-black">{t.name}</td>
              <td class="py-2 pl-3 text-right font-mono font-bold whitespace-nowrap">
                {t.wins}-{t.losses}
                {t.ties ? `-${t.ties}` : ""}
              </td>
              <td class="px-3 py-2 text-right font-mono whitespace-nowrap text-black/50">
                {fmt(t.pointsFor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyMatchup({ m, meId, week }: { m: Matchup; meId: number; week: number }) {
  const [me, opp] = m.away.team.id === meId ? [m.away, m.home] : [m.home, m.away];
  const diff = me.points - opp.points;
  return (
    <div class="border-b-4 border-red p-4">
      <div class="flex items-end justify-between">
        <p class="inline bg-red px-2 font-mono text-black">WEEK {week}</p>
        <p class={`px-2 font-mono font-medium text-black ${diff >= 0 ? "bg-green" : "bg-red"}`}>
          {diff === 0 ? "Tied" : diff > 0 ? `+${fmt(diff)}` : `-${fmt(-diff)}`}
        </p>
      </div>
      <div class="mt-2 flex items-center justify-between gap-4">
        <Side name={me.team.name} points={me.points} lead={diff > 0} />
        <span class="text-sm text-black/20">vs</span>
        <Side name={opp.team.name} points={opp.points} lead={diff < 0} right />
      </div>
    </div>
  );
}

function Side(props: { name: string; points: number; lead: boolean; right?: boolean }) {
  return (
    <div class={`min-w-0 flex-1 ${props.right ? "text-right" : ""}`}>
      <p class="truncate text-sm text-black/50">{props.name}</p>
      <p class={`font-mono text-3xl text-black ${props.lead ? "font-bold" : "text-black/20"}`}>
        {fmt(props.points)}
      </p>
    </div>
  );
}

function PlayerRow({ p }: { p: RosterPlayer }) {
  const dim = p.slot !== "starter" || p.points === null;
  return (
    <div class={`flex items-center gap-3 px-3 py-2 ${dim ? "opacity-60 grayscale" : ""}`}>
      <Headshot src={p.headshot} />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-bold text-black">
          {p.name}
          {p.injuryStatus !== "ACTIVE" && (
            <span class="ml-1.5 bg-red px-1 font-mono text-xs text-black">
              {statusShort(p.injuryStatus)}
            </span>
          )}
        </p>
        <p class="font-mono text-xs text-black/33">
          {p.proTeam}
          {p.slot === "bench" && " / Bench"}
          {p.slot === "ir" && " / IR"}
        </p>
      </div>
      <span class="bg-blue px-1 font-mono text-sm font-bold text-black">
        {p.points !== null ? (
          fmt(p.points)
        ) : p.hadGame ? (
          "DNP"
        ) : (
          <span class="text-xs text-black">DNP</span>
        )}
      </span>
    </div>
  );
}

function Callout(props: { label: string; player: RosterPlayer; tone: "good" | "bad" }) {
  const tone =
    props.tone === "good"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900"
      : "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800";
  return (
    <div class={`rounded-lg px-3 py-2 ring-1 ${tone}`}>
      <p class="font-semibold tracking-wide uppercase opacity-70">{props.label}</p>
      <p class="truncate text-sm font-semibold">
        {props.player.name} · {fmt(props.player.points ?? 0)}
      </p>
    </div>
  );
}

function Headshot({ src }: { src: string }) {
  return (
    <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <img src={src} alt="" loading="lazy" class="h-full w-full object-cover" />
    </div>
  );
}

const status = (s: string) =>
  s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
const statusShort = (s: string) =>
  ({
    OUT: "OUT",
    DAY_TO_DAY: "DTD",
    SUSPENSION: "SUSP",
  })[s] ?? s;
