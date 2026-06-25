"use client";

import { useEffect, useState } from "react";

const POSITION_STYLE = {
  P:   "top-[60%] left-[50%]",

  "1B":"top-[60%] left-[72%]",
  "2B":"top-[40%] left-[62%]",
  SS:  "top-[40%] left-[38%]",
  "3B":"top-[60%] left-[28%]",

  C:   "top-[88%] left-[50%]",

  LF:  "top-[28%] left-[22%]",
  CF:  "top-[18%] left-[50%]",
  RF:  "top-[28%] left-[78%]",

  OF1: "top-[28%] left-[22%]",
  OF2: "top-[18%] left-[50%]",
  OF3: "top-[28%] left-[78%]",

  DH:  "top-[86%] left-[72%]",
};
function RuleModal({ hideRule, setHideRule, setShowRule }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[520px] rounded-3xl bg-white text-black p-8 shadow-2xl">

        <h2 className="text-3xl font-black text-center mb-6">
          ⚾ Missing9
        </h2>

        <div className="space-y-5 text-[15px] leading-7">

          <div>
            <div className="font-bold text-lg">
              🎯 목표
            </div>

            <div className="text-zinc-700">
              숨겨진 9명의 선수를 모두 맞히세요.
            </div>
          </div>

          <div>
            <div className="font-bold text-lg">
              🎮 게임 방법
            </div>

            <ul className="list-disc ml-6 text-zinc-700">
              <li>각 포지션의 선수를 입력합니다.</li>
              <li>Enter를 누르면 정답 여부를 확인합니다.</li>
              <li>정답이면 해당 칸이 고정됩니다.</li>
              <li>오답이면 힌트가 순서대로 공개됩니다.</li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-lg">
              💡 힌트
            </div>

            <ul className="list-disc ml-6 text-zinc-700">
              <li>1번째 오답 : 던지는 손</li>
              <li>3번째 오답 : 치는 손</li>
              <li>5번째 오답 : 출생연도</li>
              <li>6번째 오답 : 실패 및 정답 공개</li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-lg">
              ⭐ 시즌 베스트
            </div>

            <div className="text-zinc-700">
              시즌 베스트 문제에서는 외야수(LF/CF/RF)를 구분하지 않습니다.
              <br />
              외야수 3명 중 누구를 입력해도 자동으로 정답 처리됩니다.
            </div>
          </div>

          <div>
            <div className="font-bold text-lg">
              📂 문제 종류
            </div>

            <div className="text-zinc-700">
              • 국가대표
              <br />
              • 정규시즌
              <br />
              • 포스트시즌
              <br />
              • 시즌 베스트
            </div>
          </div>

          <div className="text-xs
md:text-sm text-zinc-500">
            ※ SK·SSG는 같은 팀으로 취급됩니다.
            <br />
            ※ 우리·넥센·키움은 같은 팀으로 취급됩니다.
          </div>
<p className="mt-6 text-center text-xs text-zinc-500">
  최적 환경: PC 및 스마트폰 브라우저
  <br />
  일부 태블릿 브라우저에서는 기능이 정상 동작하지 않을 수 있습니다.
</p>
        </div>

        <label className="flex items-center gap-2 mt-6 text-xs
md:text-sm">
          <input
            type="checkbox"
            checked={hideRule}
            onChange={(e) =>
              setHideRule(e.target.checked)
            }
          />
          다음부터 보지 않기
        </label>

        <button
          onClick={() => {

            if (hideRule) {
              localStorage.setItem(
                "missing9_rule",
                "true"
              );
            }

            setShowRule(false);

          }}
          className="mt-6 w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl font-bold"
        >
          확인
        </button>

      </div>
    </div>
  );
}
export default function Missing9() {
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [inputValues, setInputValues] = useState({});
  const [solved, setSolved] = useState({});
  const [attempts, setAttempts] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [wrongFlash, setWrongFlash] = useState({});
  const [failed, setFailed] = useState({});
  const [filteredPlayers, setFilteredPlayers] = useState({});
  const [selectedIndex, setSelectedIndex] = useState({});
  const [selectedTeam, setSelectedTeam]
  = useState(null);
  const [showRule, setShowRule] = useState(true);
const [hideRule, setHideRule] = useState(false);

 // 게임 전환 시 상태 초기화
const resetGame = () => {
  setSolved({});
  setInputValues({});
  setAttempts({});
  setShowAnswers(false);
  setWrongFlash({});
  setFailed({});
  setFilteredPlayers({});
setSelectedIndex({});
};
const filteredGames =
  selectedTeam === null ||
  selectedTeam === "전체"
    ? games
    : games.filter((game) => {

        if (selectedTeam === "SSG") {
          return ["SSG", "SK"].includes(
            game.team
          );
        }

        if (selectedTeam === "키움") {
          return ["키움", "넥센", "우리"].includes(
            game.team
          );
        }

        return game.team === selectedTeam;

      });
      useEffect(() => {

  const hide =
    localStorage.getItem("missing9_rule");

  if (hide === "true") {

    setShowRule(false);

  }

}, []);
useEffect(() => {

fetch("/data/games.json")
  .then((res) => res.json())
  .then((data) => {
    setGames(data);
  });

  fetch("/data/players_shuffled.json")
    .then((res) => res.json())
    .then((data) => setPlayers(data));

}, []);
if (selectedTeam === null) {
  return (
  <>  
  {showRule && (
  <RuleModal
    hideRule={hideRule}
    setHideRule={setHideRule}
    setShowRule={setShowRule}
  />
)}
    <div
  className="min-h-screen flex flex-col items-center justify-center text-white relative overflow-hidden"
  style={{
    backgroundImage: "url('/stadium_bg.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
  <div className="absolute inset-0 bg-black/35" />

<div className="relative z-10 flex flex-col items-center">
  

  <h1 className="
text-4xl
md:text-7xl
font-black
mb-8
md:mb-12
text-center
drop-shadow-lg
">
    Missing9
  </h1>

  <div className="grid grid-cols-4 gap-4">

    {[
      "전체",
      "대한민국",
      "삼성",
      "두산",
      "LG",
      "롯데",
      "KIA",
      "한화",
      "SSG",
      "KT",
      "키움",
      "NC"
    ].map((team) => (

      <button
        key={team}
        onClick={() => {
          resetGame();
          setSelectedTeam(team);
          setCurrentGameIndex(0);
        }}
        className="
          w-full
h-12
md:w-24
          bg-white
          text-black
          hover:bg-zinc-200
          rounded-xl
          font-bold
          shadow-lg
          transition
        "
      >
        {team}
      </button>

    ))}

  </div>
</div>
    </div>
    </>
  );
}

if (games.length === 0) {
  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      로딩중...
    </div>
  );
}
const game = filteredGames[currentGameIndex];

if (!game) {
  return null;
}

const lineup = game.lineup;
const answerMap = {};

lineup.forEach((player) => {

  const info = players.find(
    (p) => p.name === player.name
  );

  const throwInfo = info?.throws || "";

  answerMap[player.position] = {

    ...player,

    throws: throwInfo,

      birthYear:
    info?.birthdate
      ?.slice(0, 4) ?? ""

  };

});

  const totalPlayers = Object.keys(answerMap).length;
  const solvedCount = Object.keys(solved).length;
  const isClear = solvedCount === totalPlayers;


  const goToPrev = () => {
    if (currentGameIndex > 0) {
      setCurrentGameIndex((i) => i - 1);
      resetGame();
    }
  };

  const goToNext = () => {
    if (currentGameIndex < filteredGames.length - 1) {
      setCurrentGameIndex((i) => i + 1);
      resetGame();
    }
  };

  const normalize = (str) =>
    str.trim().replace(/\s+/g, "");
const isSeasonBest =
  game.category === "시즌 베스트";

  const checkAnswer = (position) => {

  const input =
    inputValues[position] ?? "";

  if (!normalize(input))
    return;

  if (failed[position])
    return;
 // 자동완성 목록 닫기
  setFilteredPlayers(prev => ({
    ...prev,
    [position]: [],
  }));
  // --------------------
  // 시즌 베스트 외야 처리
  // --------------------

  if (
    isSeasonBest &&
    position.startsWith("OF")
  ) {

    const ofPositions =
      ["OF1", "OF2", "OF3"];

    const matchedPosition =
      ofPositions.find((pos) => {

        if (
          solved[pos] ||
          failed[pos]
        ) {
          return false;
        }

        return (
          normalize(
            answerMap[pos]?.name || ""
          ) === normalize(input)
        );

      });

    if (matchedPosition) {

      setSolved((prev) => ({
        ...prev,
        [matchedPosition]: true,
      }));

      setInputValues((prev) => ({
        ...prev,
        [position]: "",
      }));
setFilteredPlayers(prev=>({
  ...prev,
  [position]:[],
}));
      return;

    }

  }

  const correct =
    answerMap[position].name;

  if (
    normalize(input) ===
    normalize(correct)
  ) {

    setSolved((prev) => ({
  ...prev,
  [position]: true,
}));

setInputValues((prev) => ({
  ...prev,
  [position]: "",
}));

setFilteredPlayers((prev) => ({
  ...prev,
  [position]: [],
}));

  } else {

    const nextCount =
      (attempts[position] || 0) + 1;

    setAttempts((prev) => ({
      ...prev,
      [position]: nextCount,
    }));

    setWrongFlash((prev) => ({
      ...prev,
      [position]: true,
    }));

    setTimeout(() => {

      setWrongFlash((prev) => ({
        ...prev,
        [position]: false,
      }));

    }, 600);

    if (nextCount >= 6) {

      setFailed((prev) => ({
        ...prev,
        [position]: true,
      }));

    }
setFilteredPlayers((prev) => ({
  ...prev,
  [position]: [],
}));
  }
};

const getHint = (position) => {

  const player =
    answerMap[position];

  if (!player)
    return "";

  const count =
    attempts[position] || 0;

  const hand = player.throws || "";

const throwHand = hand.slice(0, 2);
const batHand = hand.slice(2);
  const hints = [];

  if (count >= 1)
    hints.push(
      `던지는 손: ${throwHand}`
    );

  if (count >= 3)
    hints.push(
      `치는 손: ${batHand}`
    );

  if (count >= 5)
    hints.push(
      `나이: ${player.birthYear}년생`
    );

  return hints;
};
  return (
  <div
    className="min-h-screen text-white flex flex-col items-center py-10 px-4 relative overflow-hidden"
    style={{
      backgroundImage: "url('/stadium_bg.webp')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
  >
<div className="absolute inset-0 bg-black/25" />
<div className="relative z-10 w-full flex flex-col items-center">

  {showRule && (
    <RuleModal
      hideRule={hideRule}
      setHideRule={setHideRule}
      setShowRule={setShowRule}
    />
  )}
{/* 헤더 */}
<div
className="
flex
flex-col
md:flex-row
items-center
gap-3
mb-4
"
>

  <button
    onClick={goToPrev}
    disabled={currentGameIndex === 0}
    className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl"
  >
    ← 이전
  </button>

<button
  onClick={() => {
    setSelectedTeam(null);
    setCurrentGameIndex(0);
    resetGame();
  }}
  className="
md:fixed
md:top-16
md:left-40

bg-sky-600
hover:bg-sky-500

px-4
py-2

rounded-xl

font-bold
shadow-lg

w-full
md:w-auto
"
>
  팀 선택
</button>

  <div className="text-center">
  <div className="text-2xl font-black tracking-tight">
    {currentGameIndex + 1}. {game.title}
  </div>

  <div className="text-xs
md:text-sm font-bold text-sky-300 mt-1">
    {game.team} 라인업 맞추기
  </div>

  <div className="text-xs text-zinc-300">
    vs {game.opponent}
  </div>

  <div className="text-xs text-zinc-500 mt-1">
    {currentGameIndex + 1} / {filteredGames.length}
  </div>

</div>
  <button
  onClick={() => setShowRule(true)}
  className="
md:fixed
md:top-16
md:right-10

bg-white
text-black

hover:bg-zinc-200

px-4
py-2

rounded-xl

font-bold
shadow-lg

w-full
md:w-auto
"
>
  📖 규칙
</button>

        <button
          onClick={goToNext}
          disabled={currentGameIndex === filteredGames.length - 1}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed px-4 py-2 rounded-xl font-bold transition-colors text-xs
md:text-sm"
        >
          다음 →
        </button>
      </div>

      {/* 카테고리 + 난이도 뱃지 */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
          {game.category}
        </span>
        <span className="text-xs
md:text-sm text-zinc-100 font-semibold">
          {solvedCount} / {totalPlayers} 정답
        </span>
      </div>
<div className="md:hidden text-center text-xs text-zinc-300 mb-2">

← 좌우로 밀어서 야구장 보기 →

</div>
      {/* 야구장 */}

<div className="w-full overflow-x-auto pb-4">

  <div
    className="
      relative
      mx-auto
      w-full
      min-w-[700px]
      max-w-[900px]
      aspect-[9/7]
      rounded-3xl
      overflow-hidden
      border
      border-white/20
      bg-black/20
      backdrop-blur-sm
      shadow-2xl
    "
    style={{
      backgroundImage: "url('/baseball_field.png')",
      backgroundSize: "contain",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
    }}
  >
        {/* 딤 오버레이 */}
        <div className="absolute inset-0 bg-black/15" />

        {Object.keys(POSITION_STYLE).map((position) => {
          const player = answerMap[position];
          if (!player) return null;

          const isSolved = solved[position];
          const isWrong = wrongFlash[position];
          const hint = getHint(position);

          return (
            <div
              key={position}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${POSITION_STYLE[position]}`}
            >
              <div
                className={`
                  rounded-2xl px-3 py-2 w-[70px]
md:w-[110px] min-h-[85px]
md:min-h-[95px] text-center
                  backdrop-blur-md transition-all duration-300
                  ${isSolved
                    ? "bg-emerald-900/60 border border-emerald-500/50 shadow-emerald-500/20 shadow-lg"
                    : isWrong
                    ? "bg-red-900/60 border border-red-500/60"
                    : "bg-black/85 border-2 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                  }
                `}
              >
                {/* 포지션 레이블 */}
                <div className="text-[11px] text-zinc-200 mb-1 font-black tracking-widest">
  {position.startsWith("OF") ? "OF" : position}
</div>

                {isSolved || showAnswers || failed[position] ? (
                  <div
  className={`font-black text-xs
md:text-sm ${
    isSolved
      ? "text-emerald-400"
      : failed[position]
      ? "text-red-400"
      : "text-zinc-300"
  }`}
>
                    {player.name}
                  </div>
                ) : (
                  <>
                    <input
                      value={inputValues[position] ?? ""}
                      onChange={(e) => {

  const value = e.target.value;

  setInputValues((prev) => ({
    ...prev,
    [position]: value,
  }));

  if (!value.trim()) {

    setFilteredPlayers((prev) => ({
      ...prev,
      [position]: [],
    }));

    return;
  }

  const filtered = players
  .filter((p) =>
    p.name.includes(value)
  )
  .sort((a, b) => {

    const aStarts = a.name.startsWith(value);
    const bStarts = b.name.startsWith(value);

    if (aStarts === bStarts) return 0;

    return bStarts - aStarts;

  })
  .slice(0, 8);

  setFilteredPlayers((prev) => ({
    ...prev,
    [position]: filtered,
  }));

  setSelectedIndex((prev) => ({
    ...prev,
    [position]: 0,
  }));

}}
                      onKeyDown={(e)=>{

  if(e.key==="ArrowDown"){

    e.preventDefault();

    setSelectedIndex(prev=>({

      ...prev,

      [position]:
        Math.min(
          (prev[position] ?? 0)+1,
          (filteredPlayers[position]?.length ?? 1)-1
        )

    }));

  }

  else if(e.key==="ArrowUp"){

    e.preventDefault();

    setSelectedIndex(prev=>({

      ...prev,

      [position]:
        Math.max(
          (prev[position] ?? 0)-1,
          0
        )

    }));

  }

  else if(e.key==="Enter"){

    if(filteredPlayers[position]?.length){

      const player =
        filteredPlayers[position][
          selectedIndex[position] ?? 0
        ];

      setInputValues(prev=>({

        ...prev,

        [position]:player.name

      }));

      setFilteredPlayers(prev=>({

        ...prev,

        [position]:[]

      }));

    }else{

      checkAnswer(position);

    }

  }

}}
                      className={`
                        w-full text-center rounded-lg px-2 py-1 outline-none text-xs
md:text-sm transition-colors
                        ${isWrong
                          ? "bg-red-900/40 text-red-200"
                          : "bg-zinc-700 text-white border border-zinc-500 focus:bg-zinc-600"
                        }
                      `}
                      placeholder="???"
                    />
                    {filteredPlayers[position]?.length > 0 && (
  <div
    className="
      absolute
      left-1/2
      -translate-x-1/2
      top-full
      mt-1
      w-full min-w-[120px]
      rounded-xl
      bg-zinc-900
      border
      border-zinc-700
      shadow-xl
      z-50
      overflow-hidden
    "
  >
    {filteredPlayers[position].map((player, idx) => (
      <button
        key={player.id ?? player.name}
        type="button"
        onClick={() => {

  setInputValues(prev => ({
    ...prev,
    [position]: player.name,
  }));

  setFilteredPlayers(prev => ({
    ...prev,
    [position]: [],
  }));

  setTimeout(() => {
    checkAnswer(position);
  }, 0);

}}
        className={`
          w-full
          text-left
          px-3
          py-2
          text-sm
          hover:bg-sky-600
          ${
            idx === (selectedIndex[position] ?? 0)
              ? "bg-sky-700"
              : ""
          }
        `}
      >
        {player.name}
      </button>
    ))}
  </div>
)}
                    {hint.length > 0 && (
  <div className="text-[10px]
md:text-[12px] text-yellow-300 mt-1 leading-normal">
    {hint.map((h, idx) => (
      <div key={idx}>
        {h}
      </div>
    ))}
  </div>
)}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
</div>
        {/* CLEAR 연출 */}
      {isClear && (
        <div className="mt-8 text-center animate-bounce">
          <div className="text-5xl font-black text-emerald-400 drop-shadow-lg">
            🎉 CLEAR
            
          </div>
          
          <div className="mt-2 text-zinc-400 text-xs
md:text-sm">
            모든 선수를 맞췄습니다!
          </div>
        </div>
      )}
    </div>
    </div>
    
  );
}
