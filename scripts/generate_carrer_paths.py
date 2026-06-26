import pandas as pd
import json
import os
# --------------------------------
# players.json
# --------------------------------
BASE_DIR = os.path.dirname(__file__)
with open(
    os.path.join(
        BASE_DIR,
        "..",
        "public",
        "data",
        "players.json"
    ),
    encoding="utf-8"
) as f:

    players = json.load(f)
# --------------------------------
# 경로
# --------------------------------

batting = pd.read_csv(
    os.path.join(BASE_DIR, "..", "batting.csv"),
    encoding="cp949"
)

pitching = pd.read_csv(
    os.path.join(BASE_DIR, "..", "pitching.csv"),
    encoding="cp949"
)

# --------------------------------
# 데이터 합치기
# --------------------------------

df = pd.concat(
    [batting, pitching],
    ignore_index=True
)

# 필요한 컬럼

df = df[
    [
        "Name",
        "Birthdate",
        "Year",
        "Team",
        "WAR"
    ]
].copy()

# 문자열 정리

for col in [
    "Name",
    "Birthdate",
    "Team"
]:

    df[col] = (
        df[col]
        .astype(str)
        .str.strip()
    )

df["Year"] = pd.to_numeric(
    df["Year"],
    errors="coerce"
)

df["WAR"] = pd.to_numeric(
    df["WAR"],
    errors="coerce"
).fillna(0)

# --------------------------------
# 고유 ID
# --------------------------------

df["PlayerID"] = (
    df["Name"]
    + "_"
    + df["Birthdate"]
)

# --------------------------------
# 포지션 맵
# --------------------------------

position_map = {}

for p in players:

    position_map[p["id"]] = p["position"]
# --------------------------------
# 통산 WAR 계산
# --------------------------------

career_war = (
    df.groupby("PlayerID")["WAR"]
    .sum()
)

qualified = career_war[
    career_war >= 10
].index

df = df[
    df["PlayerID"].isin(
        qualified
    )
]

# --------------------------------
# 커리어 생성
# --------------------------------

career_paths = []

for pid, group in df.groupby("PlayerID"):

    group = (
        group
        .sort_values("Year")
        .drop_duplicates(
            ["Year", "Team"]
        )
    )

    career = []

    current_team = None
    start_year = None
    end_year = None

    for _, row in group.iterrows():

        team = row["Team"]
        year = int(row["Year"])

        if current_team is None:

            current_team = team
            start_year = year
            end_year = year

        elif current_team == team:

            end_year = year

        else:

            career.append({

                "team": current_team,
                "from": start_year,
                "to": end_year

            })

            current_team = team
            start_year = year
            end_year = year

    career.append({

        "team": current_team,
        "from": start_year,
        "to": end_year

    })
    if pid not in position_map:
        print(pid)
    
    career_paths.append({

    "id": pid,
    "name": group.iloc[0]["Name"],
    "position": position_map.get(pid, ""),
    "career": career

})

# --------------------------------
# 해외 커리어 덮어쓰기
# --------------------------------

override_path = os.path.join(
    BASE_DIR,
    "..",
    "public",
    "data",
    "career_overrides.json"
)

if os.path.exists(override_path):

    with open(
        override_path,
        encoding="utf-8"
    ) as f:

        overrides = json.load(f)

    for player in career_paths:

        if player["name"] in overrides:

            player["career"] = overrides[
                player["name"]
            ]

# --------------------------------
# 이름순 정렬
# --------------------------------

career_paths = sorted(
    career_paths,
    key=lambda x: x["name"]
)

# --------------------------------
# 저장
# --------------------------------

output = os.path.join(
    BASE_DIR,
    "..",
    "public",
    "data",
    "career_paths.json"
)

with open(
    output,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        career_paths,
        f,
        ensure_ascii=False,
        indent=2
    )

print("--------------------------------")
print(f"{len(career_paths)}명 생성 완료")
print(output)
print("--------------------------------")