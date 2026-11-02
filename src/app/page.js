"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES } from "@/components/Sidebar";
import TeamBadge from "@/app/components/TeamBadge";
import { dailyNumber, dailyStreak, store, todayKST } from "@/lib/kbo";
import { SYNC_EVENT } from "@/lib/supabase";

// 오늘의 문제: 쉬운 것부터 (처음 온 사람이 위에서부터 하면 되게)
// level: 난이도 표시, howto: 한 줄 설명, result: 끝낸 기록 → 타일에 보여줄 글자
const DAILIES = [
  {
    key: "whoru", href: "/daily/whoru", icon: "🤔", name: "오늘의 Who Are Ya", ready: true, level: 1,
    howto: "선수 이름을 대면 팀·나이·포지션이 맞는지 알려줘요",
    result: (r) => (r.solved ? `✅ ${r.score}/8` : "❌ 실패"),
  },
  {
    key: "careerpath", href: "/daily/careerpath", icon: "🛤️", name: "오늘의 Career Path", ready: true, level: 2,
    howto: "거쳐 간 팀과 연도만 보고 선수 맞히기",
    result: (r) => (r.solved ? `✅ ${(r.guesses || []).length}번 만에` : "❌ 실패"),
  },
  {
    key: "bingo", href: "/daily/bingo", icon: "🎱", name: "오늘의 Bingo", ready: true, level: 2,
    howto: "나오는 선수를 맞는 칸에 넣어 빙고 만들기",
    result: (r) => `✅ 빙고 ${r.lines ?? 0}줄 · ${r.filled ?? 0}/16`,
  },
  {
    key: "grid", href: "/daily/grid", icon: "🔢", name: "오늘의 Grid", ready: true, level: 3,
    howto: "가로·세로 조건을 둘 다 만족하는 선수 쓰기",
    result: (r) => `✅ ${r.score}/9` + (r.points != null ? ` · ${r.points}점` : ""),
  },
];

const LEVELS = { 1: ["입문", "bg-emerald-100 text-emerald-700"], 2: ["보통", "bg-sky-100 text-sky-700"], 3: ["고수", "bg-rose-100 text-rose-700"] };
// 자유 모드 카드 난이도 (Sidebar 의 GAMES href 기준)
const FREE_LEVEL = { "/quiz": 1, "/whoru": 1, "/careerpath": 2, "/bingo": 2, "/missing9": 3, "/grid": 3 };
const LevelChip = ({ level }) => (
  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black ${LEVELS[level][1]}`}>{LEVELS[level][0]}</span>
);

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function Home() {
const [showCredits, setShowCredits] = useState(false);
const [today, setToday] = useState(null);
const [progress, setProgress] = useState({}); // key → 저장된 데일리 기록
const [streak, setStreak] = useState(0);
const [birthdays, setBirthdays] = useState(null);
const [newbie, setNewbie] = useState(false);
const [news, setNews] = useState([]); // 스토브리그 뉴스 (/api/news) // 데일리를 한 번도 안 해본 첫 방문자

// 데일리 진행·연속 기록 (브라우저 저장소 기준, 로그인 시 서버와 맞춰진 값)
function refreshDaily(d) {
  setStreak(dailyStreak(DAILIES.filter((g) => g.ready).map((g) => g.key), d));
  setProgress(
    Object.fromEntries(DAILIES.map((g) => [g.key, store.get(`daily_${g.key}_${d}`)]))
  );
}

useEffect(() => {
  fetch("/api/news")
    .then((r) => r.json())
    .then((j) => {
      const now = Date.now();
      setNews((j.items || []).map((n) => ({ ...n, hours: n.time ? Math.max(0, Math.round((now - n.time) / 3600000)) : null })));
    })
    .catch(() => {});
}, []);

useEffect(() => {
  const onSync = () => refreshDaily(todayKST());
  window.addEventListener(SYNC_EVENT, onSync);
  return () => window.removeEventListener(SYNC_EVENT, onSync);
}, []);

useEffect(() => {
  Promise.all([
    fetch("/data/players.json").then((r) => r.json()),
    fetch("/data/current_teams.json").then((r) => r.json()),
  ])
    .then(([players, current]) => {
      const d = todayKST();
      setToday(d);
      refreshDaily(d);
      // 데일리 기록이 하나도 없고 안내를 닫은 적 없으면 첫 방문자로 보고 안내 띄움
      let played = false;
      try {
        played = Object.keys(localStorage).some((k) => k.startsWith("daily_"));
      } catch {}
      setNewbie(!played && !store.get("kbo_welcome_done"));

      // 오늘 생일 (한국 시간), 통산 WAR 높은 순
      const md = `${d.slice(5, 7)}월 ${d.slice(8, 10)}일`;
      const year = Number(d.slice(0, 4));
      setBirthdays(
        players
          .filter((p) => String(p.birthdate).endsWith(md))
          .sort((a, b) => b.careerWar - a.careerWar)
          .slice(0, 6)
          // 지금 KBO에 등록된 선수는 현재 팀·현역으로
          .map((p) => ({
            ...p,
            team: current[p.id] || p.team,
            active: !!current[p.id],
            turning: year - Number(p.birthdate.slice(0, 4)),
          }))
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
              <Link
                href="/records"
                className="ml-3 rounded-full bg-orange-500/90 px-3 py-1 text-sm text-white hover:bg-orange-400"
              >
                🔥 {streak}일 연속 · 내 기록 →
              </Link>
            )}
          </div>
        </div>

        {/* 첫 방문 안내: 뭐부터 하면 되는지 */}
        {newbie && (
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-300 to-orange-400 p-5 md:p-6 text-slate-900 shadow-2xl">
            <button
              onClick={() => {
                store.set("kbo_welcome_done", true);
                setNewbie(false);
              }}
              aria-label="안내 닫기"
              className="absolute right-3 top-2 text-xl font-black text-slate-900/50 hover:text-slate-900"
            >
              ✕
            </button>
            <div className="text-xl md:text-2xl font-black">처음 오셨나요? ⚾</div>
            <p className="mt-1 text-sm md:text-base font-semibold text-slate-800">
              KBO 선수를 맞히는 게임 모음이에요. 매일 0시에 모두에게 같은 문제가 열려요.
              <br className="hidden md:block" /> 처음이면 4지선다 <b>팀 맞히기</b>로 몸풀고, 오늘의 <b>Who Are Ya</b>부터 해보세요!
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/quiz"
                className="rounded-xl bg-slate-900 px-5 py-2.5 font-black text-white hover:bg-slate-700"
              >
                ⚡ 1분 팀 맞히기로 몸풀기 →
              </Link>
              <Link
                href="/daily/whoru"
                className="rounded-xl bg-white/80 px-5 py-2.5 font-black text-slate-900 hover:bg-white"
              >
                🤔 오늘의 Who Are Ya
              </Link>
              <span className="self-center text-xs font-bold text-slate-800/70">
                쉬운 순서: Who Are Ya → Career Path → Bingo → Grid
              </span>
            </div>
          </section>
        )}

        {/* 오늘의 문제: 한 판에 4개 작은 타일 */}
        <section className="rounded-3xl border border-white/15 bg-slate-950/60 p-4 md:p-5 shadow-2xl backdrop-blur-md">
          {(() => {
            const ready = DAILIES.filter((g) => g.ready);
            const doneCount = ready.filter((g) => progress[g.key]?.done).length;
            return (
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg md:text-xl font-black text-white">
                    📅 오늘의 문제 {today && <span className="text-white/50">#{dailyNumber(today)}</span>}
                  </h2>
                  <p className="text-xs text-white/50">매일 0시 새 문제 · 모두 같은 문제</p>
                </div>
                <div className="w-28 shrink-0 text-right">
                  <div className="text-xs font-bold text-white/70">
                    {doneCount === ready.length ? "🎉 오늘 다 풀었어요" : `${doneCount}/${ready.length} 완료`}
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/15">
                    <div
                      className="h-1.5 rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${(doneCount / ready.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {DAILIES.map((g) => {
              const rec = progress[g.key];
              const done = !!rec?.done;
              const tile = (
                <div
                  className={`group flex h-full items-center gap-3 rounded-2xl px-3 py-3 transition-all ${
                    done
                      ? "bg-emerald-500/15 ring-1 ring-emerald-400/40 hover:bg-emerald-500/25"
                      : "bg-white/95 hover:-translate-y-0.5 hover:bg-white"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${
                      done ? "bg-emerald-400/20" : "bg-slate-100"
                    }`}
                  >
                    {g.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate text-sm md:text-base font-black ${done ? "text-white" : "text-slate-900"}`}>
                        {g.name.replace("오늘의 ", "")}
                      </span>
                      {!done && <LevelChip level={g.level} />}
                    </div>
                    {!done && !rec && <div className="hidden sm:block truncate text-[11px] text-slate-500">{g.howto}</div>}
                    <div
                      className={`truncate text-xs font-bold ${
                        done ? "text-emerald-300" : rec ? "text-orange-500" : "text-blue-600"
                      }`}
                    >
                      {!g.ready ? "준비 중" : done ? g.result(rec).replace("✅ ", "") : rec ? "이어서 하기 →" : "도전하기 →"}
                    </div>
                  </div>
                </div>
              );
              return g.ready ? (
                <Link key={g.key} href={g.href}>
                  {tile}
                </Link>
              ) : (
                <div key={g.key} className="opacity-50">
                  {tile}
                </div>
              );
            })}
          </div>
        </section>

        {/* 스토브리그 뉴스: 구글 뉴스 검색에서 FA·트레이드 기사 제목만, 누르면 언론사 원문 */}
        {news.length > 0 && (
          <section className="rounded-3xl border border-white/15 bg-slate-950/60 p-4 md:p-5 shadow-2xl backdrop-blur-md">
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 className="text-lg md:text-xl font-black text-white">🔥 스토브리그 소식</h2>
              <span className="text-[11px] text-white/40">FA·트레이드 최신 기사 · 자동 업데이트</span>
            </div>
            <ul className="divide-y divide-white/10">
              {news.map((n) => {
                const hours = n.hours;
                return (
                  <li key={n.link}>
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-baseline justify-between gap-3 py-2.5 group"
                    >
                      <span className="line-clamp-2 text-sm md:text-[15px] font-semibold text-white group-hover:text-amber-300">
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-white/50">
                        {n.source}
                        {hours != null ? ` · ${hours < 24 ? `${hours}시간 전` : `${Math.round(hours / 24)}일 전`}` : ""}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 오늘 생일: 중간 크기 카드 (팀 로고 + 이름 + 몇 번째 생일) */}
        {birthdays?.length > 0 && (
          <section className="rounded-3xl border border-white/15 bg-slate-950/60 p-4 md:p-5 shadow-2xl backdrop-blur-md">
            <h2 className="mb-3 text-lg md:text-xl font-black text-white">
              🎂 오늘 생일인 선수 <span className="text-sm font-bold text-white/50">생일 축하해요!</span>
            </h2>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
              {birthdays.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 px-3 py-3 ring-1 ring-white/10"
                >
                  <div className="shrink-0">
                    <TeamBadge team={p.team} size={36} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-base font-black text-white">{p.name}</span>
                      {p.active && (
                        <span className="shrink-0 rounded-full bg-sky-500/80 px-1.5 text-[10px] font-bold text-white">현역</span>
                      )}
                    </div>
                    <div className="truncate text-xs text-white/60">
                      {p.team} · {p.position} · WAR {p.careerWar}
                    </div>
                    <div className="text-xs font-bold text-amber-300">🎉 {p.turning}번째 생일</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{g.icon}</div>
                  {FREE_LEVEL[g.href] && <LevelChip level={FREE_LEVEL[g.href]} />}
                </div>
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
