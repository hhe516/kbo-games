import pandas as pd
import json

# -----------------------------
# CSV 불러오기
# -----------------------------

batting_df = pd.read_csv(
    "batting.csv",
    encoding="cp949"
)

pitching_df = pd.read_csv(
    "pitching.csv",
    encoding="cp949"
)

# -----------------------------
# 필요한 컬럼만 추출
# -----------------------------

batting_players = batting_df[[
    "Name",
    "Team",
    "Birthdate",
    "Handedness",
    "School"
]].copy()

pitching_players = pitching_df[[
    "Name",
    "Team",
    "Birthdate",
    "Handedness",
    "School"
]].copy()

# -----------------------------
# 타자 + 투수 합치기
# -----------------------------

all_players = pd.concat([
    batting_players,
    pitching_players
])

# -----------------------------
# 컬럼명 변경
# -----------------------------

all_players.columns = [
    "name",
    "team",
    "birthdate",
    "throws",
    "school"
]

# -----------------------------
# 가장 오래 뛴 팀 찾기
# -----------------------------

team_count = (
    all_players
    .groupby(["name", "team"])
    .size()
    .reset_index(name="count")
)

main_team = (
    team_count
    .sort_values(
        ["name", "count"],
        ascending=[True, False]
    )
    .drop_duplicates(
        subset=["name"]
    )
)

# -----------------------------
# 대표팀 기준으로 선수 정리
# -----------------------------

all_players = (
    all_players
    .drop_duplicates(
        subset=["name"]
    )
    .merge(
        main_team[["name", "team"]],
        on="name",
        suffixes=("", "_main")
    )
)

# 대표팀으로 교체

all_players["team"] = (
    all_players["team_main"]
)

all_players = (
    all_players
    .drop(columns=["team_main"])
)
# -----------------------------
# 이름순 정렬
# -----------------------------

all_players = (
    all_players
    .sort_values("name")
)

# -----------------------------
# index 초기화
# -----------------------------

all_players = (
    all_players
    .reset_index(drop=True)
)

# -----------------------------
# id 생성
# -----------------------------

all_players["id"] = (
    all_players.index + 1
)

# -----------------------------
# JSON 변환
# -----------------------------

players_json = (
    all_players
    .to_dict(orient="records")
)

# -----------------------------
# 저장
# -----------------------------

with open(
    "public/data/all_players.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        players_json,
        f,
        ensure_ascii=False,
        indent=2
    )

# -----------------------------
# 완료 메시지
# -----------------------------

print("전체 선수 저장 완료!")
print(f"총 선수 수: {len(players_json)}")