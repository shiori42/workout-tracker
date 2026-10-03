-- ユーザーが書いた種目ごとのフォーム解説（{ setup, movement, tips, mistakes[], caution }）
alter table public.exercises add column if not exists guide jsonb;
