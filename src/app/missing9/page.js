"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { liftOnMobile, store } from "@/lib/kbo";

// -----------------------------
// 설정
// -----------------------------

const MAX_WRONG = 6; // 한 칸에서 6번 틀리면 그 칸은 실패
const HINT_AT = { season: 1, school: 3, initials: 5 }; // 몇 번째 오답부터 힌트 공개

const TEAMS = ["전체", "골든글러브", "대한민국", "삼성", "두산", "LG", "롯데", "KIA", "한화", "SSG", "KT", "키움", "NC"];
// 옛 이름까지 같은 팀으로
const TEAM_GROUP = { SSG: ["SSG", "SK"], 키움: ["키움", "넥센", "우리"] };

// 야구장 위 카드 위치 (가로 %, 세로 %)
const SPOT = {
  P: [50, 60],
  "1B": [72, 60],
  "2B": [62, 40],
  SS: [38, 40],
  "3B": [28, 60],
  C: [50, 88],
  LF: [22, 28],
  CF: [50, 18],
  RF: [78, 28],
  OF1: [22, 28],
  OF2: [50, 18],
  OF3: [78, 28],
  DH: [72, 86],
};
// 모바일 목록 순서
const ORDER = ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "OF1", "OF2", "OF3", "DH"];

const posLabel = (pos) => (pos.startsWith("OF") ? "OF" : pos);
const normalize = (s) => String(s ?? "").replace(/\s+/g, "");
const saveKey = (game) => `missing9_${game.title}`;

// 이름 초성 (류현진 → ㄹㅎㅈ). 한글 아닌 글자는 그대로
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const initials = (name) =>
  [...name]
    .map((ch) => {
      const c = ch.charCodeAt(0) - 0xac00;
      return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch;
    })
    .join("");

// -----------------------------
// 규칙 창
// -----------------------------

function RuleModal({ onClose }) {
  const [hide, setHide] = useState(false);
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white text-black p-7 shadow-2xl">
        <h2 className="text-3xl font-black text-center mb-6">⚾ Missing 9</h2>
        <div className="space-y-5 text-[15px] leading-7 text-zinc-700">
          <div>
            <div className="font-black text-lg text-black">🎯 목표</div>
            그 경기(또는 그 시즌) 라인업의 선수를 포지션마다 맞히세요. 투수와 지명타자까지 10명입니다.
          </div>
          <div>
            <div className="font-black text-lg text-black">🎮 방법</div>
            <ul className="list-disc ml-6">
              <li>칸에 이름을 입력하고 목록에서 고르거나 Enter.</li>
              <li>
                틀릴 때마다 힌트가 열립니다. {HINT_AT.season}번째 오답: <b>그 시즌 기록</b> · {HINT_AT.school}번째: 출신 학교·출생연도 ·{" "}
                {HINT_AT.initials}번째: 이름 초성
              </li>
              <li>시즌 기록은 정규시즌 1군 기준입니다. 경기·시즌 베스트는 그 팀 기록, 국제대회·골든글러브는 그해 전체 기록이에요. (3월 WBC는 직전 시즌)</li>
              <li>한 칸에서 {MAX_WRONG}번 틀리면 그 칸은 실패하고 정답이 공개됩니다.</li>
              <li>막히면 &quot;포기하고 정답 보기&quot;로 끝낼 수 있어요. 푼 기록은 저장돼서 목록에 표시됩니다.</li>
            </ul>
          </div>
          <div>
            <div className="font-black text-lg text-black">📂 문제 종류</div>
            <ul className="list-disc ml-6">
              <li>국제대회 · 한국시리즈 · 포스트시즌: 실제 경기 선발 라인업</li>
              <li>골든글러브: 그해 골든글러브 수상자 10명. 외야 3명은 아무 외야 칸에 넣어도 됩니다.</li>
              <li>
                시즌 베스트: 그 시즌 포지션별로 <b>타석이 가장 많았던 주전</b>, 지명타자는 그다음으로 많이 나온 타자, 투수는
                선발 등판이 가장 많은 투수. 외야 3명은 순서 상관없이 아무 외야 칸에 넣어도 됩니다.
              </li>
            </ul>
          </div>
          <div className="text-xs text-zinc-500">
            ※ SK·SSG, 우리·넥센·키움은 같은 팀으로 묶었습니다. 그 뒤로 이름을 바꾼 선수는 지금 이름으로도, 당시 이름으로도 맞힐 수
            있어요.
          </div>
        </div>
        <label className="flex items-center gap-2 mt-6 text-sm">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
          다음부터 보지 않기
        </label>
        <button
          onClick={() => {
            if (hide) store.set("missing9_rule", true);
            onClose();
          }}
          className="mt-4 w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl font-bold"
        >
          확인
        </button>
      </div>
    </div>
  );
}

// -----------------------------
// 칸 하나 (야구장 카드 / 모바일 목록 공용)
// -----------------------------

function Slot({ pos, answer, state, over, players, onSubmit, compact }) {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);

  const wrong = state?.wrong || 0;
  const done = state?.solved || state?.failed || over;

  const list = useMemo(() => {
    const q = normalize(text);
    if (!open || !q) return [];
    return players
      .filter((p) => p.name.includes(q))
      .sort((a, b) => b.name.startsWith(q) - a.name.startsWith(q) || b.careerWar - a.careerWar)
      .slice(0, 8);
  }, [text, open, players]);

  const submit = (picked) => {
    const value = picked ? picked.name : text;
    if (!normalize(value)) return;
    setOpen(false);
    setText("");
    const ok = onSubmit(pos, value, picked);
    if (!ok) {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }
  };

  // 힌트: 그 시즌 기록 → 출신 학교·출생연도 → 초성
  // (그해 KBO 기록이 없으면 첫 힌트는 투타·출생연도)
  const hints = [];
  if (!done) {
    const h = answer.hint || {};
    const born = answer.info?.birthdate ? `${answer.info.birthdate.slice(0, 4)}년생` : "";
    const hand = answer.info?.throws || "";
    if (wrong >= HINT_AT.season) hints.push(h.season || [hand, born].filter(Boolean).join(" · "));
    if (wrong >= HINT_AT.school) hints.push(h.season ? [h.school, born].filter(Boolean).join(" · ") : h.school || hand);
    if (wrong >= HINT_AT.initials) hints.push(`초성 ${initials(answer.name)}`);
  }

  const shownName = answer.oldName ? `${answer.name} (당시 ${answer.oldName})` : answer.name;

  return (
    <div
      className={`rounded-2xl text-center backdrop-blur-md transition-all ${
        compact ? "flex items-center gap-3 px-3 py-2 text-left" : "px-2 py-2 w-[140px] min-h-[92px]"
      } ${
        state?.solved
          ? "bg-emerald-900/70 border border-emerald-500/60"
          : flash
            ? "bg-red-900/70 border border-red-500/70"
            : done
              ? "bg-black/80 border border-red-400/40"
              : "bg-black/85 border-2 border-white/30"
      }`}
    >
      <div className={`text-[11px] font-black tracking-widest text-zinc-200 ${compact ? "w-8 shrink-0" : "mb-1"}`}>
        {posLabel(pos)}
      </div>

      <div className={compact ? "flex-1 min-w-0" : ""}>
        {done ? (
          <div className={`font-black text-sm ${state?.solved ? "text-emerald-300" : "text-red-300"}`}>{shownName}</div>
        ) : (
          <div className="relative">
            <input
              value={text}
              placeholder="???"
              onFocus={liftOnMobile}
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
                setIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setIdx((i) => Math.min(i + 1, list.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  submit(list[idx]);
                }
              }}
              className="w-full rounded-lg bg-zinc-700 border border-zinc-500 px-2 py-1 text-sm text-white text-center outline-none focus:bg-zinc-600"
            />
            {list.length > 0 && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-full min-w-[150px] rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl z-50 overflow-hidden">
                {list.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => submit(p)}
                    className={`w-full flex justify-between gap-2 px-3 py-2 text-sm text-white hover:bg-sky-600 ${i === idx ? "bg-sky-700" : ""}`}
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-zinc-400">{p.birthdate?.slice(0, 4)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {hints.length > 0 && (
          <div className="mt-1 text-[11px] leading-snug text-yellow-300 break-keep">
            {hints.filter(Boolean).map((h) => (
              // 야구장 카드는 좁아서 " · " 마다 줄바꿈
              <div key={h} className={compact ? "" : "mb-0.5"}>
                {compact ? h : h.split(" · ").map((x) => <div key={x}>{x}</div>)}
              </div>
            ))}
          </div>
        )}
        {!done && wrong > 0 && (
          <div className="text-[10px] text-zinc-400">
            {wrong}/{MAX_WRONG} 오답
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------
// 페이지
// -----------------------------

export default function Missing9() {
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [team, setTeam] = useState(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState({}); // 포지션 → {solved, failed, wrong}
  const [gaveUp, setGaveUp] = useState(false);
  const [showRule, setShowRule] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/games.json").then((r) => r.json()),
      fetch("/data/players.json").then((r) => r.json()),
    ]).then(([g, p]) => {
      setGames(g);
      setPlayers(p);
      setShowRule(!store.get("missing9_rule"));
    });
  }, []);

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);

  const list = useMemo(() => {
    if (!team || team === "전체") return games;
    const names = TEAM_GROUP[team] || [team];
    return games.filter((g) => names.includes(g.team));
  }, [games, team]);

  const game = list[index];
  // 외야가 OF1~3 으로 들어온 문제(시즌 베스트·골든글러브)는 외야 칸 순서 상관없음
  const ofFree = !!game?.lineup.some((l) => l.position === "OF1");

  // 정답표: 포지션 → {name, id, oldName, info(선수 정보)}
  const answers = useMemo(() => {
    if (!game) return {};
    return Object.fromEntries(game.lineup.map((l) => [l.position, { ...l, info: byId[l.id] }]));
  }, [game, byId]);
  const positions = ORDER.filter((p) => answers[p]);

  // 문제 열 때 저장된 기록 불러오기
  const openGame = (i, l = list) => {
    const g = l[i];
    setIndex(i);
    const saved = g && store.get(saveKey(g));
    setProgress(saved?.progress || {});
    setGaveUp(!!saved?.gaveUp);
  };

  const solvedCount = positions.filter((p) => progress[p]?.solved).length;
  const allDone = positions.length > 0 && positions.every((p) => progress[p]?.solved || progress[p]?.failed);
  const over = gaveUp || allDone;

  // 진행 저장 (팀 선택 화면의 "푼 문제 수"도 이걸 읽음)
  useEffect(() => {
    if (!game || (Object.keys(progress).length === 0 && !gaveUp)) return;
    store.set(saveKey(game), { progress, gaveUp, over, solved: solvedCount, total: positions.length });
  }, [game, progress, gaveUp, over, solvedCount, positions.length]);

  // 시즌 베스트 외야는 칸과 선수가 고정이 아님: 맞힌 칸은 맞힌 선수, 나머지 칸엔 남은 선수를 순서대로
  const OFS = ["OF1", "OF2", "OF3"];
  const answerFor = (pr, pos) => {
    if (!(ofFree && pos.startsWith("OF"))) return answers[pos];
    if (pr[pos]?.as) return answers[pr[pos].as];
    const taken = OFS.map((p) => pr[p]?.as).filter(Boolean);
    const restAnswers = OFS.filter((p) => !taken.includes(p));
    const restSlots = OFS.filter((p) => !pr[p]?.as);
    return answers[restAnswers[restSlots.indexOf(pos)]];
  };
  const answerAt = (pos) => answerFor(progress, pos);

  // 맞으면 true
  const submit = (pos, value, picked) => {
    const matches = (a) =>
      a &&
      (picked && a.id
        ? picked.id === a.id
        : normalize(value) === normalize(a.name) || (a.oldName && normalize(value) === normalize(a.oldName)));

    // 시즌 베스트 외야는 아직 안 맞힌 외야 선수 중 누구든
    let as = null;
    if (ofFree && pos.startsWith("OF")) {
      const taken = OFS.map((p) => progress[p]?.as).filter(Boolean);
      as = OFS.find((p) => !taken.includes(p) && matches(answers[p]));
    } else if (matches(answers[pos])) {
      as = pos;
    }

    if (as) {
      setProgress((pr) => ({ ...pr, [pos]: { ...pr[pos], solved: true, as } }));
      return true;
    }
    setProgress((pr) => {
      const wrong = (pr[pos]?.wrong || 0) + 1;
      const failed = wrong >= MAX_WRONG;
      // 실패한 외야 칸은 그때 보이던 선수로 고정
      const fixed = failed && pos.startsWith("OF") ? { as: OFS.find((p) => answers[p] === answerFor(pr, pos)) } : {};
      return { ...pr, [pos]: { ...pr[pos], wrong, failed, ...fixed } };
    });
    return false;
  };

  // -----------------------------
  // 팀 고르기 화면
  // -----------------------------
  if (team === null) {
    return (
      <>
        {showRule && <RuleModal onClose={() => setShowRule(false)} />}
        <div
          className="min-h-screen flex flex-col items-center justify-center text-white relative px-4 py-10"
          style={{ backgroundImage: "url('/stadium_bg.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-black mb-3 drop-shadow-lg">Missing 9</h1>
            <p className="mb-8 text-white/80 text-center">그날의 라인업, 그 시즌의 주전을 맞혀 보세요.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full">
              {TEAMS.map((t) => {
                const names = TEAM_GROUP[t] || [t];
                const mine = t === "전체" ? games : games.filter((g) => names.includes(g.team));
                const cleared = mine.filter((g) => store.get(saveKey(g))?.over).length;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      const l = t === "전체" ? games : mine;
                      setTeam(t);
                      openGame(0, l);
                    }}
                    className="rounded-xl bg-white text-black hover:bg-zinc-200 py-3 font-black shadow-lg"
                  >
                    {t}
                    <div className="text-[11px] font-semibold text-zinc-500">
                      {cleared}/{mine.length}
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowRule(true)} className="mt-6 text-sm underline text-white/70 hover:text-white">
              규칙 보기
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!game) {
    return <div className="min-h-screen flex items-center justify-center text-3xl">Loading...</div>;
  }

  const slotProps = (pos) => ({
    pos,
    answer: answerAt(pos),
    state: progress[pos],
    over,
    players,
    onSubmit: submit,
  });

  return (
    <div
      className="min-h-screen text-white relative px-3 py-6 md:px-6"
      style={{ backgroundImage: "url('/stadium_bg.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {showRule && <RuleModal onClose={() => setShowRule(false)} />}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 mx-auto w-full max-w-[900px]">
        {/* 상단 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex gap-2">
            <Link href="/" className="bg-gray-200 text-black hover:bg-gray-300 px-3 py-2 rounded-xl font-bold text-sm">
              🏠 홈
            </Link>
            <button onClick={() => setTeam(null)} className="bg-sky-600 hover:bg-sky-500 px-3 py-2 rounded-xl font-bold text-sm">
              팀 선택
            </button>
          </div>
          <button onClick={() => setShowRule(true)} className="bg-white text-black hover:bg-zinc-200 px-3 py-2 rounded-xl font-bold text-sm">
            📖 규칙
          </button>
        </div>

        {/* 문제 제목 + 이동 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            onClick={() => openGame(index - 1)}
            disabled={index === 0}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 px-3 py-2 rounded-xl font-bold text-sm shrink-0"
          >
            ← 이전
          </button>
          <div className="text-center min-w-0">
            <div className="text-xl md:text-2xl font-black">{game.title}</div>
            <div className="text-xs md:text-sm font-bold text-sky-300">
              {game.team === "골든글러브" ? "수상자 맞히기" : `${game.team} 라인업`}{game.opponent && game.opponent !== "-" ? ` · vs ${game.opponent}` : ""} · {game.category}
            </div>
            <div className="text-xs text-zinc-300">
              {index + 1} / {list.length} · {solvedCount}/{positions.length} 정답
            </div>
          </div>
          <button
            onClick={() => openGame(index + 1)}
            disabled={index === list.length - 1}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 px-3 py-2 rounded-xl font-bold text-sm shrink-0"
          >
            다음 →
          </button>
        </div>

        {/* 데스크톱·태블릿: 야구장 */}
        <div
          className="hidden md:block relative w-full mb-24 aspect-[9/7] rounded-3xl border border-white/20 bg-black/20 shadow-2xl"
          style={{ backgroundImage: "url('/baseball_field.png')", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }}
        >
          {positions.map((pos) => (
            <div
              key={`${game.title}-${pos}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 focus-within:z-40"
              style={{ left: `${SPOT[pos][0]}%`, top: `${SPOT[pos][1]}%` }}
            >
              <Slot {...slotProps(pos)} />
            </div>
          ))}
        </div>

        {/* 모바일: 목록 */}
        <div className="md:hidden space-y-1.5">
          {positions.map((pos) => (
            <div key={`${game.title}-${pos}`} className="focus-within:relative focus-within:z-40">
              <Slot {...slotProps(pos)} compact />
            </div>
          ))}
        </div>

        {/* 결과 / 포기 */}
        <div className="mt-4 text-center">
          {over ? (
            <div className="rounded-2xl bg-black/70 border border-white/20 p-4">
              <div className={`text-3xl font-black ${solvedCount === positions.length ? "text-emerald-400" : "text-white"}`}>
                {solvedCount === positions.length ? "🎉 CLEAR" : `${solvedCount}/${positions.length} 맞힘`}
              </div>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  onClick={() => {
                    store.set(saveKey(game), null);
                    openGame(index);
                  }}
                  className="bg-zinc-700 hover:bg-zinc-600 px-5 py-2.5 rounded-xl font-bold"
                >
                  다시 풀기
                </button>
                {index < list.length - 1 && (
                  <button onClick={() => openGame(index + 1)} className="bg-sky-600 hover:bg-sky-500 px-5 py-2.5 rounded-xl font-black">
                    다음 문제 →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setGaveUp(true)}
              className="bg-zinc-800/90 hover:bg-zinc-700 px-5 py-2.5 rounded-xl font-bold text-zinc-200"
            >
              포기하고 정답 보기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
