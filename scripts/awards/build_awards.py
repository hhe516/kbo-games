"""수상/해외경력 데이터를 선수 JSON에 반영한다.

입력 (이 폴더):
  gg.txt       골든글러브 연도별 수상자 (한국어 위키백과 "KBO 골든글러브")
  mvp_roy.txt  정규시즌 MVP / 신인왕 ("KBO 최우수 선수상", "KBO 최우수 신인상")
  mlb.txt      MLB 정규시즌 출장 한국인 ("한국인 메이저리거")
  alias.json   수상 목록 이름 -> DB 이름 (예: 유지현 -> 류지현)
  force.json   "이름|연도" -> 선수 id (동명이인 수동 지정)
  ../../public/data/players_flags.json    (기존 mlb/npb/nationalTeam 수동 플래그)
  ../../public/data/career_overrides.json (해외 구단 경력 -> mlb/npb)

출력:
  public/data/player_awards.json   id -> {gg:[연도 포지션], mvp:[연도], roy:[연도], mlb:true, npb:true}
  public/data/players*.json        goldGlove(횟수), mvp(횟수), rookie, mlb, npb, nationalTeam 갱신

사용: python scripts/awards/build_awards.py   (convert.py 로 선수 JSON을 다시 만든 뒤 한 번 더 실행)
"""
import collections
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'public', 'data')
TARGETS = ['players.json', 'players_war10.json', 'players_war5.json', 'players_active.json']


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def save(name, obj, indent=2):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent)


players = load('players.json')
paths = {c['id']: c for c in load('career_paths.json')}
ALIAS = json.load(open(os.path.join(HERE, 'alias.json'), encoding='utf-8'))
FORCE = json.load(open(os.path.join(HERE, 'force.json'), encoding='utf-8'))

byname = collections.defaultdict(list)
for p in players:
    byname[p['name']].append(p)


def birth_year(p):
    return int(p['birthdate'][:4])


def resolve(name, team, year, hint):
    key = f'{name}|{year}'
    if key in FORCE:
        return FORCE[key], 'force'
    cands = byname.get(ALIAS.get(name, name), [])
    if hint:
        narrowed = [p for p in cands if birth_year(p) == int(hint)]
        if narrowed:
            cands = narrowed
    cands = [p for p in cands if 17 <= year - birth_year(p) <= 45]
    if not cands:
        return None, 'none'
    if len(cands) == 1:
        return cands[0]['id'], 'ok'
    by_career = [p for p in cands if p['id'] in paths
                 and any(team in s['team'] for s in paths[p['id']]['career'])]
    if len(by_career) == 1:
        return by_career[0]['id'], 'career'
    best = max(cands, key=lambda p: p['careerWar'])
    return best['id'], 'war'


def parse_tok(tok):
    parts = tok.split('/')
    return parts[0], parts[1], (parts[2] if len(parts) > 2 else None)


def lines(fname):
    with open(os.path.join(HERE, fname), encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                yield line


POS = ['투수', '포수', '1루수', '2루수', '3루수', '유격수', '외야수', '외야수', '외야수', '지명타자']
awards = collections.defaultdict(dict)
problems = []

for line in lines('gg.txt'):
    toks = line.split()
    year = int(toks[0])
    for pos, tok in zip(POS, toks[1:]):
        if tok == '-':
            continue
        n, t, h = parse_tok(tok)
        pid, how = resolve(n, t, year, h)
        if not pid:
            problems.append(f'GG {year} {tok}: 선수 DB에 없음')
            continue
        awards[pid].setdefault('gg', []).append(f'{year} {pos}')

section = None
for line in lines('mvp_roy.txt'):
    if line.startswith('['):
        section = 'mvp' if 'MVP' in line else 'roy'
        continue
    y, tok = line.split()
    n, t, h = parse_tok(tok)
    pid, how = resolve(n, t, int(y), h)
    if not pid:
        problems.append(f'{section} {y} {tok}: 선수 DB에 없음')
        continue
    awards[pid].setdefault(section, []).append(int(y))

for tok in ' '.join(lines('mlb.txt')).split():
    n, *h = tok.split('/')
    if f'{n}|mlb' in FORCE:
        awards[FORCE[f'{n}|mlb']]['mlb'] = True
        continue
    cands = [p for p in byname.get(n, []) if (not h or p['birthdate'].startswith(h[0])) and birth_year(p) < 2005]
    if cands:
        awards[max(cands, key=lambda p: p['careerWar'])['id']]['mlb'] = True

# career_overrides.json 의 해외 구단 경력도 반영
NPB = {'오릭스', '소프트뱅크', '지바롯데', '요미우리', '주니치', '한신', '야쿠르트', '라쿠텐', '세이부', '닛폰햄', '히로시마', '요코하마', '긴테쓰', '다이에'}
KBO = {'LG', 'MBC', '두산', 'OB', '삼성', '롯데', 'KIA', '해태', '한화', '빙그레', 'SSG', 'SK', '키움', '넥센', '우리',
       'NC', 'KT', '현대', '쌍방울', '태평양', '청보', '삼미'}
for pid, career in load('career_overrides.json').items():
    for s in career:
        if s['team'] in NPB:
            awards[pid]['npb'] = True
        elif s['team'] not in KBO:
            awards[pid]['mlb'] = True

awards = dict(sorted(awards.items()))
save('player_awards.json', awards, indent=1)

flags = load('players_flags.json')
for fname in TARGETS:
    rows = load(fname)
    for p in rows:
        a = awards.get(p['id'], {})
        fl = flags.get(p['id'], {})
        p['goldGlove'] = len(a.get('gg', []))
        p['mvp'] = len(a.get('mvp', []))
        p['rookie'] = bool(a.get('roy'))
        p['mlb'] = bool(a.get('mlb') or fl.get('mlb'))
        p['npb'] = bool(a.get('npb') or fl.get('npb'))
        p['nationalTeam'] = bool(fl.get('nationalTeam'))
    save(fname, rows)

print(f'수상/경력 데이터 {len(awards)}명 반영')
for msg in problems:
    print('  확인 필요:', msg)
