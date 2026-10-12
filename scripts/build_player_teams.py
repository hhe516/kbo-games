"""선수별 KBO 소속팀 목록을 만든다 (Grid·Bingo 의 구단 조건용).

batting.csv / pitching.csv 의 시즌별 소속팀을 연도순으로 모아서
public/data/player_teams.json 에  {선수 id: ["OB", "두산", ...]}  형태로 저장.

사용: python scripts/build_player_teams.py   (convert.py 다음에 실행)
"""
import json
import os

import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE_DIR, "..")
DATA = os.path.join(ROOT, "public", "data")

frames = [
    pd.read_csv(os.path.join(ROOT, name), encoding="cp949", usecols=["Name", "Birthdate", "Year", "Team"])
    for name in ("batting.csv", "pitching.csv")
]
df = pd.concat(frames, ignore_index=True)
for col in ("Name", "Birthdate", "Team"):
    df[col] = df[col].astype(str).str.strip()
df["Year"] = pd.to_numeric(df["Year"], errors="coerce")
df = df.dropna(subset=["Year"]).sort_values("Year")
df["PlayerID"] = df["Name"] + "_" + df["Birthdate"]

with open(os.path.join(DATA, "players.json"), encoding="utf-8") as f:
    ids = {p["id"] for p in json.load(f)}

teams = {}
for pid, group in df.groupby("PlayerID", sort=False):
    if pid not in ids:
        continue
    seen = []
    for t in group["Team"]:
        if t not in seen:
            seen.append(t)
    teams[pid] = seen

missing = ids - teams.keys()
with open(os.path.join(DATA, "player_teams.json"), "w", encoding="utf-8") as f:
    json.dump(teams, f, ensure_ascii=False, separators=(",", ":"))

print(f"{len(teams)}명 저장, 기록 없는 선수 {len(missing)}명")
