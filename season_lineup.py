import pandas as pd
import json

# 만들고 싶은 시즌들
SEASONS = [
("삼성", 2005),
("삼성", 2011),
("삼성", 2012),
("삼성", 2013),
("삼성", 2014),
("두산", 2008),
("두산", 2015),
("두산", 2016),
("두산", 2018),
("두산", 2019),
("LG", 2013),
("LG", 2016),
("LG", 2022),
("LG", 2023),
("롯데", 2008),
("롯데", 2010),
("롯데", 2011),
("롯데", 2017),
("KIA", 2009),
("KIA", 2011),
("KIA", 2017),
("KIA", 2024),
("SK", 2008),
("SK", 2010),
("SK", 2011),
("SSG", 2022),
("우리", 2008),
("넥센", 2014),
("넥센", 2016),
("넥센", 2018),
("키움", 2019),
("NC", 2015),
("NC", 2016),
("NC", 2020),
("NC", 2023),
("KT", 2020),
("KT", 2021),
("KT", 2023),
("한화", 2006),
("한화", 2007),
("한화", 2018),
]

INF_POSITIONS = [
    "C",
    "1B",
    "2B",
    "SS",
    "3B",
]

batting = pd.read_csv(
    "batting.csv",
    encoding="cp949"
)

pitching = pd.read_csv(
    "pitching.csv",
    encoding="cp949"
)

games = []

for team, year in SEASONS:

    season_df = batting[
        (batting["Team"] == team) &
        (batting["Year"] == year)
    ].copy()

    pitcher_df = pitching[
        (pitching["Team"] == team) &
        (pitching["Year"] == year)
    ].copy()

    if season_df.empty:
        print(f"데이터 없음 : {year} {team}")
        continue

    lineup = []
    selected_players = set()

    # -------------------------
    # P
    # -------------------------
    if not pitcher_df.empty:

        pitcher_df = pitcher_df.sort_values(
            ["GS", "IP"],
            ascending=False
        )

        ace = pitcher_df.iloc[0]["Name"]

        lineup.append({
            "position": "P",
            "name": ace
        })

        selected_players.add(ace)

    # -------------------------
    # 내야 (WAR)
    # -------------------------
    for pos in INF_POSITIONS:

        pos_df = season_df[
            season_df["Pos."]
            .astype(str)
            .str.contains(
                f"^{pos}$",
                regex=True,
                na=False
            )
        ].copy()

        if pos_df.empty:
            continue

        pos_df = pos_df.sort_values(
            "WAR",
            ascending=False
        )

        for _, row in pos_df.iterrows():

            if row["Name"] not in selected_players:

                lineup.append({
                    "position": pos,
                    "name": row["Name"]
                })

                selected_players.add(row["Name"])
                break

    # -------------------------
    # 외야 (WAR 상위 3명)
    # -------------------------
    of_df = season_df[
        season_df["Pos."]
        .astype(str)
        .str.contains(
            "LF|CF|RF|OF",
            regex=True,
            na=False
        )
    ].copy()

    of_df = of_df.sort_values(
        "WAR",
        ascending=False
    )

    of_count = 0

    for _, row in of_df.iterrows():

        if row["Name"] in selected_players:
            continue

        lineup.append({
            "position": f"OF{of_count+1}",
            "name": row["Name"]
        })

        selected_players.add(row["Name"])

        of_count += 1

        if of_count == 3:
            break

    # -------------------------
    # DH
    # -------------------------
    dh_df = season_df[
        season_df["Pos."]
        .astype(str)
        .str.contains(
            "^DH$",
            regex=True,
            na=False
        )
    ].copy()

    if not dh_df.empty:

        dh_df = dh_df[
            ~dh_df["Name"].isin(selected_players)
        ]

        dh_df = dh_df.sort_values(
            "G",
            ascending=False
        )

        if not dh_df.empty:

            lineup.append({
                "position": "DH",
                "name": dh_df.iloc[0]["Name"]
            })

            selected_players.add(
                dh_df.iloc[0]["Name"]
            )

    else:

        remain_df = season_df[
            ~season_df["Name"].isin(selected_players)
        ].copy()

        remain_df = remain_df.sort_values(
            "WAR",
            ascending=False
        )

        if not remain_df.empty:

            lineup.append({
                "position": "DH",
                "name": remain_df.iloc[0]["Name"]
            })

            selected_players.add(
                remain_df.iloc[0]["Name"]
            )

    games.append({
        "title": f"{year} {team} 베스트",
        "team": team,
        "opponent": "-",
        "category": "시즌 베스트",
        "lineup": lineup
    })

with open(
    "season_games.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        games,
        f,
        ensure_ascii=False,
        indent=2
    )

print(f"{len(games)}개 시즌 생성 완료")