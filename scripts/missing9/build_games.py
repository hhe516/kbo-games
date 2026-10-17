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


games = json.load(open(GAMES, encoding="utf-8"))
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

if problems:
    for p in problems:
        print("확인 필요:", p)
    sys.exit(1)

json.dump(out, open(GAMES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{len(out)}문제 저장")
