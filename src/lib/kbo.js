// KBO 게임들이 같이 쓰는 선수 데이터/조건 모음 (Bingo, Grid)

// 현재 구단 기준으로 옛 이름까지 묶음
export const FRANCHISES = [
  { key: "LG", label: "LG·MBC", teams: ["LG", "MBC"] },
  { key: "두산", label: "두산·OB", teams: ["두산", "OB"] },
  { key: "삼성", label: "삼성", teams: ["삼성"] },
  { key: "롯데", label: "롯데", teams: ["롯데"] },
  { key: "KIA", label: "KIA·해태", teams: ["KIA", "해태"] },
  { key: "한화", label: "한화·빙그레", teams: ["한화", "빙그레"] },
  { key: "SSG", label: "SSG·SK", teams: ["SSG", "SK"] },
  { key: "키움", label: "키움·넥센·우리", teams: ["키움", "넥센", "우리"] },
  { key: "NC", label: "NC", teams: ["NC"] },
  { key: "KT", label: "KT", teams: ["KT"] },
  // 해체 구단: 삼미→청보→태평양→현대 는 한 구단의 이름 변경 (키움과는 별개)
  { key: "현대", label: "현대·태평양·청보·삼미", teams: ["현대", "태평양", "청보", "삼미"] },
  { key: "쌍방울", label: "쌍방울", teams: ["쌍방울"] },
];

export const KBO_TEAMS = new Set([
  "LG", "MBC", "두산", "OB", "삼성", "롯데", "KIA", "해태", "한화", "빙그레",
  "SSG", "SK", "키움", "넥센", "우리", "NC", "KT", "현대", "쌍방울", "태평양",
  "청보", "삼미",
]);

export const franchiseOf = (team) =>
  FRANCHISES.find((f) => f.teams.includes(team))?.key ?? team;

// 칸 조건들 (선수 p → true/false)
export const CONDITIONS = [
  ...FRANCHISES.map((f) => ({
    id: `team_${f.key}`,
    group: "team",
    label: `${f.label} 경력`, // 그 팀 소속 1군 출전 기록이 있으면 인정
    test: (p) => p.franchises.has(f.key),
  })),
  { id: "pos_P", group: "pos", label: "투수", test: (p) => p.position === "투수" },
  { id: "pos_C", group: "pos", label: "포수", test: (p) => p.position === "포수" },
  { id: "pos_IF", group: "pos", label: "내야수", test: (p) => p.position === "내야" },
  { id: "pos_OF", group: "pos", label: "외야수", test: (p) => p.position === "외야" },
  { id: "lefty", group: "hand", label: "좌투", test: (p) => p.throws.startsWith("좌투") },
  { id: "sub", group: "hand", label: "언더·사이드", test: (p) => p.throws.startsWith("우언") },
  { id: "lhb", group: "hand", label: "좌타", test: (p) => p.throws.endsWith("좌타") },
  { id: "foreign", group: "nat", label: "외국인 선수", test: (p) => p.nationality === "외국" },
  { id: "oneclub", group: "career", label: "원클럽맨", test: (p) => p.franchiseCount === 1 },
  { id: "journey", group: "career", label: "3팀 이상", test: (p) => p.franchiseCount >= 3 },
  { id: "war30", group: "war", label: "통산 WAR 30+", test: (p) => p.careerWar >= 30 },
  { id: "war50", group: "war", label: "통산 WAR 50+", test: (p) => p.careerWar >= 50 },
  { id: "active", group: "active", label: "현역", test: (p) => p.active },
  // 1군 기록 기반 (player_stats.json, scripts/build_player_stats.py)
  { id: "ring", group: "ring", label: "한국시리즈 우승", test: (p) => p.stats.c >= 1 },
  { id: "ring3", group: "ring", label: "KS 우승 3회+", test: (p) => p.stats.c >= 3 },
  { id: "s15", group: "long", label: "1군 15시즌+", test: (p) => p.stats.s >= 15 },
  { id: "f10", group: "long", label: "한 팀 10시즌+", test: (p) => p.stats.f >= 10 },
  { id: "hr200", group: "stat", label: "통산 200홈런+", test: (p) => p.stats.hr >= 200 },
  { id: "h1500", group: "stat", label: "통산 1500안타+", test: (p) => p.stats.h >= 1500 },
  { id: "w100", group: "stat", label: "통산 100승+", test: (p) => p.stats.w >= 100 },
  { id: "sv100", group: "stat", label: "통산 100세이브+", test: (p) => p.stats.sv >= 100 },
  // 수상 (KBO 정규시즌, scripts/awards 참고)
  { id: "gg", group: "award", label: "골든글러브 수상", test: (p) => p.goldGlove > 0 },
  { id: "gg5", group: "award", label: "골든글러브 5회+", test: (p) => p.goldGlove >= 5 },
  { id: "mvp", group: "award", label: "정규시즌 MVP", test: (p) => p.mvp > 0 },
  { id: "roy", group: "award", label: "신인왕", test: (p) => !!p.rookie },
  { id: "mlb", group: "abroad", label: "MLB 뛴 한국인", test: (p) => !!p.mlb && p.nationality === "한국" },
];

export const shuffle = (arr, rng = Math.random) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// KBO 1군 기록이 있는 전체 선수 + 뛰었던 KBO 구단 → 게임용 선수 목록
// (player_teams.json 은 scripts/build_player_teams.py 로 생성)
export async function loadPool() {
  const [players, teams, stats] = await Promise.all([
    fetch("/data/players.json").then((r) => r.json()),
    fetch("/data/player_teams.json").then((r) => r.json()),
    fetch("/data/player_stats.json").then((r) => r.json()),
  ]);

  return players.map((p) => {
    const kboTeams = (teams[p.id] || [p.team]).filter((t) => KBO_TEAMS.has(t));
    const franchises = new Set(kboTeams.map(franchiseOf));
    return {
      ...p,
      birthYear: Number(String(p.birthdate).slice(0, 4)),
      kboTeams,
      // 없는 값은 0 (s: 1군 시즌, f: 한 구단 최다 시즌, c: KS 우승, h/hr/w/sv: 통산 안타/홈런/승/세이브)
      stats: { s: 0, f: 0, c: 0, h: 0, hr: 0, w: 0, sv: 0, ...stats[p.id] },
      franchises,
      franchiseCount: franchises.size,
    };
  });
}

// -----------------------------
// 데일리: 날짜(한국 시간)로 고정되는 난수
// -----------------------------

export const DAILY_START = "2026-10-13"; // 데일리 #1

// 한국 시간 기준 오늘 날짜 "YYYY-MM-DD"
export const todayKST = (now = Date.now()) =>
  new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const dailyNumber = (dateStr) =>
  Math.round((new Date(`${dateStr}T00:00:00Z`) - new Date(`${DAILY_START}T00:00:00Z`)) / 86400000) + 1;

// 문자열 → 같은 값이면 항상 같은 난수열 (mulberry32)
export function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 브라우저 저장소 (막혀 있어도 게임은 돌아가게)
export const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 저장 못 해도 무시
    }
  },
};

// 그날 데일리를 끝냈는지 (games 는 "grid" 하나 또는 ["grid", "careerpath"] 처럼 여러 개 → 하나라도 끝냈으면 true)
const doneOn = (games, day) =>
  [].concat(games).some((g) => store.get(`daily_${g}_${day}`)?.done);

// 연속 기록: lastDay 부터 거꾸로 데일리를 끝낸 날이 며칠 이어지는지
export function streakUntil(games, lastDay) {
  let day = lastDay;
  let n = 0;
  while (doneOn(games, day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

// 오늘 끝냈으면 오늘까지, 아직이면 어제까지의 연속 기록
export const dailyStreak = (games, today) =>
  doneOn(games, today)
    ? streakUntil(games, today)
    : streakUntil(games, addDays(today, -1));
