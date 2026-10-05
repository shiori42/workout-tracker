-- セットの数値欄の単位（'reps' = 回数 / 'sec' = 秒数）。NULL は旧データで、アプリ側が種目名から判定する
alter table public.exercises
  add column if not exists rep_unit text check (rep_unit in ('reps', 'sec'));
alter table public.workout_session_exercises
  add column if not exists rep_unit text check (rep_unit in ('reps', 'sec'));
