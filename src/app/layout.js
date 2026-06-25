import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  description: "Who Are Ya & Missing9",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">

  <main className="flex-1">
    {children}
  </main>

  <footer className="border-t border-zinc-200 bg-white/90 backdrop-blur text-center text-xs text-zinc-500 py-6 px-4">

    <p className="font-semibold text-zinc-700">
      © 2026 KBO Games
    </p>

    <p className="mt-2">
      KBO Games is an unofficial fan-made baseball quiz website.
    </p>

    <p className="mt-1">
      Inspired by{" "}
      <a
        href="https://playfootball.games"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-black transition-colors"
      >
        PlayFootball.Games
      </a>
      {" "}and the{" "}
      <a
        href="https://playfootball.games/who-are-ya/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-black transition-colors"
      >
        Who Are Ya?
      </a>
      {" "}and{" "}
      <a
        href="https://playfootball.games/missing-xi/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-black transition-colors"
      >
        Missing XI
      </a>
      {" "}games.
    </p>

    <p className="mt-2">
      This website is not affiliated with KBO, PlayFootball.Games,
      or any professional baseball organization.
    </p>

    <p className="mt-2">
      Player names, team names and baseball records are used for
      identification and educational/fan purposes only.
    </p>

  </footer>

</body>
    </html>
  );
}
