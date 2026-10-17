"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addDays, DAILY_START, dailyNumber, store, todayKST } from "@/lib/kbo";
import { SYNC_EVENT } from "@/lib/supabase";

// 게임별로 기록 하나를 어떻게 읽을지
const GAMES = [
  {
    key: "grid",
    icon: "🔢",
    name: "Grid",
    href: "/daily/grid",
    win: (r) => r.score === 9, // 올 클리어
    // 분포: 채운 칸 수
    buckets: Array.from({ length: 10 }, (_, i) => String(9 - i)),
    bucket: (r) => String(r.score ?? 0),
    bucketLabel: (b) => `${b}칸`,
    short: (r) => `${r.score}/9`,
  },
  {
    key: "careerpath",
    icon: "🛤️",
    name: "Career Path",
    href: "/daily/careerpath",
    win: (r) => !!r.solved,
    buckets: ["1", "2", "3", "X"],
    bucket: (r) => (r.solved ? String((r.guesses || []).length) : "X"),
    bucketLabel: (b) => (b === "X" ? "실패" : `${b}번`),
    short: (r) => (r.solved ? `${(r.guesses || []).length}/3` : "X"),
  },
  {
    key: "whoru",
    icon: "🤔",
    name: "Who Are Ya",
    href: "/daily/whoru",
    win: (r) => !!r.solved,
    buckets: ["1", "2", "3", "4", "5", "6", "7", "8", "X"],
    bucket: (r) => (r.solved ? String(r.score) : "X"),
    bucketLabel: (b) => (b === "X" ? "실패" : `${b}번`),
    short: (r) => (r.solved ? `${r.score}/8` : "X"),
  },
];

// days: 오래된 날 → 오늘 순서. 끝낸 날이 이어지는 최장/현재 연속
function streaks(days, isDone) {
  let best = 0;
  let run = 0;
  days.forEach((d) => {
    run = isDone(d) ? run + 1 : 0;
    best = Math.max(best, run);
  });
  // 현재 연속: 오늘 아직 안 했으면 어제까지 기준
  let cur = 0;
  let i = days.length - 1;
  if (i >= 0 && !isDone(days[i])) i--;
  for (; i >= 0 && isDone(days[i]); i--) cur++;
  return { best, cur };
}

function loadAll() {
  const today = todayKST();
  const days = [];
  for (let d = DAILY_START; d <= today; d = addDays(d, 1)) days.push(d);
  const recs = {};
  days.forEach((d) => {
    recs[d] = Object.fromEntries(GAMES.map((g) => [g.key, store.get(`daily_${g.key}_${d}`)]));
  });
  return { today, days, recs };
}

function GameCard({ g, days, recs }) {
  const done = days.map((d) => recs[d][g.key]).filter((r) => r?.done);
  const wins = done.filter(g.win).length;
  const { best, cur } = streaks(days, (d) => !!recs[d][g.key]?.done);
  const counts = Object.fromEntries(g.buckets.map((b) => [b, 0]));
  done.forEach((r) => {
    const b = g.bucket(r);
    if (b in counts) counts[b]++;
  });
  const max = Math.max(1, ...Object.values(counts));
  const points = g.key === "grid" ? done.map((r) => r.points).filter((p) => p != null) : [];

  return (
    <div className="rounded-3xl bg-white/90 p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="text-xl font-black">
          {g.icon} {g.name}
        </div>
        <Link href={g.href} className="text-sm font-bold text-blue-600 hover:underline">
          오늘 문제 →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          ["플레이", done.length],
          [g.key === "grid" ? "올 클리어" : "정답률", done.length ? `${Math.round((wins / done.length) * 100)}%` : "-"],
          ["현재 연속", cur],
          ["최장 연속", best],
        ].map(([label, v]) => (
          <div key={label} className="rounded-xl bg-slate-100 py-2">
            <div className="text-xl font-black">{v}</div>
            <div className="text-[11px] text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {points.length > 0 && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          평균 <b>{Math.round(points.reduce((a, b) => a + b, 0) / points.length)}점</b> · 최고{" "}
          <b>{Math.max(...points)}점</b>
        </div>
      )}

      <div className="mt-4 space-y-1">
        {g.buckets.map((b) => (
          <div key={b} className="flex items-center gap-2 text-sm">
            <div className="w-10 shrink-0 text-right text-gray-500">{g.bucketLabel(b)}</div>
            <div className="flex-1">
              {counts[b] > 0 ? (
                <div
                  className={`h-5 min-w-6 rounded-md px-1.5 text-right text-xs font-bold leading-5 text-white ${
                    b === "X" || b === "0" ? "bg-gray-400" : "bg-green-500"
                  }`}
                  style={{ width: `${(counts[b] / max) * 100}%` }}
                >
                  {counts[b]}
                </div>
              ) : (
                <div className="h-5 text-xs leading-5 text-gray-300">0</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecordsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const refresh = () => setData(loadAll());
    refresh();
    window.addEventListener(SYNC_EVENT, refresh);
    return () => window.removeEventListener(SYNC_EVENT, refresh);
  }, []);

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-3xl">Loading...</div>;
  }

  const { today, days, recs } = data;
  const all = streaks(days, (d) => GAMES.some((g) => recs[d][g.key]?.done));
  const playedDays = days.filter((d) => GAMES.some((g) => recs[d][g.key]?.done)).length;
  const recent = [...days].reverse();

  return (
    <main
      className="min-h-screen bg-cover bg-center px-4 py-8 md:px-8 md:py-10"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-6">
        <div className="text-center text-white">
          <h1 className="text-4xl md:text-5xl font-black">📈 내 기록</h1>
          <p className="mt-2 text-sm text-white/70">
            오늘의 문제 기록이에요. 로그인하면 다른 기기에서 한 기록도 합쳐져요.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-white">
          {[
            ["🔥 현재 연속", `${all.cur}일`],
            ["🏆 최장 연속", `${all.best}일`],
            ["📅 참여한 날", `${playedDays}일`],
          ].map(([label, v]) => (
            <div key={label} className="rounded-2xl bg-white/10 border border-white/20 py-4">
              <div className="text-2xl md:text-3xl font-black">{v}</div>
              <div className="mt-1 text-xs md:text-sm text-white/70">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {GAMES.map((g) => (
            <GameCard key={g.key} g={g} days={days} recs={recs} />
          ))}
        </div>

        {/* 날짜별 */}
        <section className="rounded-3xl bg-white/90 p-5 shadow-2xl">
          <h2 className="mb-3 text-xl font-black">날짜별 기록</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-1 text-left font-bold">날짜</th>
                  {GAMES.map((g) => (
                    <th key={g.key} className="py-1 font-bold">
                      {g.icon} {g.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr key={d} className="border-t">
                    <td className="py-2 font-bold whitespace-nowrap">
                      #{dailyNumber(d)} <span className="font-normal text-gray-500">{d.slice(5).replace("-", "/")}</span>
                      {d === today && <span className="ml-1 text-xs text-orange-600">오늘</span>}
                    </td>
                    {GAMES.map((g) => {
                      const r = recs[d][g.key];
                      return (
                        <td key={g.key} className="py-2 text-center">
                          {r?.done ? (
                            <span
                              className={`rounded-md px-2 py-0.5 font-bold ${
                                g.win(r) ? "bg-green-100 text-green-800" : "bg-red-50 text-red-600"
                              }`}
                            >
                              {g.short(r)}
                              {g.key === "grid" && r.points != null ? ` · ${r.points}점` : ""}
                            </span>
                          ) : r ? (
                            <span className="text-gray-400">진행 중</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
