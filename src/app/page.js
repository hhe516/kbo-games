import Link from "next/link";

export default function Home() {

  return (

    <main
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-8"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1471295253337-3ceaaedca402?q=80&w=2070&auto=format&fit=crop')",
      }}
    >

      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="relative z-10 flex flex-col items-center">

        {/* 제목 */}

        <h1 className="text-7xl font-black text-white mb-14 drop-shadow-2xl tracking-tight">

          ⚾ KBO GAME HUB

        </h1>

        {/* 버튼들 */}

        <div className="flex gap-8">

          {/* WHO ARE YA */}

          <Link href="/whoru">

            <div className="w-80 h-56 bg-white/85 hover:bg-white transition-all rounded-[32px] shadow-2xl backdrop-blur-md border border-white/40 flex flex-col items-center justify-center cursor-pointer hover:scale-105">

              <div className="text-5xl mb-4">

                🤔

              </div>

              <div className="text-3xl font-black text-gray-900">

                WHO ARE YA

              </div>

              <div className="text-gray-500 mt-3 font-semibold">

                선수 맞추기

              </div>

            </div>

          </Link>

          {/* Missing 9 */}

          <Link href="/missing9">

            <div className="w-80 h-56 bg-white/85 hover:bg-white transition-all rounded-[32px] shadow-2xl backdrop-blur-md border border-white/40 flex flex-col items-center justify-center cursor-pointer hover:scale-105">

              <div className="text-5xl mb-4">

                🧩

              </div>

              <div className="text-3xl font-black text-gray-900">

                MISSING 9

              </div>

              <div className="text-gray-500 mt-3 font-semibold">

                라인업 맞추기

              </div>

            </div>

          </Link>

        </div>

      </div>

    </main>

  );

}