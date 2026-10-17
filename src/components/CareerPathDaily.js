"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  dailyNumber,
  franchiseOf,
  seededRandom,
  store,
  streakUntil,
  liftOnMobile,
  todayKST,
} from "@/lib/kbo";
import { pushDaily, SYNC_EVENT } from "@/lib/supabase";
import { DailyStatsBox, useDailyStats } from "@/components/DailyStats";

const CHANCES = 3;
const GAME = "careerpath";

const normalize = (s) => String(s).replaceAll(" ", "").toLowerCase().trim();

// 데이터 파일 순서가 바뀌어도 같은 날엔 같은 문제가 나오도록 id 순으로 정렬해서 고름
function pickAnswer(players, today) {
  const pool = players
    // 실제로 팀을 옮긴 선수만 (MBC→LG, SK→SSG 같은 구단 이름 변경만 있는 커리어는 제외)
    .filter((p) => new Set(p.career.map((c) => franchiseOf(c.team))).size >= 2)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const rng = seededRandom(`${GAME}-${today}`);
  return pool[Math.floor(rng() * pool.length)];
}

export default function CareerPathDaily() {
  const [players, setPlayers] = useState([]);
  const [answer, setAnswer] = useState(null);
  const [date, setDate] = useState(null);
  const [guesses, setGuesses] = useState([]); // 틀린/맞힌 이름들 (순서대로)
  const [solved, setSolved] = useState(false);
  const [input, setInput] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [prevStreak, setPrevStreak] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = () =>
      Promise.all([
        fetch("/data/career_paths.json").then((r) => r.json()),
        fetch("/data/career_overrides.json").then((r) => r.json()),
      ]).then(([list, overrides]) =>
        list.map((p) => (overrides[p.id] ? { ...p, career: overrides[p.id] } : p))
      );

    const restore = (today) => {
      const saved = store.get(`daily_${GAME}_${today}`);
      if (!saved) return;
      setGuesses(saved.guesses || []);
      setSolved(!!saved.solved);
    };

    load().then((merged) => {
      const today = todayKST();
      setPlayers(merged);
      setDate(today);
      setAnswer(pickAnswer(merged, today));
      setPrevStreak(streakUntil(GAME, addDays(today, -1)));
      restore(today);
    });

    // 로그인해서 서버 기록을 받아오면, 아직 시작 안 한 경우에만 그걸로 이어서
    const onSync = () => {
      const today = todayKST();
      setGuesses((g) => {
        if (g.length === 0) restore(today);
        return g;
      });
      setPrevStreak(streakUntil(GAME, addDays(today, -1)));
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const wrongCount = guesses.length - (solved ? 1 : 0);
  const over = solved || wrongCount >= CHANCES;
  const score = solved ? CHANCES - wrongCount : 0; // 첫 시도에 맞히면 3점
  const streak = prevStreak + (over ? 1 : 0);
  const stats = useDailyStats(GAME, date, over, { score, solved });

  // 진행 저장 (브라우저 + 로그인 시 서버)
  useEffect(() => {
    if (!date || !answer || guesses.length === 0) return;
    const rec = { guesses, solved, done: over, score };
    store.set(`daily_${GAME}_${date}`, rec);
    pushDaily(GAME, date, rec);
  }, [date, answer, guesses, solved, over, score]);

  const dupNames = useMemo(() => {
    const count = {};
    players.forEach((p) => {
      count[p.name] = (count[p.name] || 0) + 1;
    });
    return new Set(Object.keys(count).filter((n) => count[n] > 1));
  }, [players]);

  const suggestions = useMemo(() => {
    if (!suggestOpen || !input.trim()) return [];
    return players.filter((p) => normalize(p.name).includes(normalize(input))).slice(0, 8);
  }, [input, players, suggestOpen]);

  const submit = (name) => {
    const guess = (name ?? input).trim();
    if (!guess || over) return;
    setInput("");
    setSuggestOpen(false);
    const ok = normalize(guess) === normalize(answer.name);
    setGuesses((g) => [...g, guess]);
    if (ok) {
      setSolved(true);
    } else {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 400);
    }
  };

  const shareText = () => {
    const marks = guesses
      .map((g) => (normalize(g) === normalize(answer.name) ? "🟩" : "🟥"))
      .join("");
    return `⚾ KBO Career Path #${dailyNumber(date)} ${solved ? `${guesses.length}/${CHANCES}` : `X/${CHANCES}`}\n${marks}\nkbogames.com`;
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("복사해서 공유하세요", shareText());
    }
  };

  if (!answer) {
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/90 rounded-3xl shadow-2xl p-5 md:p-8">
          {/* 상단 */}
          <div className="flex justify-between items-center mb-5 gap-2">
            <Link href="/" className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-bold shrink-0">
              🏠 홈
            </Link>
            <h1 className="text-xl md:text-3xl font-black text-center">
              📅 오늘의 Career Path #{dailyNumber(date)}
            </h1>
            <div className="text-center shrink-0">
              <div className="text-xs text-gray-500">남은 기회</div>
              <div className="text-2xl font-black">{Math.max(0, CHANCES - wrongCount)}</div>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-600">이 커리어의 주인공은 누구일까요? 기회는 {CHANCES}번입니다.</p>

          {/* 커리어 */}
          <div className="space-y-2 mb-5">
            {answer.career.map((row, i) => (
              <div key={i} className="rounded-2xl bg-slate-100 px-4 py-3 flex justify-between items-center">
                <div className="font-black text-lg">{row.team}</div>
                <div className="text-gray-600">
                  {row.from}~{row.to}
                </div>
              </div>
            ))}
          </div>

          {/* 힌트 */}
          {!over && wrongCount >= 1 && (
            <div className="mb-3 rounded-xl bg-yellow-100 border border-yellow-400 p-3 text-center font-bold text-yellow-800">
              💡 포지션 : {answer.position}
              {wrongCount >= 2 && <> · 출생 : {answer.id.split("_")[1]?.slice(0, 5)}</>}
            </div>
          )}

          {/* 지금까지 시도 */}
          {guesses.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {guesses.map((g, i) => {
                const ok = normalize(g) === normalize(answer.name);
                return (
                  <span
                    key={i}
                    className={`rounded-lg px-3 py-1 text-sm font-bold ${ok ? "bg-green-200 text-green-900" : "bg-red-100 text-red-700"}`}
                  >
                    {ok ? "✓" : "✗"} {g}
                  </span>
                );
              })}
            </div>
          )}

          {/* 입력 */}
          {!over && (
            <div className="relative">
              <input
                value={input}
                placeholder="선수 이름 입력"
                onFocus={liftOnMobile}
                onChange={(e) => {
                  setInput(e.target.value);
                  setSuggestOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                className={`w-full rounded-xl border p-4 text-lg transition-all ${
                  wrongFlash ? "border-red-500 bg-red-100 animate-pulse" : "border-gray-300"
                }`}
              />
              {suggestions.length > 0 && (
                <div className="absolute w-full bg-white border rounded-xl mt-2 shadow-xl z-50">
                  {suggestions.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => submit(p.name)}
                      className="cursor-pointer px-4 py-3 hover:bg-sky-100"
                    >
                      {p.name}
                      {dupNames.has(p.name) && (
                        <span className="ml-2 text-sm text-gray-500">({p.id.split("_")[1]?.slice(0, 5)}생)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => submit()}
                className="mt-4 w-full bg-blue-500 hover:bg-blue-400 text-white py-4 rounded-xl text-xl font-black"
              >
                제출
              </button>
            </div>
          )}

          {/* 결과 */}
          {over && (
            <div className="mt-4 rounded-2xl bg-slate-50 border p-5 text-center">
              <div className={`text-3xl font-black ${solved ? "text-green-600" : "text-red-600"}`}>
                {solved ? `🎉 ${guesses.length}번 만에 정답!` : "❌ 실패"}
              </div>
              <div className="mt-2 text-xl">
                정답: <span className="font-black">{answer.name}</span>
              </div>
              <div className="mt-2 text-sm font-bold text-orange-600">🔥 {streak}일 연속</div>
              <DailyStatsBox
                stats={stats}
                myScore={score}
                lines={
                  stats?.players
                    ? [
                        [1, 2, 3]
                          .map((t) => `${t}번 만에 ${Math.round(((stats.dist?.[CHANCES + 1 - t] || 0) / stats.players) * 100)}%`)
                          .concat(`실패 ${Math.round(((stats.players - stats.solved) / stats.players) * 100)}%`)
                          .join(" · "),
                      ]
                    : []
                }
              />
              <div className="mt-4 flex gap-2 justify-center">
                <button onClick={share} className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-xl font-black">
                  {copied ? "복사됨!" : "결과 공유"}
                </button>
                <Link href="/careerpath" className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl font-black">
                  자유 모드
                </Link>
              </div>
              <div className="mt-2 text-xs text-gray-400">내일 0시(한국 시간)에 새 문제가 열려요.</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
