"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const RuleModal = ({
  hideRule,
  setHideRule,
  setShowRule,
}) => {

  return (

    <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center">

      <div className="w-[720px] max-w-[92%] rounded-3xl bg-white p-8 shadow-2xl">

        <h2 className="text-4xl font-black text-center mb-8">
          ⚾ Career Path
        </h2>

        <div className="space-y-5 text-gray-800">

          <div>

            <div className="font-black text-xl mb-2">
              🎯 목표
            </div>

            <p>
              공개된 커리어를 보고 선수를 맞혀보세요.
            </p>

          </div>

          <div>

            <div className="font-black text-xl mb-2">
              📝 규칙
            </div>

            <ul className="list-disc ml-6 space-y-2">

              <li>커리어는 처음부터 모두 공개됩니다.</li>

              <li>총 3번의 기회가 있습니다.</li>

              <li>자동완성을 사용할 수 있습니다.</li>

              <li>3번 실패하면 정답이 공개됩니다.</li>

            </ul>

          </div>

        </div>

        <label className="flex items-center gap-2 mt-8">

          <input
            type="checkbox"
            checked={hideRule}
            onChange={(e)=>{

              setHideRule(e.target.checked);

            }}
          />

          다음부터 보지 않기

        </label>

        <button

          onClick={()=>{

            if(hideRule){

              localStorage.setItem(
                "career_rule",
                "true"
              );

            }else{

              localStorage.removeItem(
                "career_rule"
              );

            }

            setShowRule(false);

          }}

          className="mt-8 w-full bg-blue-500 hover:bg-blue-400 text-white py-3 rounded-xl font-black"

        >

          게임 시작

        </button>

      </div>

    </div>

  );

};

export default function CareerPath(){

const [players,setPlayers]=useState([]);

const [currentIndex,setCurrentIndex]=useState(0);

const [input,setInput]=useState("");

const [attempts,setAttempts]=useState(0);

const [gameOver,setGameOver]=useState(false);

const [clear,setClear]=useState(false);

const [showRule,setShowRule]=useState(true);

const [hideRule,setHideRule]=useState(false);

const [jumpInput,setJumpInput]=useState("");

const [suggestions,setSuggestions]=useState([]);

const [selectedPlayer,setSelectedPlayer]=useState(null);

useEffect(()=>{

const hide=

localStorage.getItem("career_rule");

if(hide==="true"){

setShowRule(false);

}

},[]);

useEffect(()=>{

fetch("/data/career_paths.json")

.then(res=>res.json())

.then(data=>{

setPlayers(data);

});

},[]);

const answer=

players[currentIndex];

const normalize=(str)=>{

return String(str)

.replaceAll(" ","")

.toLowerCase()

.trim();

};
// -----------------------------
// 자동완성
// -----------------------------

const filteredPlayers = useMemo(() => {

  if (!input.trim()) return [];

  return players
    .filter((p) =>
      normalize(p.name).includes(
        normalize(input)
      )
    )
    .slice(0, 8);

}, [input, players]);

useEffect(() => {

  setSuggestions(filteredPlayers);

}, [filteredPlayers]);

// -----------------------------
// 제출
// -----------------------------

const handleGuess = () => {

  if (!answer) return;

  const guess = (
    selectedPlayer?.name ||
    input
  ).trim();

  if (!guess) return;

  if (
    normalize(guess) ===
    normalize(answer.name)
  ) {

    setClear(true);
    setSuggestions([]);

    return;

  }

  const next = attempts + 1;

  setAttempts(next);

  setInput("");

  setSelectedPlayer(null);

  setSuggestions([]);

  if (next >= 3) {

    setGameOver(true);

  }

};

// -----------------------------
// 다음 문제
// -----------------------------

const nextProblem = () => {

  setAttempts(0);

  setClear(false);

  setGameOver(false);

  setInput("");

  setSelectedPlayer(null);

  setSuggestions([]);

  setCurrentIndex(

    Math.floor(
      Math.random() *
      players.length
    )

  );

};

// -----------------------------
// 문제 번호 이동
// -----------------------------

const jumpToProblem = () => {

  const idx =
    Number(jumpInput) - 1;

  if (
    isNaN(idx)
  ) return;

  if (
    idx < 0 ||
    idx >= players.length
  ) return;

  setCurrentIndex(idx);

  setAttempts(0);

  setClear(false);

  setGameOver(false);

  setInput("");

  setSuggestions([]);

  setSelectedPlayer(null);

};

// -----------------------------
// 로딩
// -----------------------------

if (!answer) {

  return (

    <div className="min-h-screen flex items-center justify-center text-3xl">

      Loading...

    </div>

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
className="min-h-screen bg-cover bg-center p-6 flex items-center justify-center"
style={{
backgroundImage:
"url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
}}
>

<div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>

<div className="relative z-10 w-full max-w-3xl">

<div className="bg-white/90 rounded-3xl shadow-2xl p-8">

<div className="flex justify-between items-center mb-8">

<Link
href="/"
className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-bold"
>

🏠 홈

</Link>

<h1 className="text-4xl font-black">

⚾ Career Path

</h1>

<div className="text-center">

<div className="text-sm text-gray-500">

남은 기회

</div>

<div className="text-3xl font-black">

{3-attempts}

</div>

</div>

</div>

<div className="flex gap-2 mb-6">

<input

type="number"

value={jumpInput}

placeholder="#"

onChange={(e)=>setJumpInput(e.target.value)}

onKeyDown={(e)=>{

if(e.key==="Enter"){

jumpToProblem();

}

}}

className="border rounded-xl p-2 w-24"

/>

<button

onClick={jumpToProblem}

className="bg-yellow-400 hover:bg-yellow-300 px-4 rounded-xl font-bold"

>

이동

</button>

</div>

<div className="space-y-3 mb-8">

{answer.career.map((row,index)=>(

<div

key={index}

className="rounded-2xl bg-slate-100 p-4 flex justify-between items-center"

>

<div className="font-black text-lg">

{row.team}

</div>

<div className="text-gray-600">

{row.from}

~

{row.to}

</div>

</div>

))}

</div>

<div className="relative">

<input

value={input}

placeholder="선수 이름 입력"

onChange={(e)=>{

setInput(e.target.value);

setSelectedPlayer(null);

}}

onKeyDown={(e)=>{

if(e.key==="Enter"){

handleGuess();

}

}}

className="w-full rounded-xl border p-4 text-lg"

/>

{suggestions.length>0 && (

<div className="absolute w-full bg-white border rounded-xl mt-2 shadow-xl z-50">

{suggestions.map((player)=>(

<div

key={player.id}

onClick={()=>{

setSelectedPlayer(player);

setInput(player.name);

setSuggestions([]);

}}

className="cursor-pointer px-4 py-3 hover:bg-sky-100"

>

{player.name}

</div>

))}

</div>

)}

</div>

<button

onClick={handleGuess}

className="mt-5 w-full bg-blue-500 hover:bg-blue-400 text-white py-4 rounded-xl text-xl font-black"

>

제출

</button>

{clear && (

<div className="mt-8 text-center">

<div className="text-4xl font-black text-green-600">

🎉 정답!

</div>

<div className="text-2xl mt-3">

{answer.name}

</div>

<button

onClick={nextProblem}

className="mt-6 bg-green-500 hover:bg-green-400 text-white px-8 py-3 rounded-xl font-black"

>

다음 문제

</button>

</div>

)}

{gameOver && !clear && (

<div className="mt-8 text-center">

<div className="text-4xl font-black text-red-600">

❌ 실패

</div>

<div className="mt-4 text-xl">

정답은

<span className="font-black">

{" "}{answer.name}

</span>

입니다.

</div>

<button

onClick={nextProblem}

className="mt-6 bg-red-500 hover:bg-red-400 text-white px-8 py-3 rounded-xl font-black"

>

다음 문제

</button>

</div>

)}

</div>

</div>

</main>

</>

);

}