"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [players, setPlayers] =
    useState([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [input, setInput] =
    useState("");

  const [suggestions, setSuggestions] =
    useState([]);

  const [selectedPlayer, setSelectedPlayer] =
    useState(null);

  const [guesses, setGuesses] =
    useState([]);

  const [gameOver, setGameOver] =
    useState(false);

  const [jumpInput, setJumpInput] =
    useState("");
  

  const [difficulty, setDifficulty] =
    useState(null);

  const [showRule, setShowRule] = useState(true);

  const [hideRule, setHideRule] = useState(false);  

  // -----------------------------
  // 데이터 불러오기
  // -----------------------------

useEffect(() => {

  if (difficulty === null) return;

  let file = "/data/players.json";

  if (difficulty === "war5") {
    file = "/data/players_war5.json";
  }

  if (difficulty === "war10") {
    file = "/data/players_war10.json";
  }

fetch(file)
  .then((res) => res.json())
  .then((data) => {

    setPlayers(data);

    setCurrentIndex(0);

  });

}, [difficulty]);
useEffect(() => {

  const hide =
    localStorage.getItem("whoareya_rule");

  if (hide === "true") {

    setShowRule(false);

  }

}, []);
  // -----------------------------
  // 현재 정답
  // -----------------------------
if (difficulty === null) {

  return (
     <>

      {showRule && (
        <RuleModal
          hideRule={hideRule}
          setHideRule={setHideRule}
          setShowRule={setShowRule}
        />
      )}

    <main
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
      }}
    >

      <div className="bg-white/80 rounded-3xl p-6 md:p-12 text-center">

        <h1 className="text-5xl font-black mb-10">

          ⚾ KBO WHO ARE YA

        </h1>

        <div className="flex flex-col gap-4">

          <button
            onClick={() => setDifficulty("all")}
            className="bg-blue-500 text-white py-4
text-lg rounded-xl font-bold"
          >
          🟦 전체 선수
          </button>

          <button
            onClick={() => setDifficulty("war5")}
            className="bg-green-500 text-white py-4
text-lg rounded-xl font-bold"
          >
          🟩 통산 WAR 5+
          </button>

          <button
            onClick={() => setDifficulty("war10")}
            className="bg-red-500 text-white py-4
text-lg rounded-xl font-bold"
          >
          🟥 통산 WAR 10+
          </button>

        </div>

      </div>

    </main>
</>
  );

}
  const answer =
    players[currentIndex];

  // -----------------------------
  // 비교 함수
  // -----------------------------

  const compareValue = (
    guessValue,
    answerValue
  ) => {

    return guessValue === answerValue;

  };

  // -----------------------------
  // 숫자 비교
  // -----------------------------

  const compareNumber = (
    guessValue,
    answerValue
  ) => {

    if (guessValue === answerValue) {
      return "same";
    }

    if (guessValue < answerValue) {
      return "up";
    }

    return "down";

  };

  // -----------------------------
  // 추측 처리
  // -----------------------------

  const handleGuess = () => {

    if (gameOver) return;

    let player = selectedPlayer;

    if (!player) {

      if (suggestions.length === 0) {

        alert("선수를 찾을 수 없습니다.");

        return;

      }

      player = suggestions[0];

    }

    const result = {

      player,

      correct:
        player.id === answer.id,

      team: compareValue(
        player.team,
        answer.team
      ),

      position: compareValue(
        player.position,
        answer.position
      ),

      throws: compareValue(
        player.throws,
        answer.throws
      ),

      nationality: compareValue(
        player.nationality,
        answer.nationality
      ),

      ageResult: compareNumber(
        player.age,
        answer.age
      ),

    };

    const newGuesses = [
      result,
      ...guesses,
    ];

    setGuesses(newGuesses);

    setInput("");

    setSelectedPlayer(null);

    setSuggestions([]);

    // 정답 처리

    if (player.id === answer.id) {

      setGameOver(true);

      return;

    }

    // 게임 종료

    if (newGuesses.length >= 8) {

      setGameOver(true);

      setTimeout(() => {

        alert(
          `게임 종료! 정답은 ${answer.name}`
        );

      }, 100);

    }

  };

  // -----------------------------
  // 초기화
  // -----------------------------

  const resetGame = () => {

    setInput("");

    setSuggestions([]);

    setSelectedPlayer(null);

    setGuesses([]);

    setGameOver(false);

  };

  // -----------------------------
  // 다음 문제
  // -----------------------------

  const nextPlayer = () => {

    setCurrentIndex((prev) => {

      if (prev >= players.length - 1) {
        return 0;
      }

      return prev + 1;

    });

    resetGame();

  };

  // -----------------------------
  // 이전 문제
  // -----------------------------

  const prevPlayer = () => {

    setCurrentIndex((prev) => {

      if (prev <= 0) {
        return players.length - 1;
      }

      return prev - 1;

    });

    resetGame();

  };

  // -----------------------------
  // 번호 이동
  // -----------------------------

  const jumpToPlayer = () => {

    const index =
      Number(jumpInput) - 1;

    if (
      isNaN(index) ||
      index < 0 ||
      index >= players.length
    ) {

      alert("존재하지 않는 번호입니다.");

      return;

    }

    setCurrentIndex(index);

    resetGame();

  };

  // -----------------------------
  // 색상
  // -----------------------------

  const getColor = (value) => {

    return value
      ? "bg-green-400 border-green-500"
      : "bg-white border-gray-300";

  };

  // -----------------------------
  // 나이 표시
  // -----------------------------

  const getAgeDisplay = (
    age,
    result
  ) => {

    if (result === "same") {

      return (

        <div className="bg-green-400 border border-green-500 p-2 md:p-3 rounded-xl text-center font-bold text-black shadow-sm">

          {age} =

        </div>

      );

    }

    if (result === "up") {

      return (

        <div className="bg-yellow-300 border border-yellow-400 p-2
md:p-3 rounded-xl text-center font-bold text-black shadow-sm">

          {age} ↑

        </div>

      );

    }

    return (

      <div className="bg-yellow-300 border border-yellow-400 p-2
md:p-3 rounded-xl text-center font-bold shadow-sm">

        {age} ↓

      </div>

    );

  };

  // -----------------------------
  // 로딩
  // -----------------------------

  if (!answer) {

    return (

      <main className="min-h-screen bg-gray-100 flex items-center justify-center text-3xl">

        Loading...

      </main>

    );

  }

  // -----------------------------
  // 화면
  // -----------------------------

return (
<>
  {showRule && (
    <RuleModal
      hideRule={hideRule}
      setHideRule={setHideRule}
      setShowRule={setShowRule}
    />
  )}

  <main
       className="
    min-h-screen
    relative
    overflow-hidden
    bg-cover
    bg-center
    px-3
    py-4
    md:p-6
  "
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
      }}
    >

      {/* 배경 오버레이 */}

      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/50 to-orange-100/65 backdrop-blur-[2px]" />

      <div className="w-full max-w-6xl mx-auto relative z-10">

        {/* 상단 */}

        <div className="
bg-white/75
backdrop-blur-md
border
border-gray-200
rounded-[28px]
shadow-2xl
p-4
md:p-7
mb-6
relative
">

          {/* 문제 번호 이동 */}

          <div className="hidden md:flex
absolute
left-7
top-1/2 -translate-y-1/2 flex gap-2 z-20">

            <input
              type="number"
              placeholder="#"
              value={jumpInput}

              onChange={(e) =>
                setJumpInput(
                  e.target.value
                )
              }

              onKeyDown={(e) => {

                if (e.key === "Enter") {

                  jumpToPlayer();

                }

              }}

              className="p-2 rounded-xl border border-gray-300 bg-gray-50 text-black w-20 text-sm outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 transition-all shadow-sm"
            />

            <button
              onClick={jumpToPlayer}
              className="bg-yellow-400 hover:bg-yellow-300 text-black transition-all px-4 py-2 rounded-xl font-bold shadow-md text-sm"
            >
              이동
            </button>

          </div>

          {/* 제목 */}

          <div className="text-center">

            <h1 className="
text-3xl
md:text-4xl
font-black
tracking-tight
text-gray-900
drop-shadow-sm
">

              ⚾ KBO WHO ARE YA

<div className="text-lg font-bold mt-2">

{difficulty === "all" && "전체 선수"}

{difficulty === "war5" && "WAR 5+"}

{difficulty === "war10" && "WAR 10+"}

<div className="md:hidden mt-3 flex justify-center gap-2">

  <input
    type="number"
    placeholder="#"
    value={jumpInput}
    onChange={(e) => setJumpInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        jumpToPlayer();
      }
    }}
    className="
      w-20
      p-2
      rounded-xl
      border
      border-gray-300
      bg-gray-50
      text-black
      text-sm
      outline-none
    "
  />

  <button
    onClick={jumpToPlayer}
    className="
      bg-yellow-400
      hover:bg-yellow-300
      px-4
      py-2
      rounded-xl
      font-bold
      text-black
    "
  >
    이동
  </button>

</div>

</div>

            </h1>

            <div className="text-gray-500 mt-2 text-xs md:text-sm font-semibold">

              PROBLEM #{currentIndex + 1}

            </div>

          </div>


             {/* 남은 기회 */}

<div className="hidden md:block
absolute
right-7
top-1/2 -translate-y-1/2 bg-white/80 border border-gray-200 w-full
md:w-auto
px-5
py-3 rounded-2xl shadow-sm text-center">

  <div className="text-sm text-gray-500 font-semibold">
    남은 기회
  </div>

  <div className="text-2xl font-black text-gray-800">
    {8 - guesses.length}
  </div>

</div>
<div className="md:hidden mt-3 flex justify-center">

  <div className="bg-white rounded-xl px-4 py-2 shadow font-bold">

    남은 기회 : {8 - guesses.length}

  </div>

</div>
<button
  onClick={() => setShowRule(true)}
  className="
    hidden md:block
absolute
right-7
top-[110px]
    bg-white
    hover:bg-gray-100
    border
    border-gray-300
    rounded-xl
    px-4
    py-2
    font-bold
    shadow
  "
>
  📖 규칙
</button>
<div className="md:hidden mt-3 flex justify-center">

  <button
    onClick={() => setShowRule(true)}
    className="
      bg-white
      border
      border-gray-300
      rounded-xl
      px-4
      py-2
      shadow
      font-bold
    "
  >
    📖 규칙
  </button>

</div>
            </div>


        {/* 선수 입력 */}

        <div className="bg-white/75 backdrop-blur-md border border-gray-200 rounded-[28px] shadow-xl p-5 mb-8 relative">

          <div className="
flex
flex-col
md:flex-row
items-center
justify-center
gap-3
">

            <input
              type="text"
              placeholder="선수 이름 입력"
              value={input}

              onKeyDown={(e) => {

                if (e.key === "Enter") {

                  handleGuess();

                }

              }}

              onChange={(e) => {

                const value = e.target.value;

                setInput(value);

                setSelectedPlayer(null);

                if (!value.trim()) {

                  setSuggestions([]);

                  return;

                }

                const filtered =
                  players.filter(
                    (player) =>
                      player.name.includes(value)
                  );

                setSuggestions(
                  filtered.slice(0, 10)
                );

              }}

              className="p-2
md:p-3 rounded-xl border border-gray-300 bg-gray-50 text-black w-full
md:w-80 text-base outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-200 transition-all shadow-sm"
            />

            <button
              onClick={handleGuess}
              className="bg-blue-500 hover:bg-blue-400 text-white transition-all w-full
md:w-auto
px-5
py-3 rounded-xl font-bold shadow-md"
            >
              입력
            </button>

            <button
              onClick={prevPlayer}
              className="bg-gray-700 hover:bg-gray-600 text-white transition-all w-full
md:w-auto
px-5
py-3 rounded-xl font-bold shadow-md"
            >
              이전
            </button>

            <button
              onClick={nextPlayer}
              className="bg-gray-700 hover:bg-gray-600 text-white transition-all w-full
md:w-auto
px-5
py-3 rounded-xl font-bold shadow-md"
            >
              다음
            </button>
<button
  onClick={() => {

    setDifficulty(null);

    setPlayers([]);

    setCurrentIndex(0);

    resetGame();

  }}

  className="bg-red-500 hover:bg-red-400 text-white transition-all w-full
md:w-auto
px-5
py-3 rounded-xl font-bold shadow-md"
>

난이도 선택

</button>
          </div>

          {/* 자동완성 */}

          {suggestions.length > 0 && (

            <div className="absolute
left-0
right-0
top-16
md:left-1/2
md:right-auto
md:-translate-x-1/2 bg-white border border-gray-300 rounded-2xl w-full
md:w-80 overflow-hidden shadow-2xl z-50">

              {suggestions.map((player) => {

                const samePlayers =
                  players.filter(
                    (p) =>
                      p.name === player.name &&
                      p.team === player.team
                  );

                return (

                  <div
                    key={player.id}

                    onClick={() => {

                      setSelectedPlayer(player);

                      setInput(player.name);

                      setSuggestions([]);

                    }}

                    className="
p-3
md:p-3
hover:bg-gray-100
transition-all
cursor-pointer
border-b
border-gray-200
text-base
text-black
font-semibold
"
                  >

                    {samePlayers.length > 1 ? (

                      <>
                        {player.name}
                        {" "}
                        (
                        {player.team}
                        {" • "}
                        {player.birthdate?.slice(0, 4)}
                        )
                      </>

                    ) : (

                      <>
                        {player.name}
                        {" "}
                        (
                        {player.team}
                        )
                      </>

                    )}

                  </div>

                );

              })}

            </div>

          )}

        </div>

        {/* 헤더 */}

        <div className="grid grid-cols-6 gap-3 mb-3 text-center font-bold text-gray-700 text-base">

          <div>선수</div>
          <div>팀</div>
          <div>포지션</div>
          <div>나이</div>
          <div>투타</div>
          <div>국적</div>

        </div>

        {/* 결과 */}

        <div className="md:hidden text-xs text-gray-500 mb-2 text-center">
← 좌우로 밀어서 결과 보기 →
</div>

<div
  className="
    overflow-x-auto
    pb-2
    [-webkit-overflow-scrolling:touch]
  "
>

  <div className="flex flex-col gap-3 min-w-[760px]">

          {guesses.map((guess, index) => {

            return (

              <div
                key={index}

                className={`grid grid-cols-6 gap-3 transition-all hover:scale-[1.01] ${
                  guess.correct
                    ? "ring-4 ring-green-400 rounded-2xl"
                    : ""
                }`}
              >

                <div className="bg-white/95 border border-gray-300 p-2 md:p-3 rounded-xl text-center font-bold text-black shadow-md">

                  {guess.player.name}

                </div>

                <div
                  className={`${getColor(guess.team)} border p-2 md:p-3 rounded-xl text-center font-bold text-black shadow-md`}
                >

                  {guess.player.team}

                </div>

                <div
                  className={`${getColor(guess.team)} border p-2 md:p-3 rounded-xl text-center font-bold text-black shadow-md`}
                >

                  {guess.player.position}

                </div>

                {getAgeDisplay(
                  guess.player.age,
                  guess.ageResult
                )}

                <div
                  className={`${getColor(guess.team)} border p-2 md:p-3 rounded-xl text-center font-bold text-black shadow-md`}
                >

                  {guess.player.throws}

                </div>

                <div
                  className={`${getColor(guess.team)} border p-2 md:p-3 rounded-xl text-center font-bold text-black shadow-md`}
                >

                  {guess.player.nationality}

                </div>

              </div>

            );

          })}

        </div>
        </div>

        {/* 정답 */}

        {gameOver && (

          <div className="mt-10 text-center text-3xl
md:text-4xl font-black text-green-600 drop-shadow-lg">

            정답: {answer.name}

          </div>

        )}

      </div>

    </main>
</>

  );

}

const RuleModal = ({
  hideRule,
  setHideRule,
  setShowRule,
}) => {
  return (
    <div className="fixed inset-0 z-[999] bg-black/70 overflow-y-auto">

      <div className="min-h-screen flex items-center justify-center p-4">

        <div
          className="
            w-full
            max-w-2xl
            bg-white
            rounded-3xl
            shadow-2xl
            p-6
            md:p-10
          "
        >

          <h2 className="text-3xl md:text-4xl font-black text-center mb-8">
            ⚾ KBO WHO ARE YA
          </h2>

          <div className="space-y-7 text-gray-800">

            <div>

              <div className="font-black text-lg md:text-xl mb-2">
                🎯 목표
              </div>

              <p className="text-xs
text-base md:text-lg">
                숨겨진 KBO 선수를 맞혀보세요.
              </p>

            </div>

            <div>

              <div className="font-black text-lg md:text-xl mb-2">
                📝 규칙
              </div>

              <ul className="list-disc ml-6 space-y-2 text-base md:text-lg">

                <li>총 8번의 기회가 있습니다.</li>

                <li>입력할 때마다 정보가 공개됩니다.</li>

                <li>🟩 초록 = 일치</li>

                <li>🟨 노랑 = 나이가 높거나 낮음</li>

                <li>⬜ 흰색 = 다름</li>

              </ul>

            </div>

            <div>

              <div className="font-black text-lg md:text-xl mb-2">
                🎮 난이도
              </div>

              <ul className="list-disc ml-6 space-y-2 text-base md:text-lg">

                <li>전체 선수</li>

                <li>통산 WAR 5 이상</li>

                <li>통산 WAR 10 이상</li>

              </ul>

            </div>

          </div>
<p className="mt-6 text-center text-xs text-zinc-500">
  최적 환경: PC 및 스마트폰 브라우저
  <br />
  일부 태블릿 브라우저에서는 기능이 정상 동작하지 않을 수 있습니다.
</p>
          <label className="flex items-center gap-3 mt-8 text-lg">

            <input
              type="checkbox"
              checked={hideRule}
              onChange={(e) => setHideRule(e.target.checked)}
              className="w-5 h-5"
            />

            다음부터 보지 않기

          </label>

          <button
            type="button"
            onClick={() => {

              if (hideRule) {
                localStorage.setItem("whoareya_rule", "true");
              } else {
                localStorage.removeItem("whoareya_rule");
              }

              setShowRule(false);

            }}
           className="
  mt-8
  w-full
  py-4
  md:py-5
  rounded-2xl
  bg-blue-600
  hover:bg-blue-500
  active:bg-blue-700
  text-white
  text-xl
  font-black
  transition
  touch-manipulation
"
          >
            게임 시작
          </button>

        </div>

      </div>

    </div>
  );
};