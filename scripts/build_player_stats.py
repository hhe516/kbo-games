"""선수별 누적 기록·경력 요약을 만든다 (Bingo·Grid 조건용).

batting.csv / pitching.csv 시즌 기록 → public/data/player_stats.json
  {선수 id: {"s": 1군 시즌 수, "f": 한 구단(옛 이름 포함)에서 뛴 최다 시즌 수,
             "c": 한국시리즈 우승 횟수(우승한 해에 그 팀 소속 1군 출전),
             "h": 통산 안타, "hr": 통산 홈런, "w": 통산 승, "sv": 통산 세이브}}
0 인 값은 생략.

한국시리즈 우승팀 출처: 한국어 위키백과 "한국시리즈" (2026-10-12 확인, 2025년까지)
사용: python scripts/build_player_stats.py   (convert.py 다음에 실행)
"""
import json
import os
from collections import defaultdict

import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE_DIR, "..")
DATA = os.path.join(ROOT, "public", "data")

# 현재 구단 기준으로 옛 이름 묶기 (src/lib/kbo.js 의 FRANCHISES 와 같게)
FRANCHISE = {"MBC": "LG", "OB": "두산", "해태": "KIA", "빙그레": "한화", "SK": "SSG", "넥센": "키움", "우리": "키움",
             "삼미": "현대", "청보": "현대", "태평양": "현대",
             "쌍방울": "SSG"}  # 쌍방울은 게임에서 SK·SSG 와 묶음
fr = lambda t: FRANCHISE.get(t, t)

CHAMPIONS = {
    1982: "두산", 1983: "KIA", 1984: "롯데", 1985: "삼성", 1986: "KIA", 1987: "KIA", 1988: "KIA",
    1989: "KIA", 1990: "LG", 1991: "KIA", 1992: "롯데", 1993: "KIA", 1994: "LG", 1995: "두산",
    1996: "KIA", 1997: "KIA", 1998: "현대", 1999: "한화", 2000: "현대", 2001: "두산", 2002: "삼성",
    2003: "현대", 2004: "현대", 2005: "삼성", 2006: "삼성", 2007: "SSG", 2008: "SSG", 2009: "KIA",
    2010: "SSG", 2011: "삼성", 2012: "삼성", 2013: "삼성", 2014: "삼성", 2015: "두산", 2016: "두산",
    2017: "KIA", 2018: "SSG", 2019: "두산", 2020: "NC", 2021: "KT", 2022: "SSG", 2023: "LG",
    2024: "KIA", 2025: "LG",
}


def load(name, cols):
    df = pd.read_csv(os.path.join(ROOT, name), encoding="cp949", usecols=["Name", "Birthdate", "Year", "Team"] + cols)
    for c in ("Name", "Birthdate", "Team"):
        df[c] = df[c].astype(str).str.strip()
    df["id"] = df["Name"] + "_" + df["Birthdate"]
    return df


bat = load("batting.csv", ["H", "HR"])
pit = load("pitching.csv", ["W", "S"])

with open(os.path.join(DATA, "players.json"), encoding="utf-8") as f:
    ids = {p["id"] for p in json.load(f)}

stats = defaultdict(dict)


def add(pid, key, val):
    if val:
        stats[pid][key] = stats[pid].get(key, 0) + int(val)


for row in bat.itertuples():
    add(row.id, "h", row.H)
    add(row.id, "hr", row.HR)
for row in pit.itertuples():
    add(row.id, "w", row.W)
    add(row.id, "sv", row.S)

seasons = pd.concat([bat[["id", "Year", "Team"]], pit[["id", "Year", "Team"]]]).drop_duplicates()
seasons["fr"] = seasons["Team"].map(fr)
for pid, g in seasons.groupby("id"):
    years = g["Year"].nunique()
    best = g.drop_duplicates(["Year", "fr"]).groupby("fr")["Year"].nunique().max()
    champ = g.drop_duplicates(["Year", "fr"]).apply(lambda r: CHAMPIONS.get(int(r["Year"])) == r["fr"], axis=1).sum()
    add(pid, "s", years)
    add(pid, "f", best)
    add(pid, "c", champ)

out = {pid: stats[pid] for pid in sorted(stats) if pid in ids}
with open(os.path.join(DATA, "player_stats.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(out)}명 저장")
