"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import TeamBadge from "@/app/components/TeamBadge";
import { addDays, dailyNumber, seededRandom, store, streakUntil, todayKST } from "@/lib/kbo";
import { pushDaily, SYNC_EVENT } from "@/lib/supabase";

const CHANCES = 8;
const GAME = "whoru";

// 같은 날엔 같은 선수 (데이터 파일 순서가 바뀌어도 id 순으로 정렬해서 고름)
function pickAnswer(players, today) {
  const pool = [...players].sort((a, b) => (a.id < b.id ? -1 : 1));
  const rng = seededRandom(`${GAME}-${today}`);
  return pool[Math.floor(rng() * pool.length)];
}

// 추측 하나를 정답과 비교
function compare(p, a) {
  return {
    correct: p.id === a.id,
    team: p.team === a.team,
    position: p.position === a.position,
    throws: p.throws === a.throws,
    nationality: p.nationality === a.nationality,
    age: p.age === a.age ? "same" : p.age < a.age ? "up" : "down",
  };
}

const cell = (ok) =>
  `${ok ? "bg-green-400 border-green-500" : "bg-white/90 border-gray-300"} border rounded-xl p-2 text-center font-bold text-black text-sm md:text-base flex items-center justify-center gap-1`;

export default function WhoAreYaDaily() {
  const [players, setPlayers] = useState([]);
  const [answer, setAnswer] = useState(null);
  const [date, setDate] = useState(null);
  const [guessIds, setGuessIds] = useState([]);
  const [input, setInput] = useState("");
  const [prevStreak, setPrevStreak] = useState(0);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const restore = (today) => {
      const saved = store.get(`daily_${GAME}_${today}`);
      if (saved?.guesses) setGuessIds(saved.guesses);
    };

    fetch("/data/players_war10.json")
      .then((r) => r.json())
      .then((data) => {
        const today = todayKST();
        const year = Number(today.slice(0, 4));
        // 나이는 생년으로 다시 계산 (JSON 값은 만든 시점 기준)
        const list = data.map((p) => ({ ...p, age: year - Number(String(p.birthdate).slice(0, 4)) }));
        setPlayers(list);
        setDate(today);
        setAnswer(pickAnswer(list, today));
        setPrevStreak(streakUntil(GAME, addDays(today, -1)));
        restore(today);
      });

    const onSync = () => {
      const today = todayKST();
      if (!startedRef.current) restore(today);
      setPrevStreak(streakUntil(GAME, addDays(today, -1)));
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const guesses = useMemo(
    () => (answer ? guessIds.map((id) => byId[id]).filter(Boolean).map((p) => ({ p, r: compare(p, answer) })) : []),
    [guessIds, byId, answer]
  );

  const solved = guesses.some((g) => g.r.correct);
  const over = solved || guesses.length >= CHANCES;
  const score = solved ? guesses.length : 0;
  const streak = prevStreak + (over ? 1 : 0);

  useEffect(() => {
    if (!date || !answer || guessIds.length === 0) return;
    const rec = { guesses: guessIds, solved, done: over, score };
    store.set(`daily_${GAME}_${date}`, rec);
    pushDaily(GAME, date, rec);
  }, [date, answer, guessIds, solved, over, score]);

  const suggestions = useMemo(() => {
    const q = input.replaceAll(" ", "");
    if (!q || over) return [];
    const used = new Set(guessIds);
    return players.filter((p) => p.name.includes(q) && !used.has(p.id)).slice(0, 8);
  }, [input, players, guessIds, over]);

  const guess = (p) => {
    if (!p || over) return;
    startedRef.current = true;
    setInput("");
    setGuessIds((g) => [...g, p.id]);
  };

  const shareText = () => {
    const rows = guesses
      .map(({ r }) =>
        [r.team, r.position, r.throws, r.nationality].map((ok) => (ok ? "🟩" : "⬜")).join("") +
        (r.age === "same" ? "🟩" : r.age === "up" ? "⬆️" : "⬇️")
      )
      .join("\n");
    return `⚾ KBO Who Are Ya #${dailyNumber(date)} ${solved ? guesses.length : "X"}/${CHANCES}\n${rows}\nkbogames.com`;
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
      className="min-h-screen bg-cover bg-center p-3 md:p-6 flex items-start md:items-center justify-center"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-4xl">
        <div className="bg-white/90 rounded-3xl shadow-2xl p-4 md:p-6">
          {/* 상단 */}
          <div className="flex justify-between items-center mb-4 gap-2">
            <Link href="/" className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-bold shrink-0">
              🏠 홈
            </Link>
            <h1 className="text-xl md:text-3xl font-black text-center">
              📅 오늘의 Who Are Ya #{dailyNumber(date)}
            </h1>
            <div className="text-center shrink-0">
              <div className="text-xs text-gray-500">남은 기회</div>
              <div className="text-2xl font-black">{CHANCES - guesses.length}</div>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            통산 WAR 10+ 선수 중 오늘의 선수는 누구일까요? 선수를 입력하면 팀(현재/마지막 소속)·포지션·나이·투타·국적이 맞는지
            알려줍니다. 초록색 = 일치, 나이 화살표 = 정답이 더 많음(⬆)/적음(⬇).
          </p>

          {/* 입력 */}
          {!over && (
            <div className="relative mb-4">
              <input
                value={input}
                autoFocus
                placeholder="선수 이름 입력"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions.length > 0) guess(suggestions[0]);
                }}
                className="w-full rounded-xl border border-gray-300 p-3 text-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-200"
              />
              {suggestions.length > 0 && (
                <div className="absolute w-full bg-white border rounded-xl mt-2 shadow-xl z-50">
                  {suggestions.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => guess(p)}
                      className="cursor-pointer px-4 py-2.5 hover:bg-sky-100 flex justify-between gap-3"
                    >
                      <span className="font-bold">{p.name}</span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <TeamBadge team={p.team} size={16} /> {p.team} · {p.position} · {p.birthdate.slice(0, 4)}년생
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 결과 */}
          {over && (
            <div className="mb-4 rounded-2xl bg-slate-50 border p-5 text-center">
              <div className={`text-3xl font-black ${solved ? "text-green-600" : "text-red-600"}`}>
                {solved ? `🎉 ${guesses.length}번 만에 정답!` : "❌ 실패"}
              </div>
              <div className="mt-2 text-xl flex items-center justify-center gap-2">
                정답: <TeamBadge team={answer.team} size={24} />
                <span className="font-black">{answer.name}</span>
                <span className="text-base text-gray-500">
                  ({answer.team} · {answer.position} · {answer.throws})
                </span>
              </div>
              <div className="mt-2 text-sm font-bold text-orange-600">🔥 {streak}일 연속</div>
              <div className="mt-4 flex gap-2 justify-center">
                <button onClick={share} className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-xl font-black">
                  {copied ? "복사됨!" : "결과 공유"}
                </button>
                <Link href="/whoru" className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl font-black">
                  자유 모드
                </Link>
              </div>
              <div className="mt-2 text-xs text-gray-400">내일 0시(한국 시간)에 새 문제가 열려요.</div>
            </div>
          )}

          {/* 추측 표 */}
          {guesses.length > 0 && (
            <div className="overflow-x-auto">
              <div className="min-w-[560px] space-y-2">
                <div className="grid grid-cols-6 gap-2 text-center text-xs font-bold text-gray-500">
                  <div>선수</div>
                  <div>팀</div>
                  <div>포지션</div>
                  <div>나이</div>
                  <div>투타</div>
                  <div>국적</div>
                </div>
                {[...guesses].reverse().map(({ p, r }) => (
                  <div key={p.id} className="grid grid-cols-6 gap-2">
                    <div className={cell(r.correct)}>{p.name}</div>
                    <div className={cell(r.team)}>
                      <TeamBadge team={p.team} size={20} />
                      {p.team}
                    </div>
                    <div className={cell(r.position)}>{p.position}</div>
                    <div className={cell(r.age === "same")}>
                      {p.age}
                      {r.age === "up" ? " ⬆" : r.age === "down" ? " ⬇" : ""}
                    </div>
                    <div className={cell(r.throws)}>{p.throws}</div>
                    <div className={cell(r.nationality)}>{p.nationality}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
