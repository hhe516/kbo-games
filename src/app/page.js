"use client";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
const [showCredits, setShowCredits] = useState(false);
  return (
    <>
{showCredits && (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">

    <div className="w-[92vw]
max-w-[560px] max-w-[90%] rounded-3xl bg-white text-black p-8 shadow-2xl">

      <h2 className="text-3xl font-black text-center mb-6">
        ⚾ Credits
      </h2>

      <div className="space-y-4 text-sm leading-7 text-zinc-700">

        <p>
          <strong>KBO Games</strong> is an unofficial fan-made baseball quiz website.
        </p>

        <p>
          Inspired by the following games from{" "}
          <a
            href="https://playfootball.games"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            PlayFootball.Games
          </a>
        </p>

        <ul className="list-disc ml-6">

          <li>
            <a
              href="https://playfootball.games/who-are-ya/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Who Are Ya?
            </a>
          </li>

          <li>
            <a
              href="https://playfootball.games/missing-xi/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Missing XI
            </a>
          </li>

        </ul>

        <p>
          This website is not affiliated with KBO,
          PlayFootball.Games or any professional baseball organization.
        </p>

        <p>
          Player names, team names and publicly available baseball records
          are used for educational and fan purposes.
        </p>

      </div>

      <button
        onClick={() => setShowCredits(false)}
        className="mt-8 w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl font-bold"
      >
        확인
      </button>

    </div>

  </div>
)}

    <main
      className="
min-h-screen
bg-cover
bg-center
flex
items-center
justify-center
px-5
py-10
lg:p-8
"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
      }}
    >

      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full">

        {/* 제목 */}

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-8 md:mb-14 text-center leading-tight">

          ⚾ KBO GAME HUB

        </h1>

        {/* 버튼들 */}

        <div
  className="
    grid
    grid-cols-1
    md:grid-cols-2
    xl:grid-cols-3
    gap-6
    lg:gap-10
    w-full
    max-w-6xl
    mx-auto
    place-items-center
  "
>

          {/* WHO ARE YA */}

          <Link
  href="/whoru"
  className="
w-full
max-w-[340px]
h-64
bg-white/85
hover:bg-white
transition-all
rounded-[32px]
shadow-2xl
backdrop-blur-md
border border-white/40
flex
flex-col
items-center
justify-center
hover:scale-105
active:scale-95
"
>

<div className="text-5xl lg:text-6xl mb-5">
  🤔
</div>

<div className="text-2xl lg:text-4xl font-black text-gray-900">
  WHO ARE YA
</div>

<div className="text-base lg:text-lg text-gray-500 mt-4 font-semibold">
  선수 맞추기
</div>

</Link>

          {/* Missing 9 */}

          <Link
  href="/missing9"
  className="
w-full
max-w-[340px]
h-64
bg-white/85
hover:bg-white
transition-all
rounded-[32px]
shadow-2xl
backdrop-blur-md
border border-white/40
flex
flex-col
items-center
justify-center
hover:scale-105
active:scale-95
"
>

  <div className="text-5xl lg:text-6xl mb-5">
  🧩
</div>

<div className="text-2xl lg:text-4xl font-black text-gray-900">
  MISSING 9
</div>

<div className="text-base lg:text-lg text-gray-500 mt-4 font-semibold">
  라인업 맞추기
</div>

</Link>
<Link
  href="/careerpath"
  className="
w-full
max-w-[340px]
h-64
bg-white/85
hover:bg-white
transition-all
rounded-[32px]
shadow-2xl
backdrop-blur-md
border border-white/40
flex
flex-col
items-center
justify-center
hover:scale-105
active:scale-95
"
>

  <div className="text-5xl mb-4">
    🛤️
  </div>

  <div className="text-3xl font-black text-gray-900">
    CAREER PATH
  </div>

  <div className="text-gray-500 mt-3 font-semibold">
    커리어 보고 선수 맞추기
  </div>

</Link>
                </div>   

<div className="mt-12 flex flex-col items-center gap-2">

  <div className="text-xs text-zinc-300">
    KBO games HUB
  </div>

  <div className="text-xs text-zinc-400">
    v1.0.0 Beta
  </div>

  <a
    href="https://docs.google.com/forms/d/e/1FAIpQLSeMncbGJK3zd04feEWU7ctohNxfk5Clj_RZyBxD6zugjxZwng/viewform?usp=publish-editor"
    target="_blank"
    rel="noopener noreferrer"
    className="
      mt-2
      rounded-xl
      bg-red-500
      hover:bg-red-400
      px-6
      py-3
      text-sm
      font-bold
      text-white
      transition
      shadow-xl
    "
  >
    🐞 버그 제보 / 의견 보내기
  </a>

</div>

      </div>   {/* relative z-10 끝 */}

<button
  onClick={() => setShowCredits(true)}
      
 className="
fixed
bottom-5
right-5
lg:bottom-6
lg:right-6
z-40
bg-white/90
hover:bg-white
text-black
rounded-xl
px-5
py-3
font-bold
shadow-xl
transition
"
>
  ⓘ Credits
</button>
    </main>
</>
  );  

}