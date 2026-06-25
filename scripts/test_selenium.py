from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

import time

driver = webdriver.Chrome(
    service=Service(
        ChromeDriverManager().install()
    )
)

# 먼저 메인페이지
driver.get(
    "https://statiz.co.kr"
)

print("브라우저에서 직접 로그인하세요.")
print("로그인 완료 후 아무 키나 입력하세요.")

input()

# 로그인 끝난 뒤 이동
driver.get(
    "https://statiz.co.kr/schedule/?m=gamelogs&s_no=20251014"
)

# 로딩 기다리기
time.sleep(10)

# 저장
with open(
    "selenium_test.html",
    "w",
    encoding="utf-8"
) as f:

    f.write(driver.page_source)

print("HTML 저장 완료")

input("엔터 누르면 종료")

driver.quit()