from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

from bs4 import BeautifulSoup

import json
import time

# -------------------------
# curated_games 불러오기
# -------------------------

with open(
    "public/data/curated_games.json",
    "r",
    encoding="utf-8"
) as f:

    curated_games = json.load(f)

# -------------------------
# Selenium 실행
# -------------------------

driver = webdriver.Chrome(
    service=Service(
        ChromeDriverManager().install()
    )
)

driver.get("https://statiz.co.kr")

print("로그인 후 엔터")
input()

# -------------------------
# 포지션 변환
# -------------------------

position_map = {
    "포수": "C",
    "1루수": "1B",
    "2루수": "2B",
    "3루수": "3B",
    "유격수": "SS",
    "좌익수": "LF",
    "중견수": "CF",
    "우익수": "RF",
    "지명타자": "DH",
    "투수": "P"
}

# -------------------------
# 라인업 파싱 함수
# -------------------------

def parse_table(table):

    rows = table.find_all("tr")

    lineup = []

    for row in rows[1:]:

        cols = row.find_all("td")

        if len(cols) < 4:
            continue

        name = cols[1].get_text(strip=True)

        position_kr = cols[2].get_text(strip=True)

        handed = cols[3].get_text(strip=True)

        position = position_map.get(
            position_kr,
            position_kr
        )

        throws = "?"
        bats = "?"

        if "우투" in handed:
            throws = "우투"

        elif "좌투" in handed:
            throws = "좌투"

        if "우타" in handed:
            bats = "우타"

        elif "좌타" in handed:
            bats = "좌타"

        elif "양타" in handed:
            bats = "양타"

        lineup.append({
            "position": position,
            "name": name,
            "throws": throws,
            "bats": bats
        })

    return lineup

# -------------------------
# 전체 경기 저장
# -------------------------

all_games = []

# -------------------------
# 경기 순회
# -------------------------

for game in curated_games:

    print("\n처리 중:")
    print(game["title"])

    url = game["url"]

    driver.get(url)

    time.sleep(5)

    html = driver.page_source

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    tables = soup.find_all("table")

    if len(tables) < 2:

        print("라인업 테이블 없음")
        continue

    away_table = tables[0]
    home_table = tables[1]

    away_lineup = parse_table(
        away_table
    )

    home_lineup = parse_table(
        home_table
    )

    # 홈/원정 선택
    if game["teamSide"] == "away":

        lineup = away_lineup

    else:

        lineup = home_lineup

    game_data = {
        "title": game["title"],
        "difficulty": game["difficulty"],
        "category": game["category"],
        "lineup": lineup
    }

    all_games.append(
        game_data
    )

# -------------------------
# 저장
# -------------------------

with open(
    "public/data/games.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        all_games,
        f,
        ensure_ascii=False,
        indent=2
    )

driver.quit()

print("\n모든 경기 저장 완료")