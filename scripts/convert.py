import pandas as pd
import json
import os
import random
from datetime import datetime

current_year = datetime.now().year

# -----------------------------
# 경로 설정
# -----------------------------

BASE_DIR = os.path.dirname(__file__)

batting_path = os.path.join(
    BASE_DIR,
    "..",
    "batting.csv"
)

pitching_path = os.path.join(
    BASE_DIR,
    "..",
    "pitching.csv"
)

output_dir = os.path.join(
    BASE_DIR,
    "..",
    "public",
    "data"
)

os.makedirs(
    output_dir,
    exist_ok=True
)

players_path = os.path.join(
    output_dir,
    "players.json"
)

war5_path = os.path.join(
    output_dir,
    "players_war5.json"
)

war10_path = os.path.join(
    output_dir,
    "players_war10.json"
)

# -----------------------------
# CSV 불러오기
# -----------------------------

batting_df = pd.read_csv(
    batting_path,
    encoding="cp949"
)

pitching_df = pd.read_csv(
    pitching_path,
    encoding="cp949"
)

# -----------------------------
# 필요한 컬럼만 선택
# -----------------------------

columns = [
    "Name",
    "Birthdate",
    "Team",
    "Pos.",
    "Handedness",
    "School",
    "Year",
    "WAR",
]

batting_df = batting_df[columns]
pitching_df = pitching_df[columns]

# -----------------------------
# 데이터 합치기
# -----------------------------

df = pd.concat(
    [batting_df, pitching_df],
    ignore_index=True
)

# -----------------------------
# 문자열 정리
# -----------------------------

for col in [
    "Name",
    "Birthdate",
    "Team",
    "Pos.",
    "Handedness",
    "School",
]:
    df[col] = (
        df[col]
        .astype(str)
        .str.strip()
    )

# -----------------------------
# 숫자 변환
# -----------------------------

df["WAR"] = pd.to_numeric(
    df["WAR"],
    errors="coerce"
).fillna(0)

df["Year"] = pd.to_numeric(
    df["Year"],
    errors="coerce"
).fillna(0)

# -----------------------------
# PlayerID
# -----------------------------

df["PlayerID"] = (
    df["Name"]
    + "_"
    + df["Birthdate"]
)

# -----------------------------
# 통산 WAR 계산
# -----------------------------

career_war = (
    df.groupby("PlayerID")["WAR"]
    .sum()
)

# -----------------------------
# 최신 시즌
# -----------------------------

df = df.sort_values("Year")

latest_df = (
    df.groupby("PlayerID")
    .tail(1)
)
ACTIVE_YEAR = 2025

active_players = set(
    df.loc[
        df["Year"] == ACTIVE_YEAR,
        "PlayerID"
    ]
)

active_war3 = set(
    career_war[
        career_war >= 3
    ].index
)
# -----------------------------
# 투타 변환
# -----------------------------

def convert_handedness(hand):

    hand = str(hand).strip()

    mapping = {
        "Right-Right": "우투우타",
        "Right-Left": "우투좌타",
        "Left-Left": "좌투좌타",
        "Left-Right": "좌투우타",
        "Switch": "양타",
    }

    return mapping.get(hand, hand)

# -----------------------------
# 나이 계산
# -----------------------------

def calculate_current_age(birth):

    try:
        year = int(str(birth)[:4])
        return current_year - year
    except:
        return 0

# -----------------------------
# 국적
# -----------------------------

def is_foreign_player(school):

    school = str(school).strip()

    if school in ["", "-", "nan", "NaN"]:
        return "외국"

    for c in school:
        if "가" <= c <= "힣":
            return "한국"

    return "외국"

# -----------------------------
# 대표 포지션
# -----------------------------

position_map = {}

for pid in df["PlayerID"].unique():

    rows = df[df["PlayerID"] == pid]

    counts = {
        "투수": 0,
        "포수": 0,
        "내야": 0,
        "외야": 0,
    }

    for pos in rows["Pos."].astype(str).str.upper():

        if "DH" in pos:
            continue

        elif any(x in pos for x in ["LF", "CF", "RF", "OF"]):
            counts["외야"] += 1

        elif any(x in pos for x in ["1B", "2B", "3B", "SS", "IF"]):
            counts["내야"] += 1

        elif pos == "C":
            counts["포수"] += 1

        elif any(x in pos for x in ["P", "SP", "RP"]):
            counts["투수"] += 1

    if max(counts.values()) == 0:
        counts["내야"] = 1

    position_map[pid] = max(
        counts,
        key=counts.get
    )

# -----------------------------
# 대표팀
# -----------------------------

team_map = {}

for pid in df["PlayerID"].unique():

    rows = df[df["PlayerID"] == pid]

    team_map[pid] = (
        rows["Team"]
        .mode()
        .iloc[0]
    )

# -----------------------------
# 선수 생성
# -----------------------------

players = []

added = set()

for _, row in latest_df.iterrows():

    pid = row["PlayerID"]

    if pid in added:
        continue

    added.add(pid)

    players.append({

        "id": pid,

        "name": row["Name"],

        "birthdate": row["Birthdate"],

        "team": team_map[pid],

        "position": position_map[pid],

        "careerWar": round(
            float(career_war.get(pid, 0)),
            2
        ),

        "age": calculate_current_age(
            row["Birthdate"]
        ),

        "throws": convert_handedness(
            row["Handedness"]
        ),

        "nationality": is_foreign_player(
            row["School"]
        ),

        "active": (
    pid in active_players
    and pid in active_war3
)

    })

# -----------------------------
# 정렬
# -----------------------------

players = sorted(
    players,
    key=lambda x: x["name"]
)

# -----------------------------
# WAR별 분리
# -----------------------------

players_war5 = [
    p for p in players
    if p["careerWar"] >= 5
]

players_war10 = [
    p for p in players
    if p["careerWar"] >= 10
]
# -----------------------------
# 셔플
# -----------------------------

random.seed(2026)

def shuffle_players(players):

    players = players.copy()

    random.shuffle(players)

    return players

# -----------------------------
# 저장 함수
# -----------------------------

def save_json(path, data):

    with open(
        path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )

save_json(
    players_path,
    shuffle_players(players)
)

save_json(
    war5_path,
    shuffle_players(players_war5)
)

save_json(
    war10_path,
    shuffle_players(players_war10)
)

print(f"전체 선수 : {len(players)}명")
print(f"WAR 5+ : {len(players_war5)}명")
print(f"WAR 10+ : {len(players_war10)}명")

print(players_path)
print(war5_path)
print(war10_path)