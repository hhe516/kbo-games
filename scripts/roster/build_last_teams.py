"""
지금 KBO 등록 선수(current_teams.json)마다 "직전 기록상 마지막 소속팀"을 뽑아 last_teams.json 으로 저장
- batting.csv / pitching.csv 에서 그 선수의 가장 최근 시즌, 그 시즌 마지막 줄의 팀 (시즌 중 이적이면 뒤쪽 팀)
- 옛 구단 이름은 지금 이름으로 (SK→SSG, 넥센·우리→키움 …)
- 팀 맞히기에서 이적생의 이적 전 팀을 오답 보기에 넣을 때 씀

실행: python scripts/roster/build_last_teams.py
"""
import json
import os

import pandas as pd

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
NOW = {"SK": "SSG", "넥센": "키움", "우리": "키움", "해태": "KIA", "OB": "두산", "MBC": "LG", "빙그레": "한화"}

current = json.load(open(os.path.join(ROOT, "public", "data", "current_teams.json"), encoding="utf-8"))
rows = pd.concat(
    [pd.read_csv(os.path.join(ROOT, f), encoding="cp949") for f in ("batting.csv", "pitching.csv")]
)
rows["pid"] = rows["Name"] + "_" + rows["Birthdate"]
rows = rows[rows["pid"].isin(current)].reset_index()  # index = 파일 안 순서 (같은 해 여러 팀이면 뒤가 나중)

last = {}
for pid, g in rows.groupby("pid"):
    y = g["Year"].max()
    team = g[g["Year"] == y].sort_values("index").iloc[-1]["Team"]
    last[pid] = {"team": NOW.get(team, team), "year": int(y)}

json.dump(last, open(os.path.join(ROOT, "public", "data", "last_teams.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
moved = [(k.split("_")[0], v["team"], current[k]) for k, v in last.items() if v["team"] != current[k]]
print(len(last), "명 저장, 이적", len(moved), "명:", moved[:30])
