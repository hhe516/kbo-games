import { createClient } from "@supabase/supabase-js";
import { store } from "@/lib/kbo";

// 둘 다 브라우저에 공개되는 값이라 코드에 둬도 됨 (secret 키는 절대 여기 넣지 말 것)
// 표에 RLS(본인 행만 읽기/쓰기)가 걸려 있어서 공개 키로는 남의 기록을 못 봄
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yetzfdbdczrwasxvvjwa.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_650z3ENj6utsn8zUXddVPg_HfwaGK-z";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const SYNC_EVENT = "kbo-daily-sync";

const DAILY_KEY = /^daily_([a-z0-9]+)_(\d{4}-\d{2}-\d{2})$/;

// a 기록이 b 보다 나은가 (끝낸 게 우선, 그다음 점수)
const better = (a, b) =>
  (!!a?.done && !b?.done) || (!!a?.done === !!b?.done && (a?.score ?? 0) > (b?.score ?? 0));

async function currentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

// 데일리 기록 하나를 서버에도 저장 (로그인 안 했으면 아무것도 안 함)
export async function pushDaily(game, day, rec) {
  try {
    const user = await currentUser();
    if (!user) return;
    await supabase.from("daily_results").upsert({
      user_id: user.id,
      game,
      day,
      score: rec.score ?? 0,
      done: !!rec.done,
      data: rec,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // 네트워크 오류 등은 무시 (브라우저 저장은 이미 됨)
  }
}

// 로그인 상태면 브라우저 기록 ↔ 서버 기록을 서로 맞춤. 맞췄으면 true
export async function syncDaily() {
  try {
    const user = await currentUser();
    if (!user) return false;

    const { data: rows, error } = await supabase
      .from("daily_results")
      .select("game, day, score, done, data");
    if (error) return false;

    const remote = new Map(rows.map((r) => [`daily_${r.game}_${r.day}`, r]));

    // 브라우저에만 있거나 브라우저 쪽이 더 나은 기록 → 서버로
    const upserts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const m = key && key.match(DAILY_KEY);
      if (!m) continue;
      const local = store.get(key);
      if (!local) continue;
      const r = remote.get(key);
      if (!r || better(local, r)) {
        upserts.push({
          user_id: user.id,
          game: m[1],
          day: m[2],
          score: local.score ?? 0,
          done: !!local.done,
          data: local,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // 서버에만 있거나 서버 쪽이 더 나은 기록 → 브라우저로
    for (const [key, r] of remote) {
      const local = store.get(key);
      if (!local || better(r, local)) {
        store.set(key, { ...(r.data || {}), done: r.done, score: r.score });
      }
    }

    if (upserts.length) await supabase.from("daily_results").upsert(upserts);
    return true;
  } catch {
    return false;
  }
}

// -----------------------------
// 오늘의 문제 통계 (scripts/supabase/stats.sql)
// -----------------------------

// 브라우저마다 랜덤 id 하나 (익명 집계용, 개인정보 아님)
function clientId() {
  let id = store.get("kbo_client_id");
  if (!id) {
    id = crypto.randomUUID();
    store.set("kbo_client_id", id);
  }
  return id;
}

// 끝낸 데일리 결과를 통계에 한 번만 제출
export async function submitDaily(game, day, { score, solved, picks = null }) {
  const key = `daily_submitted_${game}_${day}`;
  if (store.get(key)) return;
  try {
    const { error } = await supabase.rpc("submit_daily", {
      p_client: clientId(),
      p_game: game,
      p_day: day,
      p_score: Math.round(score),
      p_solved: !!solved,
      p_picks: picks,
    });
    if (!error) store.set(key, true);
  } catch {
    // 통계 제출 실패는 게임에 영향 없음
  }
}

export async function fetchDailyStats(game, day) {
  try {
    const { data, error } = await supabase.rpc("daily_stats", { p_game: game, p_day: day });
    return error ? null : data;
  } catch {
    return null;
  }
}

// 공유 문구에 붙이는 순위 " (상위 n%)" — 참여자가 너무 적으면 안 붙임
export function rankTag(stats, myScore) {
  if (!stats || stats.players < 5) return "";
  return ` (상위 ${topPercent(stats, myScore)}%)`;
}

// 내 점수보다 높은 사람 비율 → "상위 n%"
export function topPercent(stats, myScore) {
  if (!stats || !stats.players) return null;
  const better = Object.entries(stats.dist || {}).reduce(
    (sum, [s, c]) => sum + (Number(s) > myScore ? c : 0),
    0
  );
  return Math.max(1, Math.round(((better + 1) / stats.players) * 100));
}
