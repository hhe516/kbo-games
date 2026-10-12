"use client";

// 팀 이름(구단 표기 변형 포함) -> 로고 파일 매핑
// SK -> SSG, 넥센/우리 -> 키움 처럼 같은 프랜차이즈의 옛 이름도
// 현재 로고로 연결되도록 alias를 함께 등록합니다.
const TEAM_LOGO_MAP = {
  "KIA": "/logos/kia.svg",
  "두산": "/logos/doosan.svg",
  "롯데": "/logos/lotte.svg",
  "삼성": "/logos/samsung.svg",
  "NC": "/logos/nc.svg",
  "KT": "/logos/kt.svg",
  "키움": "/logos/kiwoom.svg",
  "넥센": "/logos/kiwoom.svg",
  "우리": "/logos/kiwoom.svg",
  "한화": "/logos/hanwha.svg",
  "LG": "/logos/lg.svg",
  "SSG": "/logos/ssg.svg",
  "SK": "/logos/ssg.svg",
};

// 로고가 없는(과거 해체/개명 구단 등) 경우를 위한 이니셜 뱃지 색상
const FALLBACK_COLORS = {
  "OB": "bg-gray-700",
  "MBC": "bg-blue-700",
  "청보": "bg-yellow-600",
  "태평양": "bg-cyan-700",
  "빙그레": "bg-orange-500",
  "해태": "bg-red-700",
  "삼미": "bg-sky-600",
  "쌍방울": "bg-indigo-600",
  "현대": "bg-slate-700",
};

export function getTeamLogo(team) {
  if (!team) return null;
  return TEAM_LOGO_MAP[team] || null;
}

// team: 선수 데이터의 team 문자열
// size: 배지 픽셀 크기 (기본 24)
// className: 추가 클래스
export default function TeamBadge({ team, size = 24, className = "" }) {
  const logo = getTeamLogo(team);

  if (logo) {
    return (
      <img
        src={logo}
        alt={team}
        title={team}
        width={size}
        height={size}
        className={`inline-block rounded-full bg-white border border-gray-200 object-contain p-0.5 align-middle ${className}`}
      />
    );
  }

  // 로고가 없는 팀은 원형 이니셜 뱃지로 대체 (저작권 걱정 없는 자체 표시)
  const initial = team ? team.slice(0, 1) : "?";
  const color = FALLBACK_COLORS[team] || "bg-gray-500";

  return (
    <span
      title={team}
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-full ${color} text-white font-black align-middle ${className}`}
    >
      <span style={{ fontSize: size * 0.5 }}>{initial}</span>
    </span>
  );
}
