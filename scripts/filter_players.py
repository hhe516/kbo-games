import csv
import json

# -------------------------
# 파일 경로
# -------------------------

BATTING_FILE = "batting.csv"
PITCHING_FILE = "pitching.csv"

OUTPUT_FILE = "../public/data/players_modern.json"

# -------------------------
# 선수 저장
# -------------------------

players = {}

# -------------------------
# 타자 데이터
# -------------------------

with open(
    BATTING_FILE,
    "r",
    encoding="cp949"
) as f:

    reader = csv.DictReader(f)

    for row in reader:

        try:
            year = int(row["Year"])
        except:
            continue

        if year < 2000:
            continue

        pid = row["Id"]

        if pid not in players:

            handedness = row.get(
                "Handedness",
                ""
            )

            players[pid] = {

                "id": pid,

                "name":
                    row["Name"],

                "birthdate":
                    row["Birthdate"],

                "team":
                    row["Team"],

                "position":
                    row.get(
                        "Pos.",
                        ""
                    ),

                "age":
                    int(
                        row.get(
                            "Age",
                            0
                        )
                    ),

                "throws":
                    handedness,

                "nationality":
                    "한국",

                "number":
                    0
            }

# -------------------------
# 투수 데이터
# -------------------------

with open(
    PITCHING_FILE,
    "r",
    encoding="cp949"
) as f:

    reader = csv.DictReader(f)

    for row in reader:

        try:
            year = int(row["Year"])
        except:
            continue

        if year < 2000:
            continue

        pid = row["Id"]

        if pid not in players:

            handedness = row.get(
                "Handedness",
                ""
            )

            players[pid] = {

                "id": pid,

                "name":
                    row["Name"],

                "birthdate":
                    row["Birthdate"],

                "team":
                    row["Team"],

                "position":
                    "투수",

                "age":
                    int(
                        row.get(
                            "Age",
                            0
                        )
                    ),

                "throws":
                    handedness,

                "nationality":
                    "한국",

                "number":
                    0
            }

# -------------------------
# 저장
# -------------------------

result = list(
    players.values()
)

result.sort(
    key=lambda x:
    x["name"]
)

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        result,
        f,
        ensure_ascii=False,
        indent=2
    )

print()
print(
    f"선수 수: {len(result)}"
)

print(
    f"저장 완료: {OUTPUT_FILE}"
)