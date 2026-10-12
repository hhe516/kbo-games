"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CONDITIONS, loadPool, shuffle } from "@/lib/kbo";

// -----------------------------
// 설정
// -----------------------------

const LIVES = 3;
const SKIPS = 3;
const DECK_SIZE = 30;
const MIN_PER_CELL = 8; // 칸마다 해당 선수가 최소 이 정도는 있어야 출제
const DECK_MIN_WAR = 10; // 뽑히는 선수는 통산 WAR 10+ (판단 가능한 유명 선수 위주)

// -----------------------------
// 새 판 만들기
// -----------------------------

function makeGame(pool) {
  const usable = CONDITIONS.filter(
    (c) => pool.filter((p) => c.test(p)).length >= MIN_PER_CELL
  );

  // 구단 6칸 + 나머지 10칸, 같은 그룹(WAR, 출생 등)은 최대 2칸
  const teams = shuffle(usable.filter((c) => c.group === "team")).slice(0, 6);
  const perGroup = {};
  const others = [];
  for (const c of shuffle(usable.filter((c) => c.group !== "team"))) {
    perGroup[c.group] = (perGroup[c.group] || 0) + 1;
    if (perGroup[c.group] <= 2) others.push(c);
    if (others.length === 10) break;
  }
  const cells = shuffle([...teams, ...others]).slice(0, 16);

  // 판의 어느 칸에든 들어갈 수 있는 선수만 덱에 넣음
  const fits = pool.filter((p) => cells.some((c) => c.test(p)));
  const deck = shuffle(fits).slice(0, DECK_SIZE);

  return { cells, deck };
}

const LINES = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
  [0, 5, 10, 15], [3, 6, 9, 12],
];

// -----------------------------
// 규칙 창
// -----------------------------

const RuleModal = ({ hideRule, setHideRule, setShowRule }) => (
  <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center">
    <div className="w-[720px] max-w-[92%] max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
      <h2 className="text-4xl font-black text-center mb-8">⚾ KBO Bingo</h2>
      <div className="space-y-5 text-gray-800">
        <div>
          <div className="font-black text-xl mb-2">🎯 목표</div>
          <p>선수가 한 명씩 나옵니다. 그 선수에 맞는 칸에 넣어서 4×4 판을 채우세요.</p>
        </div>
        <div>
          <div className="font-black text-xl mb-2">📝 규칙</div>
          <ul className="list-disc ml-6 space-y-2">
            <li>선수를 맞는 칸에 넣으면 그 칸이 채워집니다.</li>
            <li>조건에 맞지 않는 칸에 넣으면 목숨이 하나 줄어듭니다. (총 {LIVES}개)</li>
            <li>넣을 칸이 마땅치 않으면 넘기기를 쓸 수 있습니다. (총 {SKIPS}번)</li>
            <li>판을 다 채우거나, 목숨이 다 떨어지거나, 선수가 다 나오면 끝납니다.</li>
            <li>구단 칸(○○ 경력)은 그 팀 소속으로 <b>1군 경기에 출전한 기록</b>이 있어야 인정됩니다. 지명·입단만 하고 2군에만 있었던 경우는 안 쳐요. 옛 이름까지 포함합니다. (예: KIA·해태)</li>
            <li>통산 WAR 10 이상 선수가 나옵니다.</li>
            <li>수상 칸(골든글러브·MVP·신인왕)은 KBO 정규시즌 시상 기준, 2025년 시상까지 반영돼 있습니다.</li>
          </ul>
        </div>
      </div>
      <label className="flex items-center gap-2 mt-8">
        <input
          type="checkbox"
          checked={hideRule}
          onChange={(e) => setHideRule(e.target.checked)}
        />
        다음부터 보지 않기
      </label>
      <button
        onClick={() => {
          if (hideRule) localStorage.setItem("bingo_rule", "true");
          else localStorage.removeItem("bingo_rule");
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

export default function Bingo() {
  const [pool, setPool] = useState([]);
  const [game, setGame] = useState(null);
  const [turn, setTurn] = useState(0);
  const [filled, setFilled] = useState({}); // 칸 index → 선수
  const [lives, setLives] = useState(LIVES);
  const [skips, setSkips] = useState(SKIPS);
  const [log, setLog] = useState([]); // {player, cell, ok} | {player, skipped}
  const [flash, setFlash] = useState(null); // {idx, ok}
  const [showRule, setShowRule] = useState(false);
  const [hideRule, setHideRule] = useState(false);

  useEffect(() => {
    loadPool().then((all) => {
      const built = all.filter((p) => p.careerWar >= DECK_MIN_WAR);
      setPool(built);
      setGame(makeGame(built));
      setShowRule(localStorage.getItem("bingo_rule") !== "true");
    });
  }, []);

  const current = game?.deck[turn];

  const lines = useMemo(
    () => LINES.filter((l) => l.every((i) => filled[i])).length,
    [filled]
  );

  const filledCount = Object.keys(filled).length;
  const over =
    !!game && (filledCount === 16 || lives <= 0 || turn >= game.deck.length);

  const place = (idx) => {
    if (over || !current || filled[idx] || flash) return;
    const ok = game.cells[idx].test(current);
    setFlash({ idx, ok });
    setTimeout(() => {
      setFlash(null);
      if (ok) setFilled((f) => ({ ...f, [idx]: current }));
      else setLives((v) => v - 1);
      setLog((l) => [{ player: current, cell: game.cells[idx], ok }, ...l]);
      setTurn((t) => t + 1);
    }, 450);
  };

  const skip = () => {
    if (over || !current || skips <= 0 || flash) return;
    setSkips((s) => s - 1);
    setLog((l) => [{ player: current, skipped: true }, ...l]);
    setTurn((t) => t + 1);
  };

  const newGame = () => {
    setGame(makeGame(pool));
    setTurn(0);
    setFilled({});
    setLives(LIVES);
    setSkips(SKIPS);
    setLog([]);
    setFlash(null);
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-3xl">
        Loading...
      </div>
    );
  }

  const fitsFor = (p) =>
    game.cells.map((c, i) => (c.test(p) ? i : -1)).filter((i) => i >= 0);

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
              <h1 className="text-2xl md:text-3xl font-black text-center">⚾ KBO Bingo</h1>
              <button
                onClick={() => setShowRule(true)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-bold shrink-0"
              >
                규칙
              </button>
            </div>

            {/* 데스크톱: 왼쪽 판 / 오른쪽 상태·선수·기록, 모바일: 위에서 아래로 */}
            <div className="grid gap-4 xl:grid-cols-[auto_minmax(280px,360px)] xl:grid-rows-[auto_minmax(0,1fr)] xl:h-[min(calc(100vh-9rem),600px)]">
              {/* 상태 + 현재 선수 / 결과 */}
              <div className="space-y-3 xl:col-start-2 xl:row-start-1">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ["채운 칸", `${filledCount}/16`],
                    ["빙고", lines],
                    ["목숨", "❤️".repeat(Math.max(0, lives)) || "0"],
                    ["넘기기", skips],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-slate-100 py-2">
                      <div className="text-xs text-gray-500">{k}</div>
                      <div className="text-lg font-black">{v}</div>
                    </div>
                  ))}
                </div>

                {!over && current && (
                  <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-500">
                        {turn + 1}번째 선수 · 남은 선수 {game.deck.length - turn - 1}명
                      </div>
                      <div className="text-2xl md:text-3xl font-black">
                        {current.name}
                        <span className="ml-2 text-base font-semibold text-gray-500">
                          {current.birthYear}년생
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={skip}
                      disabled={skips <= 0}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-4 py-3 rounded-xl font-bold shrink-0"
                    >
                      넘기기
                    </button>
                  </div>
                )}

                {over && (
                  <div className="rounded-2xl bg-slate-50 border p-4 text-center">
                    <div className={`text-2xl md:text-3xl font-black ${filledCount === 16 ? "text-green-600" : "text-gray-800"}`}>
                      {filledCount === 16 ? "🎉 올 클리어!" : lives <= 0 ? "❌ 목숨 소진" : "🏁 게임 끝"}
                    </div>
                    <div className="mt-2 text-lg">
                      {filledCount}칸 채움 · 빙고 {lines}줄
                    </div>
                    <button
                      onClick={newGame}
                      className="mt-4 bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-xl font-black"
                    >
                      새 게임
                    </button>
                  </div>
                )}
              </div>

              {/* 판: 데스크톱에선 화면 높이에 맞춰 정사각형 */}
              <div className="w-full xl:w-[min(calc(100vh-9rem),600px)] xl:col-start-1 xl:row-start-1 xl:row-span-2">
                <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                  {game.cells.map((c, i) => {
                    const p = filled[i];
                    const fl = flash?.idx === i ? flash.ok : null;
                    return (
                      <button
                        key={c.id}
                        onClick={() => place(i)}
                        disabled={over || !!p}
                        className={`
aspect-square rounded-xl border-2 p-1 md:p-2 flex flex-col items-center justify-center text-center transition-all
${p ? "bg-green-400 border-green-500" : "bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50"}
${fl === true ? "bg-green-300 border-green-500 scale-95" : ""}
${fl === false ? "bg-red-200 border-red-500 animate-pulse" : ""}
`}
                      >
                        <span className={`font-black leading-tight break-keep ${p ? "text-[10px] md:text-xs text-green-900" : "text-xs md:text-base text-gray-900"}`}>
                          {c.label}
                        </span>
                        {p && (
                          <span className="mt-1 text-xs md:text-base font-black text-black break-keep">
                            {p.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 기록 */}
              <div className="flex flex-col min-h-0 xl:col-start-2 xl:row-start-2">
                {log.length > 0 && (
                  <>
                    <div className="text-sm font-black text-gray-600 mb-2">기록</div>
                    <div className="space-y-1 max-h-56 xl:max-h-none xl:flex-1 min-h-0 overflow-y-auto text-sm">
                      {log.map((r, k) => (
                        <div key={k} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                          <span className="font-bold shrink-0">{r.player.name}</span>
                          <span className={`text-right ${r.skipped ? "text-gray-500" : r.ok ? "text-green-700" : "text-red-600"}`}>
                            {r.skipped
                              ? "넘김"
                              : r.ok
                                ? `✓ ${r.cell.label}`
                                : `✗ ${r.cell.label} → 가능: ${fitsFor(r.player).map((i) => game.cells[i].label).join(", ") || "없음"}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!over && (
                  <button onClick={newGame} className="mt-3 w-full text-sm text-gray-500 underline xl:mt-auto xl:pt-3">
                    판 새로 만들기
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
