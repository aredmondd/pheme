import type { ComponentChildren } from "preact";
import type { FantasyRecap } from "../collect.ts";
import type { Matchup, RosterPlayer } from "../sources/espnFantasy.ts";

const card = "rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800";
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function FantasySection({ f }: { f: FantasyRecap }) {
  const played = f.myPlayers.filter((p) => p.slot === "starter" && p.points !== null);
  const best = played[0];
  const worst = played.length > 1 ? played.at(-1) : undefined;
  const injured = f.myPlayers.filter((p) => p.injuryStatus !== "ACTIVE");

  return (
    <div class="space-y-4">
      {f.myMatchup && <MyMatchup m={f.myMatchup} meId={f.me.id} week={f.matchupPeriodId} />}

      {f.injuryChanges.length > 0 && (
        <div class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
          <p class="font-semibold">Injury updates</p>
          <ul class="mt-1 space-y-0.5">
            {f.injuryChanges.map((c) => (
              <li key={c.name}>
                {c.name}: {status(c.from)} → <span class="font-semibold">{status(c.to)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sub title="Your players last night">
        {(best || worst) && (
          <div class="mb-2 grid grid-cols-2 gap-2 text-xs">
            {best && <Callout label="Top" player={best} tone="good" />}
            {worst && <Callout label="Worst" player={worst} tone="bad" />}
          </div>
        )}
        <div class={`${card} divide-y divide-zinc-100 p-0 dark:divide-zinc-800`}>
          {f.myPlayers.map((p) => (
            <PlayerRow key={p.id} p={p} />
          ))}
        </div>
        {injured.length > 0 && (
          <p class="mt-2 text-xs text-zinc-500">
            Not active: {injured.map((p) => `${p.name} (${status(p.injuryStatus)})`).join(", ")}
          </p>
        )}
      </Sub>

      {f.opponentTop.length > 0 && (
        <Sub title="Opponent's best last night">
          <div class={`${card} divide-y divide-zinc-100 p-0 dark:divide-zinc-800`}>
            {f.opponentTop.map((p) => (
              <PlayerRow key={p.id} p={p} />
            ))}
          </div>
        </Sub>
      )}

      <Sub title="League top 5 last night">
        <ol class={`${card} divide-y divide-zinc-100 p-0 dark:divide-zinc-800`}>
          {f.topPerformers.map((p, i) => {
            const mine = p.fantasyTeam?.id === f.me.id;
            return (
              <li key={p.id} class={`flex items-center gap-3 px-3 py-2 ${mine ? "bg-orange-50 dark:bg-orange-950/30" : ""}`}>
                <span class="w-4 text-center text-xs font-bold text-zinc-400">{i + 1}</span>
                <Headshot src={p.headshot} />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{p.name}</p>
                  <p class="text-xs text-zinc-500">
                    {p.proTeam} · {p.fantasyTeam ? p.fantasyTeam.name : "Free agent"}
                  </p>
                </div>
                <span class="text-base font-bold tabular-nums">{fmt(p.points)}</span>
              </li>
            );
          })}
        </ol>
      </Sub>

      {f.otherMatchups.length > 0 && (
        <Sub title={`Other matchups · Week ${f.matchupPeriodId}`}>
          <div class="grid gap-2 sm:grid-cols-2">
            {f.otherMatchups.map((m) => (
              <div key={`${m.away.team.id}-${m.home.team.id}`} class={`${card} space-y-1 text-sm`}>
                {[m.away, m.home].map((s) => {
                  const leading = s.points > (s === m.away ? m.home.points : m.away.points);
                  return (
                    <div key={s.team.id} class={`flex justify-between ${leading ? "font-semibold" : "text-zinc-500"}`}>
                      <span class="truncate">{s.team.name}</span>
                      <span class="tabular-nums">{fmt(s.points)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Sub>
      )}

      <Sub title="Standings">
        <table class={`${card} w-full p-0 text-sm`}>
          <thead class="text-left text-xs text-zinc-500">
            <tr>
              <th class="px-3 py-2 font-medium">#</th>
              <th class="py-2 font-medium">Team</th>
              <th class="py-2 text-right font-medium">W-L</th>
              <th class="px-3 py-2 text-right font-medium">PF</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
            {f.standings.map((t, i) => (
              <tr key={t.id} class={t.id === f.me.id ? "bg-orange-50 font-semibold dark:bg-orange-950/30" : ""}>
                <td class="px-3 py-2 text-zinc-400">{i + 1}</td>
                <td class="max-w-0 truncate py-2">{t.name}</td>
                <td class="py-2 text-right tabular-nums">
                  {t.wins}-{t.losses}
                  {t.ties ? `-${t.ties}` : ""}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">{fmt(t.pointsFor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Sub>
    </div>
  );
}

function MyMatchup({ m, meId, week }: { m: Matchup; meId: number; week: number }) {
  const [me, opp] = m.away.team.id === meId ? [m.away, m.home] : [m.home, m.away];
  const diff = me.points - opp.points;
  return (
    <div class={`${card} p-4`}>
      <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500">Week {week} matchup</p>
      <div class="mt-2 flex items-center justify-between gap-4">
        <Side name={me.team.name} points={me.points} lead={diff > 0} />
        <span class="text-xs text-zinc-400">vs</span>
        <Side name={opp.team.name} points={opp.points} lead={diff < 0} right />
      </div>
      <p class={`mt-2 text-sm font-medium ${diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
        {diff === 0 ? "Tied" : diff > 0 ? `Up ${fmt(diff)}` : `Down ${fmt(-diff)}`}
      </p>
    </div>
  );
}

function Side(props: { name: string; points: number; lead: boolean; right?: boolean }) {
  return (
    <div class={`min-w-0 flex-1 ${props.right ? "text-right" : ""}`}>
      <p class="truncate text-sm">{props.name}</p>
      <p class={`text-3xl tabular-nums ${props.lead ? "font-bold" : "text-zinc-400"}`}>{fmt(props.points)}</p>
    </div>
  );
}

function PlayerRow({ p }: { p: RosterPlayer }) {
  const dim = p.slot !== "starter" || p.points === null;
  return (
    <div class={`flex items-center gap-3 px-3 py-2 ${dim ? "opacity-60" : ""}`}>
      <Headshot src={p.headshot} />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">
          {p.name}
          {p.injuryStatus !== "ACTIVE" && (
            <span class="ml-1.5 rounded bg-red-100 px-1 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
              {statusShort(p.injuryStatus)}
            </span>
          )}
        </p>
        <p class="text-xs text-zinc-500">
          {p.proTeam}
          {p.slot === "bench" && " · Bench"}
          {p.slot === "ir" && " · IR"}
        </p>
      </div>
      <span class="text-sm font-semibold tabular-nums">
        {p.points !== null ? fmt(p.points) : p.hadGame ? "DNP" : <span class="text-xs font-normal text-zinc-400">No game</span>}
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
      <p class="font-semibold uppercase tracking-wide opacity-70">{props.label}</p>
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

function Sub({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <div>
      <h3 class="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

const status = (s: string) => s.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const statusShort = (s: string) =>
  ({ OUT: "OUT", DAY_TO_DAY: "DTD", QUESTIONABLE: "Q", DOUBTFUL: "D", PROBABLE: "P", SUSPENSION: "SUSP" })[s] ?? s;
