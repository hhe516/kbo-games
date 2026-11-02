# 현재 소속팀 (current_teams.json)

KBO 공식 "선수 조회"(koreabaseball.com/Player/Search.aspx) 팀별 등록 선수 목록을
players.json 의 선수(이름 + 생년월일)와 맞춰서 만든 파일.

- public/data/current_teams.json: { "선수 id": "현재 팀" } — 지금 KBO에 등록된 선수만 들어 있음
- kbo_roster_YYYY-MM-DD.txt: 그날 받은 원본을 줄인 것 ("players.json 순번 + 팀 글자", 순번은 그 날짜의 players.json 기준)
  팀 글자: L=LG D=두산 S=삼성 R=롯데 K=KIA H=한화 G=SSG W=키움 N=NC T=KT

쓰는 곳: 팀 맞히기(/quiz, 이 파일에 있는 선수만 출제), Who Are Ya(팀 비교).
이적·FA 시즌에는 다시 받아서 갱신할 것. (players.json 을 새로 만들면 순번이 바뀌니 txt 가 아니라 json 을 다시 생성)
