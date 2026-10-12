"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES } from "@/components/Sidebar";
import { dailyNumber, dailyStreak, store, todayKST } from "@/lib/kbo";
import { SYNC_EVENT } from "@/lib/supabase";

// 오늘의 문제 (result: 끝낸 기록 → 카드에 보여줄 글자)
const DAILIES = [
  {
    key: "grid", href: "/daily/grid", icon: "🔢", name: "오늘의 Grid", ready: true,
    result: (r) => `✅ ${r.score}/9`,
  },
  {
    key: "careerpath", href: "/daily/careerpath", icon: "🛤️", name: "오늘의 Career Path", ready: true,
    result: (r) => (r.solved ? `✅ ${(r.guesses || []).length}번 만에` : "❌ 실패"),
  },
  {
    key: "whoru", href: "/daily/whoru", icon: "🤔", name: "오늘의 Who Are Ya", ready: true,
    result: (r) => (r.solved ? `✅ ${r.score}/8` : "❌ 실패"),
  },
];

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function Home() {
const [showCredits, setShowCredits] = useState(false);
const [today, setToday] = useState(null);
const [progress, setProgress] = useState({}); // key → 저장된 데일리 기록
const [streak, setStreak] = useState(0);
const [birthdays, setBirthdays] = useState(null);

// 데일리 진행·연속 기록 (브라우저 저장소 기준, 로그인 시 서버와 맞춰진 값)
function refreshDaily(d) {
  setStreak(dailyStreak(DAILIES.filter((g) => g.ready).map((g) => g.key), d));
  setProgress(
    Object.fromEntries(DAILIES.map((g) => [g.key, store.get(`daily_${g.key}_${d}`)]))
  );
}

useEffect(() => {
  const onSync = () => refreshDaily(todayKST());
  window.addEventListener(SYNC_EVENT, onSync);
  return () => window.removeEventListener(SYNC_EVENT, onSync);
}, []);

useEffect(() => {
  fetch("/data/players.json")
    .then((r) => r.json())
    .then((players) => {
      const d = todayKST();
      setToday(d);
      refreshDaily(d);

      // 오늘 생일 (한국 시간), 통산 WAR 높은 순
      const md = `${d.slice(5, 7)}월 ${d.slice(8, 10)}일`;
      const year = Number(d.slice(0, 4));
      setBirthdays(
        players
          .filter((p) => String(p.birthdate).endsWith(md))
          .sort((a, b) => b.careerWar - a.careerWar)
          .slice(0, 6)
          .map((p) => ({ ...p, turning: year - Number(p.birthdate.slice(0, 4)) }))
      );
    });
}, []);

const dateLabel = today
  ? `${Number(today.slice(5, 7))}월 ${Number(today.slice(8, 10))}일 (${WEEK[new Date(`${today}T00:00:00Z`).getUTCDay()]})`
  : "";
  return (
    <>
{showCredits && (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">

    <div className="w-[92vw]
max-w-[560px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white text-black p-8 shadow-2xl">

      <h2 className="text-3xl font-black text-center mb-6">
        ⚾ Credits
      </h2>

      <div className="space-y-4 text-sm leading-7 text-zinc-700">

        <p>
          <strong>KBO Games</strong> is an unofficial fan-made baseball quiz website.
        </p>

        <p>
          Inspired by the following games from{" "}
          <a
            href="https://playfootball.games"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            PlayFootball.Games
          </a>
        </p>

        <ul className="list-disc ml-6">

          <li>
            <a
              href="https://playfootball.games/who-are-ya/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Who Are Ya?
            </a>
          </li>

          <li>
            <a
              href="https://playfootball.games/missing-xi/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Missing XI
            </a>
          </li>

          <li>
            <a
              href="https://playfootball.games/career-path-challenge/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Career Path Challenge
            </a>
          </li>

          <li>
            <a
              href="https://playfootball.games/football-bingo/daily/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Football Bingo
            </a>
          </li>

          <li>
            <a
              href="https://playfootball.games/footy-tic-tac-toe/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Tiki-Taka-Toe
            </a>
          </li>

        </ul>

        <p>
          This website is not affiliated with KBO,
          PlayFootball.Games or any professional baseball organization.
        </p>

        <p>
          Player names, team names and publicly available baseball records
          are used for educational and fan purposes.
        </p>

        <p>
          Award records (Golden Glove, MVP, Rookie of the Year, Korean MLB
          players) are compiled from{" "}
          <a
            href="https://ko.wikipedia.org/wiki/KBO_%EA%B3%A8%EB%93%A0%EA%B8%80%EB%9F%AC%EB%B8%8C"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Korean Wikipedia
          </a>
          .
        </p>

      </div>

      <button
        onClick={() => setShowCredits(false)}
        className="mt-8 w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl font-bold"
      >
        확인
      </button>

    </div>

  </div>
)}

    <main
      className="min-h-screen bg-cover bg-center px-4 py-8 md:px-8 md:py-10"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
      }}
    >

      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-8">

        {/* 제목 */}
        <div className="text-center text-white">
          <h1 className="text-4xl md:text-6xl font-black leading-tight">⚾ KBO GAME HUB</h1>
          <div className="mt-3 text-lg md:text-xl font-bold text-white/80">
            {dateLabel}
            {today && (
              <span className="ml-3 rounded-full bg-orange-500/90 px-3 py-1 text-sm text-white">
                🔥 {streak}일 연속
              </span>
            )}
          </div>
        </div>

        {/* 오늘의 문제 */}
        <section>
          <h2 className="mb-3 text-xl md:text-2xl font-black text-white">📅 오늘의 문제</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {DAILIES.map((g) => {
              const rec = progress[g.key];
              const status = !g.ready
                ? "준비 중"
                : rec?.done
                  ? g.result(rec)
                  : rec
                    ? "이어서 하기"
                    : "도전하기";
              const card = (
                <div
                  className={`h-full rounded-3xl p-6 shadow-2xl transition-all ${
                    g.ready ? "bg-white/90 hover:bg-white hover:scale-[1.02]" : "bg-white/40"
                  }`}
                >
                  <div className="text-4xl">{g.icon}</div>
                  <div className="mt-3 text-2xl font-black text-gray-900">{g.name}</div>
                  {g.ready && today && (
                    <div className="text-sm font-semibold text-gray-500">#{dailyNumber(today)}</div>
                  )}
                  <div
                    className={`mt-4 inline-block rounded-xl px-4 py-2 font-black ${
                      !g.ready
                        ? "bg-gray-300 text-gray-600"
                        : rec?.done
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-500 text-white"
                    }`}
                  >
                    {status}
                  </div>
                </div>
              );
              return g.ready ? (
                <Link key={g.key} href={g.href}>
                  {card}
                </Link>
              ) : (
                <div key={g.key}>{card}</div>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-white/70">매일 0시(한국 시간)에 새 문제가 열립니다. 모두 같은 문제를 풀어요.</p>
        </section>

        {/* 오늘 생일 */}
        <section className="rounded-3xl bg-white/90 p-6 shadow-2xl">
          <h2 className="mb-4 text-xl md:text-2xl font-black text-gray-900">🎂 오늘 생일인 KBO 선수</h2>
          {birthdays === null ? (
            <div className="text-gray-500">불러오는 중...</div>
          ) : birthdays.length === 0 ? (
            <div className="text-gray-500">오늘 생일인 선수가 없어요.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {birthdays.map((p) => (
                <div key={p.id} className="rounded-2xl bg-slate-100 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xl font-black">{p.name}</span>
                    {p.active && (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">현역</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {p.team} · {p.position} · {p.birthdate.slice(0, 4)}년생 ({p.turning}번째 생일)
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-700">통산 WAR {p.careerWar}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 자유 모드 */}
        <section>
          <h2 className="mb-3 text-xl md:text-2xl font-black text-white">🎮 자유 모드</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {GAMES.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="rounded-2xl bg-white/85 p-4 shadow-xl transition-all hover:bg-white hover:scale-[1.03]"
              >
                <div className="text-3xl">{g.icon}</div>
                <div className="mt-2 font-black text-gray-900">{g.name}</div>
                <div className="mt-1 text-xs text-gray-500">{g.desc}</div>
              </Link>
            ))}
          </div>
        </section>

      </div>

      <button
        onClick={() => setShowCredits(true)}
        className="fixed bottom-5 right-5 lg:bottom-6 lg:right-6 z-30 rounded-xl bg-white/90 px-5 py-3 font-bold text-black shadow-xl transition hover:bg-white"
      >
        ⓘ Credits
      </button>
    </main>
</>
  );
}
