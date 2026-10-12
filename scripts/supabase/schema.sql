-- Supabase → SQL Editor 에 붙여넣고 Run (한 번만)
-- 데일리 결과: 사용자 × 게임 × 날짜 당 한 줄

create table if not exists public.daily_results (
  user_id    uuid        not null default auth.uid() references auth.users on delete cascade,
  game       text        not null,
  day        date        not null,
  score      int         not null default 0,
  done       boolean     not null default false,
  data       jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, game, day)
);

-- 본인 기록만 읽고 쓸 수 있게 (공개 키로 남의 기록 접근 불가)
alter table public.daily_results enable row level security;

drop policy if exists "read own"   on public.daily_results;
drop policy if exists "insert own" on public.daily_results;
drop policy if exists "update own" on public.daily_results;

create policy "read own"   on public.daily_results for select using (auth.uid() = user_id);
create policy "insert own" on public.daily_results for insert with check (auth.uid() = user_id);
create policy "update own" on public.daily_results for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
