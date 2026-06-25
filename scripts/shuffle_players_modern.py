import json
import random

INPUT_FILE = "../public/data/players_modern.json"
OUTPUT_FILE = "../public/data/players_shuffled.json"

with open(
    INPUT_FILE,
    "r",
    encoding="utf-8"
) as f:

    players = json.load(f)

random.shuffle(players)

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        players,
        f,
        ensure_ascii=False,
        indent=2
    )

print()
print(f"원본 선수 수: {len(players)}")
print(f"저장 완료: {OUTPUT_FILE}")