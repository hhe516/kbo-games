import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "⚾KBO Games",
  description: "KBO 선수 퀴즈 게임 모음 - Who Are Ya, Missing 9, Career Path, Bingo, Grid",
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

</body>
    </html>
  );
}
