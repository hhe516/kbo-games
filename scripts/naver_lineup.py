from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

from bs4 import BeautifulSoup

import json
import time
import os
import re

# ---------------------------------
# URL 입력
# ---------------------------------

url = input("나무위키 경기 URL 입력: ")

# ---------------------------------
# 크롬 실행
# ---------------------------------

options = webdriver.ChromeOptions()

# 필요 시 사용
# options.add_argument("--headless")

driver = webdriver.Chrome(
    service=Service(
        ChromeDriverManager().install()
    ),
    options=options
)

driver.get(url)

time.sleep(3)

html = driver.page_source

driver.quit()

# ---------------------------------
# BeautifulSoup
# ---------------------------------

soup = BeautifulSoup(
    html,
    "html.parser"
)

# ---------------------------------
# 포지션 맵
# ---------------------------------

position_map = {
    "LF": "LF",
    "CF": "CF",
    "RF": "RF",
    "SS": "SS",
    "2B": "2B",
    "3B": "3B",
    "1B": "1B",
    "DH": "DH",
    "C": "C",
    "SP": "P",
    "P": "P",
}

valid_positions = list(
    position_map.keys()
)

# ---------------------------------
# 이름 검증
# ---------------------------------

def is_valid_name(text):

    text = text.strip()

    banned_words = [

        "이닝",
        "타율",
        "안타",
        "홈런",
        "타점",
        "득점",
        "볼넷",
        "삼진",
        "경기",
        "기록",
        "순위",
        "결과",
        "ERA",
        "OPS",
        "WHIP",

        "선수명",
        "라인업",
        "선발",
        "포지션",

        "대한민국",
        "일본",
        "미국",
        "쿠바",
    ]

    if text in banned_words:
        return False

    # 한글 / 일본어 이름 허용
    if re.fullmatch(
        r"[가-힣ぁ-んァ-ヴー一-龥]{2,8}",
        text
    ):
        return True

    return False

# ---------------------------------
# 중복 제거
# ---------------------------------

def remove_duplicates(players):

    result = []

    used_positions = set()

    for p in players:

        pos = p["position"]

        if pos in used_positions:
            continue

        used_positions.add(pos)

        result.append(p)

    return result

# ---------------------------------
# 야구장 배치형 추출
# ---------------------------------

def extract_stadium_style():

    players = []

    elements = soup.find_all(
        string=True
    )

    texts = []

    for e in elements:

        t = e.strip()

        if t:
            texts.append(t)

    for i in range(len(texts)):

        current = texts[i]

        if current not in valid_positions:
            continue

        found_name = None

        # 위쪽 최대 5칸 탐색
        for j in range(1, 6):

            if i - j < 0:
                break

            candidate = (
                texts[i - j]
                .strip()
            )

            if is_valid_name(
                candidate
            ):

                found_name = candidate
                break

        if not found_name:
            continue

        players.append({

            "position":
                position_map[
                    current
                ],

            "name":
                found_name,

            "throws": "",

            "bats": ""
        })

    return remove_duplicates(
        players
    )

# ---------------------------------
# 일반 테이블형 추출
# ---------------------------------

def extract_table_style():

    players = []

    tables = soup.find_all(
        "table"
    )

    for table in tables:

        rows = table.find_all(
            "tr"
        )

        for row in rows:

            cols = row.find_all(
                ["td", "th"]
            )

            texts = [

                c.get_text(
                    strip=True
                )

                for c in cols
            ]

            if len(texts) < 2:
                continue

            found_position = None

            for text in texts:

                if text in valid_positions:

                    found_position = text
                    break

            if not found_position:
                continue

            found_name = None

            for text in texts:

                if text in valid_positions:
                    continue

                if is_valid_name(
                    text
                ):

                    found_name = text
                    break

            if not found_name:
                continue

            players.append({

                "position":
                    position_map[
                        found_position
                    ],

                "name":
                    found_name,

                "throws": "",

                "bats": ""
            })

    return remove_duplicates(
        players
    )

# ---------------------------------
# 키워드 기반 추출
# ---------------------------------

def extract_keyword_style():

    players = []

    all_text = soup.get_text(
        "\n"
    )

    lines = all_text.split("\n")

    for i, line in enumerate(lines):

        line = line.strip()

        if line not in valid_positions:
            continue

        found_name = None

        for j in range(1, 6):

            if i - j < 0:
                break

            candidate = (
                lines[i - j]
                .strip()
            )

            if is_valid_name(
                candidate
            ):

                found_name = candidate
                break

        if not found_name:
            continue

        players.append({

            "position":
                position_map[
                    line
                ],

            "name":
                found_name,

            "throws": "",

            "bats": ""
        })

    return remove_duplicates(
        players
    )

# ---------------------------------
# 추출 시도
# ---------------------------------

players = []

# 1차 시도
players = extract_stadium_style()

# 2차 시도
if len(players) < 8:

    players = extract_table_style()

# 3차 시도
if len(players) < 8:

    players = extract_keyword_style()

# ---------------------------------
# 포지션 순서 정렬
# ---------------------------------

position_order = [

    "P",
    "C",
    "1B",
    "2B",
    "3B",
    "SS",
    "LF",
    "CF",
    "RF",
    "DH",
]

final_players = []

for pos in position_order:

    for p in players:

        if p["position"] == pos:

            final_players.append(
                p
            )

            break

# ---------------------------------
# 자동 추출 결과 출력
# ---------------------------------

print()
print("===== 자동 추출 결과 =====")
print()

for i, p in enumerate(final_players):

    print(
        f"{i+1}. {p['position']} - {p['name']}"
    )

print()

# ---------------------------------
# 수동 수정
# ---------------------------------

while True:

    edit = input(
        "수정할 포지션 입력 (없으면 엔터): "
    ).strip().upper()

    if edit == "":
        break

    found = False

    for p in final_players:

        if p["position"] == edit:

            new_name = input(
                f"{edit} 새 선수명: "
            ).strip()

            p["name"] = new_name

            found = True

            print("수정 완료!")
            print()

            break

    if not found:

        print("포지션 없음!")
        print()

# ---------------------------------
# 최종 결과 출력
# ---------------------------------

print()
print("===== 최종 라인업 =====")
print()

for p in final_players:

    print(
        p["position"],
        p["name"]
    )

print()

# ---------------------------------
# 경기 정보 입력
# ---------------------------------

title = input(
    "경기 제목 입력: "
)

category = input(
    "카테고리 입력: "
)


# ---------------------------------
# 게임 객체 생성
# ---------------------------------

game = {

    "title": title,


    "category": category,

    "lineup": final_players
}

# ---------------------------------
# 저장 경로
# ---------------------------------

BASE_DIR = os.path.dirname(
    __file__
)

games_path = os.path.join(

    BASE_DIR,
    "..",
    "public",
    "data",
    "games.json"
)

os.makedirs(

    os.path.dirname(
        games_path
    ),

    exist_ok=True
)

# ---------------------------------
# 기존 games.json 읽기
# ---------------------------------

if os.path.exists(
    games_path
):

    with open(

        games_path,
        "r",
        encoding="utf-8"

    ) as f:

        try:

            games = json.load(f)

        except:

            games = []

else:

    games = []

# ---------------------------------
# 중복 경기 검사
# ---------------------------------

already_exists = False

for g in games:

    if g["title"] == title:

        already_exists = True
        break

# ---------------------------------
# 저장
# ---------------------------------

if already_exists:

    print()
    print("이미 존재하는 경기!")

else:

    games.append(game)

    with open(

        games_path,
        "w",
        encoding="utf-8"

    ) as f:

        json.dump(

            games,
            f,

            ensure_ascii=False,
            indent=2
        )

    print()
    print("games.json 저장 완료!")

# ---------------------------------
# 결과 출력
# ---------------------------------

print()

print("저장 위치:")
print(games_path)

print()

print(
    f"현재 총 경기 수: {len(games)}"
)