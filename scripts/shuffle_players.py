import json
import random
import os

BASE_DIR = os.path.dirname(__file__)

input_path = os.path.join(
    BASE_DIR,
    "..",
    "public",
    "data",
    "players.json"
)

output_path = os.path.join(
    BASE_DIR,
    "..",
    "public",
    "data",
    "players_shuffled.json"
)

with open(
    input_path,
    "r",
    encoding="utf-8"
) as f:

    players = json.load(f)

random.shuffle(players)

for i, player in enumerate(players):

    player["number"] = i + 1

with open(
    output_path,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        players,
        f,
        ensure_ascii=False,
        indent=2
    )

print("셔플 완료")