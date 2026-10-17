"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase, syncDaily, SYNC_EVENT } from "@/lib/supabase";

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

// 구글 OAuth 클라이언트 ID (공개값). 비어 있으면 예전 방식(Supabase 경유) 로그인 버튼을 씀
const GOOGLE_CLIENT_ID = "634979022485-t5af8ln8drmiqdq15r7id7kt4tpa2rjh.apps.googleusercontent.com";

// 구글 로그인 스크립트(Google Identity Services)를 한 번만 불러옴
let gsiPromise;
function loadGsi() {
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// kbogames.com 안에서 바로 뜨는 구글 공식 로그인 버튼 → 받은 토큰을 Supabase 에 넘김
// (구글 창에 xxxx.supabase.co 대신 우리 사이트가 보이게)
function GoogleButton() {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then(async () => {
        if (cancelled || !ref.current) return;
        const nonce = crypto.randomUUID() + crypto.randomUUID();
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: await sha256Hex(nonce),
          callback: ({ credential }) =>
            supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce }),
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          locale: "ko",
          width: 192,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={ref} className="min-h-10" />;
}

// 로그인 / 로그아웃 (구글). 로그인하면 데일리 기록을 서버와 맞춤
function AuthButton() {
  const [user, setUser] = useState(undefined); // undefined = 확인 중

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        // onAuthStateChange 안에서 바로 다른 supabase 호출을 하면 막힐 수 있어서 한 박자 뒤에
        setTimeout(() => {
          syncDaily().then((ok) => {
            if (ok) window.dispatchEvent(new Event(SYNC_EVENT));
          });
        }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (user === undefined) return <div className="h-10" />;

  if (!user && GOOGLE_CLIENT_ID) return <GoogleButton />;

  if (!user) {
    return (
      <button
        onClick={() =>
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.href },
          })
        }
        className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2 font-bold text-slate-900 hover:bg-slate-200"
      >
        <span className="w-7 text-center">🔑</span>
        <span>구글로 로그인</span>
      </button>
    );
  }

  const name = user.user_metadata?.name || user.email;
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="truncate text-sm font-bold text-white" title={user.email}>
        👤 {name}
      </div>
      <div className="mt-0.5 flex items-center justify-between text-xs text-slate-400">
        <span>기록 자동 저장 중</span>
        <button onClick={() => supabase.auth.signOut()} className="underline hover:text-white">
          로그아웃
        </button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-auto pt-6 space-y-2 text-sm">
      <AuthButton />
      <a
        href={BUG_REPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10"
      >
        <span className="w-7 text-center">🐞</span>
        <span>버그 제보</span>
      </a>
      <div className="flex items-center justify-between px-3 text-xs text-slate-500">
        <span>v1.3.0 Beta</span>
        <Link href="/privacy" className="underline hover:text-slate-300">
          개인정보처리방침
        </Link>
      </div>
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
