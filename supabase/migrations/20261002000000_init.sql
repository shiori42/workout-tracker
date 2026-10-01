-- 筋トレ管理アプリ 初期スキーマ
-- すべてのユーザーデータは user_id 単位で RLS により本人のみアクセス可能とする。
-- クライアント生成の文字列IDを主キー(user_id, id)に用いることで、オフライン作成→後から同期を可能にしている。

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- User / 設定
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '',
  monthly_goal int not null default 12,
  rest_counts_for_streak boolean not null default true,
  onboarded boolean not null default false,
  start_date date,
  weekday_schedule jsonb not null default '[null,null,null,null,null,null,null]'::jsonb,
  date_assignments jsonb not null default '{}'::jsonb,
  notif jsonb not null default '{}'::jsonb,
  active_session_id text,
  data_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.notification_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  type text not null,
  weekday int,
  time text,
  enabled boolean not null default true,
  extra jsonb not null default '{}'::jsonb,
  primary key (user_id, id)
);

create table public.timer_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_seconds int not null default 60,
  last_seconds int not null default 60,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- メニュー
create table public.exercises (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  body_part text not null,
  equipment text not null,
  weight_mode text not null default 'total',
  default_weight numeric not null default 0,
  default_reps int not null default 10,
  default_sets int not null default 3,
  default_rest_sec int not null default 60,
  intensity text not null default 'moderate',
  memo text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.exercise_muscle_map (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  exercise_id text not null,
  body_part text not null,
  contribution_rate numeric not null,
  primary key (user_id, id)
);

create table public.workout_templates (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  weekday int[] not null default '{}',
  exercise_order text[] not null default '{}',
  primary key (user_id, id)
);

-- ---------------------------------------------------------------- 実績
create table public.workout_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  template_id text,
  template_name text,
  start_at timestamptz not null,
  end_at timestamptz,
  estimated_kcal int,
  kcal_override int,
  note text not null default '',
  completed boolean not null default false,
  primary key (user_id, id)
);
create index workout_sessions_date_idx on public.workout_sessions (user_id, date);

create table public.workout_session_exercises (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  session_id text not null,
  exercise_id text not null,
  position int not null,
  name text not null,
  body_part text not null,
  equipment text not null,
  weight_mode text not null,
  intensity text not null,
  rest_sec int not null,
  memo text not null default '',
  primary key (user_id, id)
);
create index workout_session_exercises_session_idx on public.workout_session_exercises (user_id, session_id);

create table public.workout_sets (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  session_id text not null,
  session_exercise_id text not null,
  exercise_id text not null,
  set_no int not null,
  weight_kg numeric not null default 0,
  reps int not null default 0,
  completed boolean not null default false,
  done_at timestamptz,
  rest_sec int,
  primary key (user_id, id)
);
create index workout_sets_session_idx on public.workout_sets (user_id, session_id);

create table public.stamps (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  type text not null,
  reason text not null default '',
  primary key (user_id, id)
);

create table public.achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  type text not null,
  title text not null,
  achieved_at timestamptz not null default now(),
  value numeric,
  primary key (user_id, id)
);

-- ---------------------------------------------------------------- 食事・カロリー
create table public.meal_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  meal_type text not null,
  food_name text not null,
  amount text not null default '',
  kcal int not null default 0,
  protein_g numeric,
  fat_g numeric,
  carb_g numeric,
  photo_url text,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index meal_records_date_idx on public.meal_records (user_id, date);

create table public.extra_burns (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  label text not null,
  kcal int not null,
  primary key (user_id, id)
);

-- ---------------------------------------------------------------- 身体記録
create table public.body_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  height_cm numeric not null,
  weight_kg numeric not null,
  bmi numeric generated always as (round(weight_kg / ((height_cm / 100) * (height_cm / 100)), 1)) stored,
  body_fat_pct numeric,
  muscle_kg numeric,
  waist_cm numeric,
  photo_urls jsonb not null default '[]'::jsonb,
  note text not null default '',
  primary key (user_id, id)
);

-- ---------------------------------------------------------------- 分析
create table public.daily_muscle_fatigue (
  user_id uuid not null references auth.users (id) on delete cascade,
  date_time timestamptz not null,
  body_part text not null,
  fatigue_score int not null,
  calculated_at timestamptz not null default now(),
  primary key (user_id, date_time, body_part)
);

create table public.ai_reports (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  target_month text not null,
  summary text not null,
  highlights jsonb not null default '[]'::jsonb,
  cautions jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  source text not null default 'template',
  generated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------- Web Push（サーバー側の service role から操作）
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid references auth.users (id) on delete cascade,
  keys jsonb not null,
  profile jsonb not null default '{}'::jsonb,
  sent_log jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scheduled_pushes (
  id text primary key,
  endpoint text not null references public.push_subscriptions (endpoint) on delete cascade,
  send_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index scheduled_pushes_send_at_idx on public.scheduled_pushes (send_at);

-- ---------------------------------------------------------------- RLS
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'notification_settings', 'timer_settings', 'exercises', 'exercise_muscle_map',
    'workout_templates', 'workout_sessions', 'workout_session_exercises', 'workout_sets',
    'stamps', 'achievements', 'meal_records', 'extra_burns', 'body_records',
    'daily_muscle_fatigue', 'ai_reports', 'push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I alter column user_id set default auth.uid()', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;

-- scheduled_pushes はサーバー（service role）専用
alter table public.scheduled_pushes enable row level security;

-- ---------------------------------------------------------------- Storage（写真は本人フォルダのみ）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: own folder update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
