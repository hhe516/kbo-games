import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.kbogames.com";
const SITE_DESC = "매일 새로 열리는 KBO 선수 퀴즈 · 오늘의 Grid / Career Path / Who Are Ya, 빙고, 미싱9";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "⚾KBO Games",
  description: SITE_DESC,
  // 카톡·인스타·트위터 등에 링크 붙였을 때 뜨는 미리보기
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "KBO GAME HUB",
    title: "KBO GAME HUB | 매일 새로 열리는 야구 퀴즈",
    description: SITE_DESC,
    locale: "ko_KR",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KBO GAME HUB" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KBO GAME HUB | 매일 새로 열리는 야구 퀴즈",
    description: SITE_DESC,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">

  <Sidebar />

  {/* 데스크톱에선 왼쪽 사이드바(w-56)만큼 비워둠 */}
  <div className="relative flex-1 lg:pl-56">
    {children}
  </div>

  {/* Vercel 방문자 통계 (Vercel 대시보드 Analytics 탭에서 확인) */}
  <Analytics />

</body>
    </html>
  );
}
