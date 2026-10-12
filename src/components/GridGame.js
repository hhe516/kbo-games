"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CONDITIONS,
  dailyNumber,
  addDays,
  loadPool,
  seededRandom,
  shuffle,
  store,
  streakUntil,
  todayKST,
} from "@/lib/kbo";

// -----------------------------
// 설정
// -----------------------------

const LIVES = 3; // 틀려도 되는 횟수
const MIN_ANSWERS = 3; // 칸마다 이름 있는 선수(WAR 5+)로 풀 수 있는 답이 최소 이만큼은 있어야 출제
const NOTABLE_WAR = 5;

const TEAM_CONDS = CONDITIONS.filter((c) => c.group === "team");
const OTHER_CONDS = CONDITIONS.filter((c) => c.group !== "team");

// -----------------------------
// 판 만들기: 가로 3개 = 구단, 세로 3개 = 구단 또는 조건
// -----------------------------

// rng 를 넘기면(데일리) 같은 날엔 항상 같은 판이 나옴
export function makeGrid(pool, rng = Math.random) {
  for (let tries = 0; tries < 300; tries++) {
    const teams = shuffle(TEAM_CONDS, rng);
    const rows = teams.slice(0, 3);

    const teamCols = rng() < 0.5 ? 1 : 2;
    const cols = [...teams.slice(3, 3 + teamCols)];
    const usedGroups = new Set();
    for (const c of shuffle(OTHER_CONDS, rng)) {
      if (cols.length === 3) break;
      if (usedGroups.has(c.group)) continue;
      usedGroups.add(c.group);
      cols.push(c);
    }
    const colsShuffled = shuffle(cols, rng);

    const answers = [];
    let ok = true;
    for (const r of rows) {
      for (const c of colsShuffled) {
        const list = pool.filter((p) => r.test(p) && c.test(p));
        if (list.filter((p) => p.careerWar >= NOTABLE_WAR).length < MIN_ANSWERS) ok = false;
        answers.push(list);
      }
    }
    if (ok) return { rows, cols: colsShuffled, answers };
  }
  return null;
}

const cellLabel = (c) => c.label.replace(/ 출신$/, "");

// -----------------------------
// 규칙 창
// -----------------------------

const RuleModal = ({ hideRule, setHideRule, setShowRule }) => (
  <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center">
    <div className="w-[720px] max-w-[92%] max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
      <h2 className="text-4xl font-black text-center mb-8">⚾ KBO Grid</h2>
      <div className="space-y-5 text-gray-800">
        <div>
          <div className="font-black text-xl mb-2">🎯 목표</div>
          <p>3×3 칸마다 가로 조건과 세로 조건을 둘 다 만족하는 선수를 적어서 9칸을 채우세요.</p>
        </div>
        <div>
          <div className="font-black text-xl mb-2">📝 규칙</div>
          <ul className="list-disc ml-6 space-y-2">
            <li>칸을 누르고 선수 이름을 입력합니다. 예: 가로 LG × 세로 두산 → LG와 두산에서 모두 뛴 선수</li>
            <li>한 선수는 한 칸에만 쓸 수 있습니다.</li>
            <li>틀리면 목숨이 하나 줄어듭니다. (총 {LIVES}개)</li>
            <li>구단은 옛 이름까지 포함합니다. (예: KIA·해태)</li>
            <li>KBO 1군 기록이 있는 선수라면 누구든 정답으로 인정됩니다. 덜 알려진 선수로 채울수록 고수!</li>
            <li>칸 아래 숫자는 그 칸의 정답 가능한 선수 수입니다. 적을수록 어려운 칸이에요.</li>
          </ul>
        </div>
      </div>
      <label className="flex items-center gap-2 mt-8">
        <input type="checkbox" checked={hideRule} onChange={(e) => setHideRule(e.target.checked)} />
        다음부터 보지 않기
      </label>
      <button
        onClick={() => {
          if (hideRule) localStorage.setItem("grid_rule", "true");
          else localStorage.removeItem("grid_rule");
          setShowRule(false);
        }}
        className="mt-8 w-full bg-blue-500 hover:bg-blue-400 text-white py-3 rounded-xl font-black"
      >
        게임 시작
      </button>
    </div>
  </div>
);

// -----------------------------
// 페이지
// -----------------------------

export default function GridGame({ daily = false }) {
  const [pool, setPool] = useState([]);
  const [grid, setGrid] = useState(null);
  const [filled, setFilled] = useState({}); // 칸 index → 선수
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState("");
  const [lives, setLives] = useState(LIVES);
  const [gaveUp, setGaveUp] = useState(false);
  const [message, setMessage] = useState(null); // {ok, text}
  const [reveal, setReveal] = useState(null); // 끝난 뒤 정답 목록 볼 칸
  const [showRule, setShowRule] = useState(false);
  const [hideRule, setHideRule] = useState(false);
  const [date, setDate] = useState(null); // 데일리 날짜
  const [prevStreak, setPrevStreak] = useState(0); // 어제까지 연속 기록
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPool().then((built) => {
      setPool(built);
      setShowRule(localStorage.getItem("grid_rule") !== "true");

      if (!daily) {
        setGrid(makeGrid(built));
        return;
      }

      // 데일리: 날짜로 판 고정 + 하던 기록 이어서
      const today = todayKST();
      setDate(today);
      setGrid(makeGrid(built, seededRandom(`grid-${today}`)));
      setPrevStreak(streakUntil("grid", addDays(today, -1)));

      const saved = store.get(`daily_grid_${today}`);
      if (saved) {
        const byId = Object.fromEntries(built.map((p) => [p.id, p]));
        const restored = {};
        Object.entries(saved.filled || {}).forEach(([i, id]) => {
          if (byId[id]) restored[i] = byId[id];
        });
        setFilled(restored);
        setLives(saved.lives ?? LIVES);
        setGaveUp(!!saved.gaveUp);
      }
    });
  }, [daily]);

  const filledCount = Object.keys(filled).length;
  const over = !!grid && (filledCount === 9 || lives <= 0 || gaveUp);
  // 데일리 진행 상황 저장 (새로고침해도 이어서, 다시 뽑기 방지)
  useEffect(() => {
    if (!daily || !date || !grid) return;
    const ids = Object.fromEntries(Object.entries(filled).map(([i, p]) => [i, p.id]));
    store.set(`daily_grid_${date}`, {
      filled: ids,
      lives,
      gaveUp,
      done: over,
      score: filledCount,
    });
  }, [daily, date, grid, filled, lives, gaveUp, over, filledCount]);

  const streak = prevStreak + (over ? 1 : 0);

  const shareText = () => {
    const rows = [0, 1, 2]
      .map((r) => [0, 1, 2].map((c) => (filled[r * 3 + c] ? "🟩" : "⬜")).join(""))
      .join("\n");
    return `⚾ KBO Grid #${dailyNumber(date)} ${filledCount}/9\n${rows}\nkbogames.com`;
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

  const usedIds = useMemo(
    () => new Set(Object.values(filled).map((p) => p.id)),
    [filled]
  );

  // 동명이인은 출생연도·마지막 팀으로 구분
  const suggestions = useMemo(() => {
    const q = input.replaceAll(" ", "");
    if (!q || selected === null) return [];
    return pool
      .filter((p) => p.name.includes(q) && !usedIds.has(p.id))
      .sort((a, b) => (a.name === q ? -1 : 0) - (b.name === q ? -1 : 0) || b.careerWar - a.careerWar)
      .slice(0, 8);
  }, [input, pool, usedIds, selected]);

  const pickCell = (i) => {
    if (over) {
      setReveal(i);
      return;
    }
    if (filled[i]) return;
    setSelected(i);
    setInput("");
    setMessage(null);
  };

  const guess = (player) => {
    if (over || selected === null || !player) return;
    const idx = selected;
    const r = grid.rows[Math.floor(idx / 3)];
    const c = grid.cols[idx % 3];
    setInput("");

    if (r.test(player) && c.test(player)) {
      setFilled((f) => ({ ...f, [idx]: player }));
      setSelected(null);
      setMessage({ ok: true, text: `✓ ${player.name} 정답!` });
    } else {
      const why = [!r.test(player) && cellLabel(r), !c.test(player) && cellLabel(c)]
        .filter(Boolean)
        .join(", ");
      setLives((v) => v - 1);
      setMessage({ ok: false, text: `✗ ${player.name}: ${why} 조건이 안 맞아요` });
    }
  };

  const newGame = () => {
    setGrid(makeGrid(pool));
    setFilled({});
    setSelected(null);
    setInput("");
    setLives(LIVES);
    setGaveUp(false);
    setMessage(null);
    setReveal(null);
  };

  if (!grid) {
    return (
      <div className="min-h-screen flex items-center justify-center text-3xl">Loading...</div>
    );
  }

  const answersOf = (i) => grid.answers[i].filter((p) => !usedIds.has(p.id) || filled[i]?.id === p.id);
  const revealList =
    reveal !== null ? [...grid.answers[reveal]].sort((a, b) => b.careerWar - a.careerWar) : [];

  return (
    <>
      {showRule && (
        <RuleModal hideRule={hideRule} setHideRule={setHideRule} setShowRule={setShowRule} />
      )}

      <main
        className="min-h-screen bg-cover bg-center p-3 md:p-4 flex items-center justify-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <div className="relative z-10 w-full max-w-3xl xl:max-w-6xl xl:w-auto">
          <div className="bg-white/90 rounded-3xl shadow-2xl p-4 md:p-5">
            {/* 상단 */}
            <div className="flex justify-between items-center mb-4 gap-2">
              <Link href="/" className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-bold shrink-0">
                🏠 홈
              </Link>
              <h1 className="text-2xl md:text-3xl font-black text-center">
                {daily && date ? `📅 오늘의 Grid #${dailyNumber(date)}` : "⚾ KBO Grid"}
              </h1>
              <button
                onClick={() => setShowRule(true)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-bold shrink-0"
              >
                규칙
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-[auto_minmax(280px,360px)] xl:h-[min(calc(100vh-9rem),600px)]">
              {/* 판 */}
              <div className="w-full xl:w-[min(calc(100vh-9rem),600px)]">
                <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                  <div />
                  {grid.cols.map((c) => (
                    <div
                      key={c.id}
                      className="aspect-square rounded-xl bg-slate-800 text-white flex items-center justify-center text-center p-1 text-xs md:text-base font-black leading-tight break-keep"
                    >
                      {cellLabel(c)}
                    </div>
                  ))}

                  {grid.rows.map((r, ri) => (
                    <RowCells
                      key={r.id}
                      r={r}
                      ri={ri}
                      grid={grid}
                      filled={filled}
                      selected={selected}
                      over={over}
                      reveal={reveal}
                      pickCell={pickCell}
                      answersOf={answersOf}
                    />
                  ))}
                </div>
              </div>

              {/* 오른쪽: 상태 · 입력 · 결과 */}
              <div className="flex flex-col gap-3 min-h-0">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-slate-100 py-2">
                    <div className="text-xs text-gray-500">채운 칸</div>
                    <div className="text-lg font-black">{filledCount}/9</div>
                  </div>
                  <div className="rounded-xl bg-slate-100 py-2">
                    <div className="text-xs text-gray-500">목숨</div>
                    <div className="text-lg font-black">{"❤️".repeat(Math.max(0, lives)) || "0"}</div>
                  </div>
                </div>

                {!over && (
                  <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4">
                    {selected === null ? (
                      <div className="text-gray-600 font-semibold">채울 칸을 눌러주세요.</div>
                    ) : (
                      <>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-black text-gray-900">
                            {cellLabel(grid.rows[Math.floor(selected / 3)])}
                          </span>
                          {" × "}
                          <span className="font-black text-gray-900">
                            {cellLabel(grid.cols[selected % 3])}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            autoFocus
                            value={input}
                            placeholder="선수 이름 입력"
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && suggestions.length > 0) guess(suggestions[0]);
                              if (e.key === "Escape") setSelected(null);
                            }}
                            className="w-full rounded-xl border border-gray-300 p-3 text-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-200"
                          />
                          {suggestions.length > 0 && (
                            <div className="absolute w-full bg-white border rounded-xl mt-2 shadow-xl z-50 max-h-72 overflow-y-auto">
                              {suggestions.map((p) => (
                                <div
                                  key={p.id}
                                  onClick={() => guess(p)}
                                  className="cursor-pointer px-4 py-2.5 hover:bg-sky-100 flex justify-between gap-3"
                                >
                                  <span className="font-bold">{p.name}</span>
                                  <span className="text-sm text-gray-500 text-right">
                                    {p.birthYear}년생 · {p.kboTeams.join("·")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {message && !over && (
                  <div
                    className={`rounded-xl px-4 py-3 font-bold ${
                      message.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {over && (
                  <div className="rounded-2xl bg-slate-50 border p-4 text-center">
                    <div className={`text-2xl md:text-3xl font-black ${filledCount === 9 ? "text-green-600" : "text-gray-800"}`}>
                      {filledCount === 9 ? "🎉 올 클리어!" : lives <= 0 ? "❌ 목숨 소진" : "🏳️ 포기"}
                    </div>
                    <div className="mt-2 text-lg">{filledCount}칸 채움</div>
                    <div className="mt-1 text-sm text-gray-500">칸을 누르면 정답 가능한 선수를 볼 수 있어요.</div>
                    {daily ? (
                      <>
                        <div className="mt-2 text-sm font-bold text-orange-600">🔥 {streak}일 연속</div>
                        <div className="mt-4 flex gap-2 justify-center">
                          <button
                            onClick={share}
                            className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-xl font-black"
                          >
                            {copied ? "복사됨!" : "결과 공유"}
                          </button>
                          <Link
                            href="/grid"
                            className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl font-black"
                          >
                            자유 모드
                          </Link>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">내일 0시(한국 시간)에 새 판이 열려요.</div>
                      </>
                    ) : (
                      <button
                        onClick={newGame}
                        className="mt-4 bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-xl font-black"
                      >
                        새 게임
                      </button>
                    )}
                  </div>
                )}

                {over && reveal !== null && (
                  <div className="flex flex-col min-h-0 xl:flex-1">
                    <div className="text-sm font-black text-gray-600 mb-2">
                      {cellLabel(grid.rows[Math.floor(reveal / 3)])} × {cellLabel(grid.cols[reveal % 3])} · {revealList.length}명
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-56 xl:max-h-none xl:flex-1 min-h-0 overflow-y-auto content-start">
                      {revealList.map((p) => (
                        <span
                          key={p.id}
                          className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${
                            filled[reveal]?.id === p.id ? "bg-green-200" : "bg-slate-100"
                          }`}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!over && (
                  <div className="flex gap-2 xl:mt-auto">
                    <button
                      onClick={() => {
                        setGaveUp(true);
                        setSelected(null);
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-xl font-bold text-gray-700"
                    >
                      포기하고 정답 보기
                    </button>
                    {!daily && (
                      <button onClick={newGame} className="flex-1 text-sm text-gray-500 underline">
                        판 새로 만들기
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// 가로줄 하나: 줄 머리 + 칸 3개
function RowCells({ r, ri, grid, filled, selected, over, reveal, pickCell, answersOf }) {
  return (
    <>
      <div className="aspect-square rounded-xl bg-slate-800 text-white flex items-center justify-center text-center p-1 text-xs md:text-base font-black leading-tight break-keep">
        {cellLabel(r)}
      </div>
      {grid.cols.map((c, ci) => {
        const i = ri * 3 + ci;
        const p = filled[i];
        const active = selected === i || (over && reveal === i);
        return (
          <button
            key={c.id}
            onClick={() => pickCell(i)}
            className={`
aspect-square rounded-xl border-2 p-1 md:p-2 flex flex-col items-center justify-center text-center transition-all
${p ? "bg-green-400 border-green-500" : over ? "bg-slate-100 border-gray-300" : "bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50"}
${active ? "ring-4 ring-blue-400 border-blue-500" : ""}
`}
          >
            {p ? (
              <span className="text-sm md:text-lg font-black text-black break-keep">{p.name}</span>
            ) : (
              <span className="text-2xl text-gray-300 font-black">?</span>
            )}
            <span className={`mt-1 text-[10px] md:text-xs ${p ? "text-green-900" : "text-gray-400"}`}>
              {over || p ? `${grid.answers[i].length}명 가능` : `${answersOf(i).length}명`}
            </span>
          </button>
        );
      })}
    </>
  );
}
