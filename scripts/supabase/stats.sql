-- Supabase → SQL Editor 에 붙여넣고 Run (한 번만)
-- 오늘의 문제 통계: 끝낸 판의 결과만 익명으로 모아서 평균·순위·칸별 선택률 계산
-- (로그인 안 한 사람도 포함. 브라우저마다 랜덤 id 하나)

create table if not exists public.daily_plays (
  client_id  text        not null,
  game       text        not null,
  day        date        not null,
  score      int         not null default 0,   -- 클수록 잘한 것 (게임마다 기준은 코드 주석 참고)
  solved     boolean     not null default false,
  picks      jsonb,                            -- 그리드: {"칸번호": "선수 id"}
  created_at timestamptz not null default now(),
  primary key (client_id, game, day)
);

-- 표를 직접 읽고 쓰는 건 막고, 아래 두 함수로만 접근
alter table public.daily_plays enable row level security;

-- 결과 제출: 게임 이름·날짜(어제~내일)만 받음, 같은 브라우저는 하루 한 번
create or replace function public.submit_daily(
  p_client text, p_game text, p_day date, p_score int, p_solved boolean, p_picks jsonb
) returns void
language sql security definer set search_path = public as $$
  insert into daily_plays (client_id, game, day, score, solved, picks)
  select left(p_client, 64), p_game, p_day, greatest(0, least(p_score, 1000)), p_solved, p_picks
  where p_game in ('grid', 'careerpath', 'whoru')
    and p_day between (now() at time zone 'Asia/Seoul')::date - 1 and (now() at time zone 'Asia/Seoul')::date + 1
  on conflict (client_id, game, day) do nothing;
$$;

-- 통계: 참여자 수, 평균 점수, 점수별 인원, 정답 인원, (그리드) 칸별 선수 선택 수
create or replace function public.daily_stats(p_game text, p_day date)
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'players', (select count(*) from daily_plays where game = p_game and day = p_day),
    'solved',  (select count(*) from daily_plays where game = p_game and day = p_day and solved),
    'avg',     (select round(avg(score)::numeric, 1) from daily_plays where game = p_game and day = p_day),
    'dist',    (select coalesce(json_object_agg(score, c), '{}'::json)
                  from (select score, count(*) c from daily_plays
                        where game = p_game and day = p_day group by score) s),
    'picks',   (select coalesce(json_object_agg(cell, ids), '{}'::json)
                  from (select cell, json_object_agg(pid, c) ids
                          from (select e.key cell, e.value #>> '{}' pid, count(*) c
                                  from daily_plays, jsonb_each(picks) e
                                 where game = p_game and day = p_day and picks is not null
                                 group by 1, 2) x
                         group by cell) y)
  );
$$;

grant execute on function public.submit_daily(text, text, date, int, boolean, jsonb) to anon, authenticated;
grant execute on function public.daily_stats(text, date) to anon, authenticated;
