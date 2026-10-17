"use client";

import { useEffect, useState } from "react";
import { fetchDailyStats, submitDaily, topPercent } from "@/lib/supabase";

// 데일리가 끝나면 결과 제출 → 오늘 통계 불러오기
// result: { score, solved, picks } (score 는 클수록 잘한 것)
export function useDailyStats(game, date, over, result) {
  const [stats, setStats] = useState(undefined); // undefined = 불러오는 중, null = 실패
  const key = over && date ? JSON.stringify(result) : null;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    submitDaily(game, date, JSON.parse(key))
      .then(() => fetchDailyStats(game, date))
      .then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, [game, date, key]);

  return stats;
}

// 결과 화면에 넣는 통계 상자
export function DailyStatsBox({ stats, myScore, lines = [] }) {
  if (stats === undefined) {
    return <div className="mt-3 text-xs text-gray-400">오늘 통계 불러오는 중…</div>;
  }
  if (!stats?.players) return null;
  const top = topPercent(stats, myScore);
  return (
    <div className="mt-3 rounded-xl bg-white border p-3 text-sm">
      <div className="font-black text-gray-800 mb-1">📊 오늘의 통계</div>
      <div className="text-gray-700">
        참여 <b>{stats.players}명</b>
        {top != null && (
          <>
            {" · "}나는 <b className="text-blue-600">상위 {top}%</b>
          </>
        )}
      </div>
      {lines.map((l) => (
        <div key={l} className="text-gray-600">
          {l}
        </div>
      ))}
    </div>
  );
}
