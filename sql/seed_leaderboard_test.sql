-- Seed data for leaderboard testing (no real users required)
-- Run this in Supabase SQL Editor
--
-- NOTE: profiles.id is FK -> auth.users(id). Since these rows aren't real
-- Supabase users, the FK is dropped first (test environment only). Do NOT
-- re-add it while fake rows remain, or run the cleanup block at the bottom.

BEGIN;

-- Drop FK so we can insert rows without matching auth.users entries
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 1) Fake players
INSERT INTO profiles (id, username, classic_high_score, current_streak, best_streak, coins, gems, language, avatar_color, created_at)
VALUES
  (gen_random_uuid(), 'أحمد_الرياض',   4250, 23, 45, 320,  80, 'ar', '#7C3AED', now()),
  (gen_random_uuid(), 'سارة٩٩',         3890, 15, 31, 210,  45, 'ar', '#EC4899', now()),
  (gen_random_uuid(), 'خالد_pro',       3640,  8, 22, 180,  30, 'ar', '#F59E0B', now()),
  (gen_random_uuid(), 'ليلى_games',     3120, 31, 31, 450, 120, 'ar', '#22C55E', now()),
  (gen_random_uuid(), 'محمد_بطل',       2980,  7, 19, 150,  20, 'ar', '#3B82F6', now()),
  (gen_random_uuid(), 'نورا_٢٠٢٥',      2750, 44, 44, 520, 200, 'ar', '#EF4444', now()),
  (gen_random_uuid(), 'WordMaster',     5100, 12, 28, 300,  90, 'en', '#7C3AED', now()),
  (gen_random_uuid(), 'LetterKing',     4800, 19, 35, 400, 110, 'en', '#F59E0B', now()),
  (gen_random_uuid(), 'QuizPro99',      4200,  5, 17, 200,  60, 'en', '#22C55E', now()),
  (gen_random_uuid(), 'AlphaGamer',     3700, 27, 27, 350,  75, 'en', '#EC4899', now()),
  (gen_random_uuid(), 'عمر_كلمات',      2600,  3, 14, 100,  15, 'ar', '#22D3EE', now()),
  (gen_random_uuid(), 'ريم_فايزة',      2400, 18, 25, 280,  55, 'ar', '#A855F7', now()),
  (gen_random_uuid(), 'فيصل_win',       2200,  9, 20, 160,  35, 'ar', '#EF4444', now()),
  (gen_random_uuid(), 'بدر_١٢٣',        2000,  6, 11, 130,  25, 'ar', '#3B82F6', now()),
  (gen_random_uuid(), 'WordNinja',      3500, 22, 33, 320,  85, 'en', '#7C3AED', now()),
  (gen_random_uuid(), 'SpeedGuesser',   3100, 14, 26, 270,  70, 'en', '#F59E0B', now()),
  (gen_random_uuid(), 'هند_بطلة',       1800,  2,  9,  90,  10, 'ar', '#22C55E', now()),
  (gen_random_uuid(), 'وليد_عرب',       1600, 11, 18, 140,  30, 'ar', '#EC4899', now()),
  (gen_random_uuid(), 'LexiconPro',     2800, 16, 24, 230,  65, 'en', '#22D3EE', now()),
  (gen_random_uuid(), 'WordWizard',     2300,  8, 15, 190,  40, 'en', '#A855F7', now());

-- 2) Daily results for today (guess_pattern is NOT NULL, so a placeholder is provided)
INSERT INTO daily_results (player_id, word_date, attempts, success, guess_pattern, duration_seconds, language)
SELECT
  id,
  CURRENT_DATE,
  FLOOR(RANDOM() * 5 + 1)::int,
  true,
  '[["correct","correct","correct","correct","correct"]]',
  FLOOR(RANDOM() * 120 + 30)::int,
  language
FROM profiles
WHERE username IS NOT NULL
  AND classic_high_score > 0
LIMIT 15;

COMMIT;

-- -----------------------------------------------------------------------------
-- Cleanup block (run to remove the fake data and restore the FK)
-- -----------------------------------------------------------------------------
-- BEGIN;
--   DELETE FROM daily_results
--   WHERE player_id IN (
--     SELECT id FROM profiles WHERE id NOT IN (SELECT id FROM auth.users)
--   );
--   DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
--   ALTER TABLE profiles
--     ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
-- COMMIT;
