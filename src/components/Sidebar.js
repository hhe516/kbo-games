"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// 게임 추가할 때 여기에 한 줄만 넣으면 사이드바에 뜸
export const GAMES = [
  { href: "/whoru", icon: "🤔", name: "Who Are Ya", desc: "힌트로 선수 맞히기" },
  { href: "/missing9", icon: "🧩", name: "Missing 9", desc: "라인업 맞추기" },
  { href: "/careerpath", icon: "🛤️", name: "Career Path", desc: "커리어 보고 선수 맞히기" },
  { href: "/bingo", icon: "🎱", name: "Bingo", desc: "조건 맞는 칸에 선수 넣기" },
  { href: "/grid", icon: "🔢", name: "Grid", desc: "가로·세로 조건 둘 다 맞는 선수" },
];

const BUG_REPORT =
  "https://docs.google.com/forms/d/e/1FAIpQLSeMncbGJK3zd04feEWU7ctohNxfk5Clj_RZyBxD6zugjxZwng/viewform?usp=publish-editor";

function NavList({ pathname, onNavigate }) {
  const item = (active) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold transition-colors ${
      active ? "bg-white text-slate-900" : "text-slate-200 hover:bg-white/10"
    }`;

  return (
    <nav className="flex flex-col gap-1">
      <Link href="/" onClick={onNavigate} className={item(pathname === "/")}>
        <span className="text-xl w-7 text-center">🏠</span>
        <span>홈</span>
      </Link>

      <div className="mt-4 mb-1 px-3 text-xs font-bold tracking-widest text-slate-500">GAMES</div>

      {GAMES.map((g) => (
        <Link
          key={g.href}
          href={g.href}
          onClick={onNavigate}
          className={item(pathname.startsWith(g.href))}
        >
          <span className="text-xl w-7 text-center">{g.icon}</span>
          <span>{g.name}</span>
        </Link>
      ))}
    </nav>
  );
}

function Footer() {
  return (
    <div className="mt-auto pt-6 space-y-2 text-sm">
      <a
        href={BUG_REPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10"
      >
        <span className="w-7 text-center">🐞</span>
        <span>버그 제보</span>
      </a>
      <div className="px-3 text-xs text-slate-500">v1.0.0 Beta</div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱: 왼쪽 고정 */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-56 flex-col bg-slate-950/95 backdrop-blur border-r border-white/10 p-4">
        <Link href="/" className="mb-6 px-3 text-2xl font-black text-white">
          ⚾ KBO GAMES
        </Link>
        <NavList pathname={pathname} />
        <Footer />
      </aside>

      {/* 모바일·태블릿: 위쪽 바 + 펼치는 메뉴 */}
      <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between bg-slate-950/95 backdrop-blur px-4">
        <Link href="/" className="text-xl font-black text-white">
          ⚾ KBO GAMES
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          className="rounded-lg px-3 py-1.5 text-2xl text-white hover:bg-white/10"
        >
          ☰
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[1000] flex">
          <div className="flex w-64 flex-col bg-slate-950 p-4">
            <div className="mb-6 flex items-center justify-between px-3">
              <span className="text-xl font-black text-white">⚾ KBO GAMES</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="text-2xl text-slate-300"
              >
                ✕
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            <Footer />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
