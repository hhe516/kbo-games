"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TeamBadge from "@/app/components/TeamBadge";
import { shuffle, store } from "@/lib/kbo";

// -----------------------------
// 팀 맞히기: 선수를 보고 소속팀을 4지선다로 고르는 입문용 퀵 퀴즈
// -----------------------------

const ROUNDS = 10;
const SECONDS = 10; // 문제당 제한 시간
const MIN_WAR = 3; // 어느 정도 알려진 현역만
const TEAMS = ["LG", "두산", "삼성", "롯데", "KIA", "한화", "SSG", "키움", "NC", "KT"];
const BEST_KEY = "quiz_best";

// 맞히면 100점 + 남은 시간 1초당 10점, 3연속부터 콤보 보너스
const pointsFor = (left, streak) => 100 + left * 10 + (streak >= 3 ? 50 : 0);

function makeRound(pool) {
  return shuffle(pool)
    .slice(0, ROUNDS)
    .map((p) => ({
      player: p,
      choices: shuffle([p.team, ...shuffle(TEAMS.filter((t) => t !== p.team)).slice(0, 3)]),
    }));
}

export default function TeamQuiz() {
  const [pool, setPool] = useState([]);
  const [rounds, setRounds] = useState(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null); // 이번 문제에서 고른 팀 (시간 초과면 "")
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [results, setResults] = useState([]); // 문제별 맞음/틀림
  const [gain, setGain] = useState(null); // 방금 얻은 점수 (+130 같은 표시)
  const [best, setBest] = useState(0);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/players.json").then((r) => r.json()),
      fetch("/data/current_teams.json").then((r) => r.json()),
    ])
      .then(([all, current]) => {
        // 지금 KBO에 등록된 선수만, 팀은 현재 등록 팀 (scripts/roster: KBO 선수 조회 기준)
        const p = all
          .filter((x) => current[x.id] && (x.careerWar || 0) >= MIN_WAR)
          .map((x) => ({ ...x, team: current[x.id] }));
        setPool(p);
        setRounds(makeRound(p));
        setBest(store.get(BEST_KEY) || 0);
      });
  }, []);

  const over = !!rounds && idx >= ROUNDS;
  const q = rounds?.[idx];

  const answer = useCallback(
    (team) => {
      if (!q || picked !== null) return;
      clearInterval(timer.current);
      const ok = team === q.player.team;
      setPicked(team);
      setResults((r) => [...r, ok]);
      if (ok) {
        const g = pointsFor(left, streak + 1);
        setScore((s) => s + g);
        setStreak((s) => s + 1);
        setGain(g);
      } else {
        setStreak(0);
        setGain(null);
      }
      setTimeout(() => {
        setPicked(null);
        setGain(null);
        setLeft(SECONDS);
        setIdx((i) => i + 1);
      }, ok ? 800 : 1500);
    },
    [q, picked, left, streak]
  );

  // 문제마다 10초 타이머
  useEffect(() => {
    if (!q || picked !== null) return;
    timer.current = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer.current);
  }, [q, picked]);

  // 시간 초과 = 오답 (빈 선택)
  useEffect(() => {
    if (left === 0 && q && picked === null) {
      const t = setTimeout(() => answer(""), 0);
      return () => clearTimeout(t);
    }
  }, [left, q, picked, answer]);

  // 끝나면 최고 점수 저장
  useEffect(() => {
    if (over && score > (store.get(BEST_KEY) || 0)) store.set(BEST_KEY, score);
  }, [over, score]);

  const restart = () => {
    setRounds(makeRound(pool));
    setIdx(0);
    setScore(0);
    setStreak(0);
    setResults([]);
    setPicked(null);
    setLeft(SECONDS);
    setBest(store.get(BEST_KEY) || 0);
  };

  const correct = results.filter(Boolean).length;
  const shareText = () =>
    `⚾ KBO 팀 맞히기 ${correct}/${ROUNDS} · ${score}점\n${results.map((r) => (r ? "🟩" : "🟥")).join("")}\nkbogames.com/quiz`;
  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("복사해서 공유하세요", shareText());
    }
  };

  const grade = useMemo(() => {
    if (correct >= 9) return "🏆 찐팬 인정!";
    if (correct >= 7) return "👏 야구 좀 보시네요";
    if (correct >= 4) return "🙂 나쁘지 않아요";
    return "🌱 이제 시작이에요";
  }, [correct]);

  if (!rounds) {
    return <div className="min-h-screen flex items-center justify-center text-3xl">Loading...</div>;
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center p-4 md:p-6 flex items-center justify-center"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-3 flex items-center justify-between text-white">
          <Link href="/" className="rounded-xl bg-white/90 px-3 py-2 text-sm font-bold text-black hover:bg-white">
            🏠 홈
          </Link>
          <h1 className="text-xl font-black">⚡ KBO 팀 맞히기</h1>
          <div className="text-right text-xs font-bold text-white/70">최고 {best}점</div>
        </div>

        {!over ? (
          <div className="rounded-3xl bg-white/95 p-5 shadow-2xl">
            {/* 진행·점수 */}
            <div className="flex items-center justify-between text-sm font-bold text-slate-500">
              <span>
                {idx + 1} / {ROUNDS}
              </span>
              <span className="text-orange-500">{streak >= 2 ? `🔥 ${streak}연속` : ""}</span>
              <span className="relative text-slate-900">
                {score}점
                {gain && (
                  <span className="absolute -top-5 right-0 animate-bounce text-emerald-600 font-black">+{gain}</span>
                )}
              </span>
            </div>
            {/* 남은 시간 */}
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ease-linear ${left <= 3 ? "bg-rose-500" : "bg-sky-500"}`}
                style={{ width: `${(left / SECONDS) * 100}%` }}
              />
            </div>

            {/* 선수 */}
            <div className="mt-6 text-center">
              <div className="text-xs font-bold text-slate-400">이 선수의 지금 소속팀은?</div>
              <div className="mt-2 text-4xl font-black text-slate-900">{q.player.name}</div>
              <div className="mt-1 text-sm text-slate-500">
                {q.player.position} · {q.player.birthdate.slice(0, 4)}년생 · {q.player.throws}
              </div>
            </div>

            {/* 보기 4개 */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {q.choices.map((t) => {
                const isAnswer = picked !== null && t === q.player.team;
                const isWrong = picked === t && t !== q.player.team;
                return (
                  <button
                    key={t}
                    onClick={() => answer(t)}
                    disabled={picked !== null}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-4 font-black transition-all ${
                      isAnswer
                        ? "scale-105 border-emerald-500 bg-emerald-100 text-emerald-800"
                        : isWrong
                          ? "border-rose-500 bg-rose-100 text-rose-700 animate-pulse"
                          : picked !== null
                            ? "border-slate-200 bg-slate-50 text-slate-400"
                            : "border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-sky-400 active:scale-95"
                    }`}
                  >
                    <TeamBadge team={t} size={48} />
                    {t}
                  </button>
                );
              })}
            </div>
            {picked === "" && <div className="mt-3 text-center text-sm font-bold text-rose-500">⏰ 시간 초과!</div>}
          </div>
        ) : (
          <div className="rounded-3xl bg-white/95 p-6 text-center shadow-2xl">
            <div className="text-2xl font-black">{grade}</div>
            <div className="mt-3 text-5xl font-black text-slate-900">{score}점</div>
            <div className="mt-1 font-bold text-slate-500">
              {correct}/{ROUNDS} 정답{score > 0 && score >= best ? " · 🎉 최고 기록!" : ""}
            </div>
            <div className="mt-3 text-2xl tracking-widest">{results.map((r) => (r ? "🟩" : "🟥")).join("")}</div>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={restart} className="rounded-xl bg-sky-500 px-6 py-3 font-black text-white hover:bg-sky-400">
                다시 하기
              </button>
              <button onClick={share} className="rounded-xl bg-emerald-500 px-6 py-3 font-black text-white hover:bg-emerald-400">
                {copied ? "복사됨!" : "결과 공유"}
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-amber-50 p-3 text-sm text-slate-700">
              재밌었다면 다음은 <b>오늘의 Who Are Ya</b>!{" "}
              <Link href="/daily/whoru" className="font-black text-sky-600 underline">
                하러 가기 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
