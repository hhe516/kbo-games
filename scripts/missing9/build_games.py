"""
Missing 9 문제 데이터(public/data/games.json) 정리

1) 시즌 베스트: 그 시즌 "주전 라인업"으로 다시 뽑음
   - 포지션마다 그 포지션(주 포지션)으로 타석(PA)이 가장 많은 선수
     (예전엔 WAR 순이라 백업 선수가 주전 대신 뽑히는 경우가 많았음)
   - 외야 3명: LF/CF/RF/OF 중 타석 많은 순
   - 지명타자: 남은 타자 중 타석 가장 많은 선수 (지명 전문이 아니어도 10번째 주전)
   - 투수: 선발 등판(GS) → 이닝 순
2) 실제 경기 라인업: 이름만 있던 선수에 id 를 붙임 (동명이인 힌트가 엉뚱하게 나오던 문제)
   - 그해 그 팀(국제대회는 아무 팀)에서 1군 기록이 있는 선수 중에서 고르고,
     그래도 여럿이면 그 경기 포지션과 기록상 포지션이 맞는 쪽
   - 그해 KBO 기록이 아예 없으면(해외 진출 중 국가대표) 통산 WAR 가장 높은 동명이인
3) 이름이 바뀐 선수는 지금 이름으로 맞히고, 화면에 당시 이름을 같이 보여줌
4) 골든글러브 라인업: 해마다 골든글러브 10명 (player_awards.json)
5) 힌트: 선수마다 "그 시즌 기록"과 출신 학교를 미리 넣어 둠
   - 시즌 기록은 정규시즌 1군 기준. WBC(3월)는 직전 시즌, 나머지 대회·포스트시즌은 그해
   - 경기·시즌 베스트는 그 팀 기록, 국제대회·골든글러브는 그해 전체 기록

실행: python scripts/missing9/build_games.py
"""
import json
import os
import re
import sys

import pandas as pd

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
GAMES = os.path.join(ROOT, "public", "data", "games.json")
PLAYERS = os.path.join(ROOT, "public", "data", "players.json")

# 당시 이름 → 지금 이름 (players.json 기준)
RENAMED = {"한동민": "한유섬"}

batting = pd.read_csv(os.path.join(ROOT, "batting.csv"), encoding="cp949")
pitching = pd.read_csv(os.path.join(ROOT, "pitching.csv"), encoding="cp949")
for df in (batting, pitching):
    df["pid"] = df["Name"] + "_" + df["Birthdate"]

players = json.load(open(PLAYERS, encoding="utf-8"))
player_ids = {p["id"] for p in players}
war = {p["id"]: p.get("careerWar") or 0 for p in players}
by_name = {}
for p in players:
    by_name.setdefault(p["name"], []).append(p["id"])

OF = ["LF", "CF", "RF", "OF"]


# -----------------------------
# 1) 시즌 베스트
# -----------------------------
def season_best(team, year):
    bat = batting[(batting["Team"] == team) & (batting["Year"] == year)]
    pit = pitching[(pitching["Team"] == team) & (pitching["Year"] == year)]
    if bat.empty or pit.empty:
        sys.exit(f"데이터 없음: {year} {team}")

    # 한 시즌에 같은 선수가 여러 줄이면 타석 합침, 포지션은 타석 많은 줄 기준
    bat = (
        bat.sort_values("PA", ascending=False)
        .groupby("pid", as_index=False)
        .agg({"Name": "first", "Pos.": "first", "PA": "sum"})
        .sort_values("PA", ascending=False)
    )
    used = set()
    lineup = []

    ace = pit.sort_values(["GS", "IP"], ascending=False).iloc[0]
    lineup.append({"position": "P", "id": ace["pid"], "name": ace["Name"]})

    def take(pos_list, label):
        for _, r in bat.iterrows():
            if r["pid"] not in used and r["Pos."] in pos_list:
                used.add(r["pid"])
                lineup.append({"position": label, "id": r["pid"], "name": r["Name"]})
                return
        sys.exit(f"{year} {team} {label} 못 찾음")

    for pos in ["C", "1B", "2B", "SS", "3B"]:
        take([pos], pos)
    for i in range(3):
        take(OF, f"OF{i + 1}")
    take(list(bat["Pos."].unique()), "DH")
    return lineup


# -----------------------------
# 2) 실제 경기 라인업 id 붙이기
# -----------------------------
def resolve(name, year, team, pos):
    name = RENAMED.get(name, name)
    cands = by_name.get(name, [])
    if len(cands) <= 1:
        return cands[0] if cands else None
    rows = pd.concat([batting, pitching])
    rows = rows[(rows["Year"] == year) & rows["pid"].isin(cands)]
    if team:
        rows = rows[rows["Team"] == team]
    ids = list(dict.fromkeys(rows["pid"]))
    if len(ids) > 1:
        # 포지션으로 한 번 더 (투수는 투수 기록, 야수는 그 포지션)
        if pos == "P":
            ids = [i for i in ids if i in set(pitching["pid"])]
        else:
            b = batting[(batting["Year"] == year) & batting["pid"].isin(ids)]
            want = OF if pos in OF else [pos]
            same = list(dict.fromkeys(b[b["Pos."].isin(want)]["pid"]))
            if same:
                ids = same
    if not ids:
        # 그해 KBO 기록이 없으면(해외 진출 중 국가대표 등) 통산 WAR 가장 높은 동명이인
        return max(cands, key=lambda i: war[i])
    return ids[0] if len(ids) == 1 else None


# -----------------------------
# 4) 골든글러브 라인업
# -----------------------------
GG_POS = {"투수": "P", "포수": "C", "1루수": "1B", "2루수": "2B", "3루수": "3B", "유격수": "SS", "지명타자": "DH"}
names = {p["id"]: p["name"] for p in players}


def gg_games():
    awards = json.load(open(os.path.join(ROOT, "public", "data", "player_awards.json"), encoding="utf-8"))
    by_year = {}
    for pid, a in awards.items():
        for item in a.get("gg", []):
            y, pos = item.split(" ", 1)
            by_year.setdefault(int(y), []).append((pos, pid))
    result = []
    for y in sorted(by_year, reverse=True):
        of = 0
        lineup = []
        for pos, pid in sorted(by_year[y], key=lambda x: list(GG_POS).index(x[0]) if x[0] in GG_POS else 6.5):
            if pos == "외야수":
                of += 1
                label = f"OF{of}"
            else:
                label = GG_POS[pos]
            lineup.append({"position": label, "id": pid, "name": names[pid]})
        if of != 3:
            sys.exit(f"{y} 골든글러브 외야 {of}명")
        result.append({"title": f"{y} 골든글러브", "team": "골든글러브", "opponent": "-", "category": "골든글러브", "lineup": lineup})
    return result


# -----------------------------
# 5) 힌트
# -----------------------------
def school_of(pid):
    rows = pd.concat([batting, pitching])
    rows = rows[rows["pid"] == pid]["School"].dropna()
    if rows.empty:
        return None
    # 초·중학교는 빼고 고교·대학만 (예: "대구중앙초-경상중-경북고" → "경북고")
    # 사이버대·방송통신대처럼 선수 시절 뒤에 다닌 곳도 뺌
    parts = [
        x
        for x in str(rows.iloc[0]).split("-")
        if x.endswith(("고", "대", "대학교")) and not any(k in x for k in ("사이버", "방송통신", "디지털"))
    ]
    return "-".join(parts) or None


def ip_text(ip):
    whole = int(ip)
    third = round((ip - whole) * 3)
    return f"{whole}이닝" + (f" {third}/3" if third else "")


def season_line(pid, year, team, pitcher):
    """그 시즌 기록 한 줄. 기록 없으면 None"""
    if pitcher:
        r = pitching[(pitching["pid"] == pid) & (pitching["Year"] == year)]
        if team:
            r = r[r["Team"] == team]
        if r.empty:
            return None
        w, l, sv, hd, ip, er = (r[c].sum() for c in ["W", "L", "S", "HD", "IP", "ER"])
        # IP 는 소수점이 1/3 단위(0.1=1/3) 로 들어있을 수 있어서 ERA 는 원래 값 가중평균 대신 직접 계산
        outs = sum(int(x) * 3 + round((x - int(x)) * 10) for x in r["IP"])
        era = er * 27 / outs if outs else 0
        parts = [f"{w}승 {l}패"]
        if sv >= 10:
            parts.append(f"{sv}세이브")
        if hd >= 10:
            parts.append(f"{hd}홀드")
        parts.append(f"평균자책 {era:.2f}")
        return " · ".join(parts)
    r = batting[(batting["pid"] == pid) & (batting["Year"] == year)]
    if team:
        r = r[r["Team"] == team]
    if r.empty or r["AB"].sum() == 0:
        return None
    ab, h, hr, rbi, sb = (r[c].sum() for c in ["AB", "H", "HR", "RBI", "SB"])
    avg = f"{h / ab:.3f}".lstrip("0")
    parts = [f"타율 {avg}", f"{hr}홈런", f"{rbi}타점"]
    if sb >= 20:
        parts.append(f"{sb}도루")
    return " · ".join(parts)


def add_hints(g):
    year = int(re.match(r"\d{4}", g["title"]).group())
    stat_year = year - 1 if "WBC" in g["title"] else year
    team = g["team"] if g["category"] in ("한국시리즈", "포스트시즌", "시즌 베스트") else None
    for l in g["lineup"]:
        pid = l["id"]
        line = season_line(pid, stat_year, team, l["position"] == "P")
        hint = {}
        if line:
            hint["season"] = f"{stat_year} 시즌 {line}"
        sch = school_of(pid)
        if sch:
            hint["school"] = sch
        l["hint"] = hint


games = json.load(open(GAMES, encoding="utf-8"))
# 다시 돌려도 되게: 예전에 만든 골든글러브 문제는 빼고 새로 만듦
games = [g for g in games if g["category"] != "골든글러브"]
out = []
problems = []
for g in games:
    year = int(re.match(r"\d{4}", g["title"]).group())
    if g["category"] == "시즌 베스트":
        g = {**g, "lineup": season_best(g["team"], year)}
    else:
        g.setdefault("team", "대한민국")
        g.setdefault("opponent", "대만" if "대만" in g["title"] else "-")
        kbo_team = None if g["category"] == "국제대회" else g["team"]
        lineup = []
        for l in g["lineup"]:
            pid = l.get("id") or resolve(l["name"], year, kbo_team, l["position"])
            if not pid or pid not in player_ids:
                problems.append((g["title"], l["position"], l["name"]))
            row = {"position": l["position"], "id": pid, "name": RENAMED.get(l["name"], l["name"])}
            if l["name"] in RENAMED:
                row["oldName"] = l["name"]
            lineup.append(row)
        g = {k: v for k, v in g.items() if k != "lineup"}
        g["lineup"] = lineup
    out.append(g)

# 같은 경기에 같은 선수가 두 번 들어간 경우도 문제
for g in out:
    ids = [l["id"] for l in g["lineup"] if l["id"]]
    if len(ids) != len(set(ids)):
        problems.append((g["title"], "중복", ids))

out += gg_games()
for g in out:
    add_hints(g)

if problems:
    for p in problems:
        print("확인 필요:", p)
    sys.exit(1)

json.dump(out, open(GAMES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{len(out)}문제 저장")
