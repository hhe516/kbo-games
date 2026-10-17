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
  liftOnMobile,
  todayKST,
} from "@/lib/kbo";
import { pushDaily, rankTag, SYNC_EVENT } from "@/lib/supabase";
import { DailyStatsBox, useDailyStats } from "@/components/DailyStats";

// -----------------------------
// 설정
// -----------------------------

const LIVES = 3; // 틀려도 되는 횟수
const MIN_ANSWERS = 3; // 칸마다 이름 있는 선수(WAR 5+)로 풀 수 있는 답이 최소 이만큼은 있어야 출제
const NOTABLE_WAR = 5;
const TIMER_SECONDS = 180; // 타이머 모드 제한 시간
// 난이도: 칸마다 이름 있는 선수(WAR 5+) 정답 수 상한 + 쓰지 않을 조건
//  - 어려움: 정답 25명 이하 (데일리도 이 기준)
//  - 쉬움: 정답 넉넉하게(50명 이하) 대신 너무 뻔한 조건(투수·내야·외야·좌타·우승 등)은 빼기
const LEVELS = {
  hard: { label: "어려움", max: 25, exclude: [] },
  easy: {
    label: "쉬움",
    max: 50,
    exclude: ["pos_P", "pos_IF", "pos_OF", "lhb", "ring", "journey", "oneclub", "f10"],
  },
};

const TEAM_CONDS = CONDITIONS.filter((c) => c.group === "team");
const OTHER_CONDS = CONDITIONS.filter((c) => c.group !== "team");
const YOUNG_TEAMS = ["team_KT", "team_NC", "team_SSG", "team_키움"];

// -----------------------------
// 판 만들기: 가로 3개 = 구단, 세로 3개 = 구단 또는 조건
// -----------------------------

// rng 를 넘기면(데일리) 같은 날엔 항상 같은 판이 나옴
export function makeGrid(pool, rng = Math.random, level = "hard") {
  const { max, exclude } = LEVELS[level];
  for (let tries = 0; tries < 3000; tries++) {
    // 구단은 가로 3개 + 세로 0~1개. KT·NC·SSG·키움은 한 판에 최대 2개
    const teamCols = rng() < 0.3 ? 1 : 0;
    const teams = [];
    let young = 0;
    for (const t of shuffle(TEAM_CONDS, rng)) {
      if (teams.length === 3 + teamCols) break;
      const isYoung = YOUNG_TEAMS.includes(t.id);
      if (isYoung && young >= 2) continue;
      if (isYoung) young++;
      teams.push(t);
    }
    const rows = teams.slice(0, 3);
    const cols = [...teams.slice(3)];
    const usedGroups = new Set();
    for (const c of shuffle(OTHER_CONDS.filter((c) => !exclude.includes(c.id)), rng)) {
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
        const notable = list.filter((p) => p.careerWar >= NOTABLE_WAR).length;
        if (notable < MIN_ANSWERS || notable > max) ok = false;
        answers.push(list);
      }
    }
    if (ok) return { rows, cols: colsShuffled, answers };
  }
  return null;
}

// 희귀도 점수: 그 칸 정답 후보를 통산 WAR 높은 순(=유명한 순)으로 줄 세웠을 때 몇 번째인지
// 가장 유명한 선수 10점 ~ 가장 덜 알려진 선수 100점
export function rarityPoints(answers, player) {
  const sorted = [...answers].sort((a, b) => b.careerWar - a.careerWar);
  const idx = sorted.findIndex((p) => p.id === player.id);
  if (idx < 0) return 0;
  if (sorted.length <= 1) return 100;
  return Math.round(10 + (90 * idx) / (sorted.length - 1));
}

const cellLabel = (c) => c.label.replace(/ 경력$/, "");

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
            <li>한국시리즈 우승은 우승한 해에 그 팀 소속으로 1군에 출전한 경우를 셉니다. 통산 기록·시즌 수는 KBO 1군 기준(2025년까지)입니다.</li>
            <li>한 선수는 한 칸에만 쓸 수 있습니다.</li>
            <li>틀리면 목숨이 하나 줄어듭니다. (총 {LIVES}개)</li>
            <li>자유 모드에서는 난이도(쉬움 / 어려움)와 일반 / 타이머({TIMER_SECONDS / 60}분)를 고를 수 있어요. 쉬움은 칸마다 정답이 넉넉하고, 투수·내야수 같은 뻔한 조건은 안 나와요. 오늘의 Grid는 어려움 기준입니다.</li>
            <li>구단 칸은 그 팀 소속으로 <b>1군 경기에 출전한 기록</b>이 있어야 인정됩니다. 지명·입단만 하고 2군에만 있었던 경우는 안 쳐요. 옛 이름까지 포함합니다. (예: KIA·해태)</li>
            <li>KBO 1군 기록이 있는 선수라면 누구든 정답으로 인정됩니다. 덜 알려진 선수로 채울수록 고수!</li>
            <li>칸을 채우거나 게임이 끝나면 그 칸의 정답 가능한 선수 수가 나옵니다.</li>
            <li>
              <b>희귀도 점수</b>: 칸마다 정답 후보를 통산 WAR 높은 순(유명한 순)으로 줄 세워서, 가장 유명한 선수면 10점,
              가장 덜 알려진 선수면 100점. 9칸 합계 최대 900점.
            </li>
            <li>수상 칸(골든글러브·MVP·신인왕)은 KBO 정규시즌 시상 기준, 2025년 시상까지 반영돼 있습니다. MLB 칸은 MLB 정규시즌 출장 기준입니다.</li>
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
  const [level, setLevel] = useState("hard"); // 자유 모드 난이도
  const [timed, setTimed] = useState(false); // 자유 모드에서만: 타이머 모드
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
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

      restore(built, today);
    });

    // 저장된 데일리 기록 불러오기
    function restore(built, today) {
      const saved = store.get(`daily_grid_${today}`);
      if (!saved) return;
      const byId = Object.fromEntries(built.map((p) => [p.id, p]));
      const restored = {};
      Object.entries(saved.filled || {}).forEach(([i, id]) => {
        if (byId[id]) restored[i] = byId[id];
      });
      setFilled(restored);
      setLives(saved.lives ?? LIVES);
      setGaveUp(!!saved.gaveUp);
    }

    // 로그인해서 서버 기록을 받아오면, 아직 손 안 댄 판일 때만 그걸로 이어서
    const onSync = () => {
      if (!daily) return;
      const today = todayKST();
      const local = store.get(`daily_grid_${today}`);
      loadPool().then((built) => {
        if (!local || Object.keys(local.filled || {}).length === 0) restore(built, today);
        setPrevStreak(streakUntil("grid", addDays(today, -1)));
      });
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [daily]);

  const filledCount = Object.keys(filled).length;
  const timeUp = timed && timeLeft <= 0;
  const over = !!grid && (filledCount === 9 || lives <= 0 || gaveUp || timeUp);

  // 타이머: 1초마다 줄이고, 게임이 끝나면 멈춤
  useEffect(() => {
    if (!timed || !grid || over) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timed, grid, over]);
  const cellPoints = (i) => (filled[i] ? rarityPoints(grid.answers[i], filled[i]) : 0);
  const points = grid ? Object.keys(filled).reduce((sum, i) => sum + cellPoints(i), 0) : 0;
  // 데일리 진행 상황 저장 (새로고침해도 이어서, 다시 뽑기 방지)
  useEffect(() => {
    if (!daily || !date || !grid) return;
    const ids = Object.fromEntries(Object.entries(filled).map(([i, p]) => [i, p.id]));
    const rec = { filled: ids, lives, gaveUp, done: over, score: filledCount, points };
    store.set(`daily_grid_${date}`, rec);
    // 로그인 상태면 서버에도 (칸을 채우거나 틀렸을 때만 바뀌므로 호출 수는 적음)
    if (filledCount > 0 || lives < LIVES || gaveUp) pushDaily("grid", date, rec);
  }, [daily, date, grid, filled, lives, gaveUp, over, filledCount, points]);

  // 데일리 통계: 점수 = 희귀도 점수 합, picks = 칸별로 고른 선수
  const pickIds = useMemo(
    () => Object.fromEntries(Object.entries(filled).map(([i, p]) => [i, p.id])),
    [filled]
  );
  const stats = useDailyStats("grid", date, daily && over, { score: points, solved: filledCount === 9, picks: pickIds });
  // 이 칸에서 이 선수를 고른 비율 (그 칸을 채운 사람 중)
  const pickRate = (i, id) => {
    const cell = stats?.picks?.[i];
    if (!cell) return null;
    const total = Object.values(cell).reduce((a, c) => a + c, 0);
    return total ? Math.round(((cell[id] || 0) / total) * 100) : null;
  };

  const streak = prevStreak + (over ? 1 : 0);

  const shareText = () => {
    const rows = [0, 1, 2]
      .map((r) => [0, 1, 2].map((c) => (filled[r * 3 + c] ? "🟩" : "⬜")).join(""))
      .join("\n");
    return `⚾ KBO Grid #${dailyNumber(date)} ${filledCount}/9 · ${points}점${rankTag(stats, points)}\n${rows}\nkbogames.com`;
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

  const newGame = (withTimer = timed, lv = level) => {
    setLevel(lv);
    setTimed(withTimer);
    setTimeLeft(TIMER_SECONDS);
    setGrid(makeGrid(pool, Math.random, lv));
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

  const revealList =
    reveal !== null
      ? [...grid.answers[reveal]].sort(
          (a, b) => (pickRate(reveal, b.id) ?? 0) - (pickRate(reveal, a.id) ?? 0) || b.careerWar - a.careerWar
        )
      : [];

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
                      pickRate={daily ? pickRate : () => null}
                    />
                  ))}
                </div>
              </div>

              {/* 오른쪽: 상태 · 입력 · 결과 */}
              <div className="flex flex-col gap-3 min-h-0">
                {!daily && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(LEVELS).reverse().map(([key, lv]) => (
                      <button
                        key={key}
                        onClick={() => newGame(timed, key)}
                        className={`rounded-xl py-2 font-bold ${
                          level === key ? "bg-blue-600 text-white" : "bg-slate-100 text-gray-600 hover:bg-slate-200"
                        }`}
                      >
                        {lv.label}
                      </button>
                    ))}
                  </div>
                )}
                {!daily && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      [false, "일반"],
                      [true, `⏱ 타이머 ${TIMER_SECONDS / 60}분`],
                    ].map(([t, label]) => (
                      <button
                        key={label}
                        onClick={() => newGame(t)}
                        className={`rounded-xl py-2 font-bold ${
                          timed === t ? "bg-slate-800 text-white" : "bg-slate-100 text-gray-600 hover:bg-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {timed && !daily && (
                  <div
                    className={`rounded-xl py-2 text-center text-2xl font-black tabular-nums ${
                      timeLeft <= 30 ? "bg-red-100 text-red-600" : "bg-slate-100"
                    }`}
                  >
                    ⏱ {Math.floor(Math.max(0, timeLeft) / 60)}:{String(Math.max(0, timeLeft) % 60).padStart(2, "0")}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-100 py-2">
                    <div className="text-xs text-gray-500">채운 칸</div>
                    <div className="text-lg font-black">{filledCount}/9</div>
                  </div>
                  <div className="rounded-xl bg-slate-100 py-2">
                    <div className="text-xs text-gray-500">목숨</div>
                    <div className="text-lg font-black">{"❤️".repeat(Math.max(0, lives)) || "0"}</div>
                  </div>
                  <div className="rounded-xl bg-slate-100 py-2">
                    <div className="text-xs text-gray-500">희귀도 점수</div>
                    <div className="text-lg font-black">{points}</div>
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
                onFocus={liftOnMobile}
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
                                    {p.birthYear}년생
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
                      {filledCount === 9 ? "🎉 올 클리어!" : lives <= 0 ? "❌ 목숨 소진" : timeUp ? "⏰ 시간 종료" : "🏳️ 포기"}
                    </div>
                    <div className="mt-2 text-lg">
                      {filledCount}칸 채움 · <b>{points}점</b> <span className="text-sm text-gray-500">/ 900</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">칸을 누르면 정답 가능한 선수를 볼 수 있어요.</div>
                    {daily ? (
                      <>
                        <div className="mt-2 text-sm font-bold text-orange-600">🔥 {streak}일 연속</div>
                        <DailyStatsBox
                          stats={stats}
                          myScore={points}
                          lines={
                            stats?.players
                              ? [`평균 ${stats.avg}점 · 올 클리어 ${Math.round((stats.solved / stats.players) * 100)}%`]
                              : []
                          }
                        />
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
                        onClick={() => newGame()}
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
                          {daily && pickRate(reveal, p.id) ? (
                            <span className="ml-1 text-xs text-gray-500">{pickRate(reveal, p.id)}%</span>
                          ) : null}
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
                      <button onClick={() => newGame()} className="flex-1 text-sm text-gray-500 underline">
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
function RowCells({ r, ri, grid, filled, selected, over, reveal, pickCell, pickRate }) {
  return (
    <>
      <div className="aspect-square rounded-xl bg-slate-800 text-white flex items-center justify-center text-center p-1 text-xs md:text-base font-black leading-tight break-keep">
        {cellLabel(r)}
      </div>
      {grid.cols.map((c, ci) => {
        const i = ri * 3 + ci;
        const p = filled[i];
        const active = selected === i || (over && reveal === i);
        const rate = p && over ? pickRate(i, p.id) : null;
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
              {p ? `+${rarityPoints(grid.answers[i], p)}점 · ${grid.answers[i].length}명 중` : over ? `${grid.answers[i].length}명 가능` : ""}
            </span>
            {rate != null && <span className="text-[10px] md:text-xs font-bold text-green-950">선택률 {rate}%</span>}
          </button>
        );
      })}
    </>
  );
}
