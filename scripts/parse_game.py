from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

from bs4 import BeautifulSoup

import json
import time

# -------------------------
# 경기 URL 입력
# -------------------------

url = input("경기 URL 입력: ")

# -------------------------
# Selenium 실행
# -------------------------

driver = webdriver.Chrome(
    service=Service(
        ChromeDriverManager().install()
    )
)

# 로그인용
driver.get("https://statiz.co.kr")

print("브라우저에서 로그인 후 엔터")
input()

# 경기 페이지 이동
driver.get(url)

time.sleep(5)

html = driver.page_source

driver.quit()

# -------------------------
# HTML 파싱
# -------------------------

soup = BeautifulSoup(
    html,
    "html.parser"
)

tables = soup.find_all("table")

away_table = tables[0]
home_table = tables[1]

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
# 라인업 추출 함수
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

        # 투타 분리
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
# 양 팀 라인업 추출
# -------------------------

away_lineup = parse_table(
    away_table
)

home_lineup = parse_table(
    home_table
)

# -------------------------
# 팀 선택
# -------------------------

print("\n어느 팀으로 만들까요?")
print("1 = 원정팀")
print("2 = 홈팀")

choice = input("선택: ")

if choice == "1":

    selected_lineup = away_lineup

    team_name = "원정팀"

else:

    selected_lineup = home_lineup

    team_name = "홈팀"

# -------------------------
# 게임 데이터 생성
# -------------------------

game_data = {
    "title": "자동 생성 경기",
    "team": team_name,
    "lineup": selected_lineup
}

# -------------------------
# 저장
# -------------------------

with open(
    "game_result.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        game_data,
        f,
        ensure_ascii=False,
        indent=2
    )

print("\ngame_result.json 생성 완료")