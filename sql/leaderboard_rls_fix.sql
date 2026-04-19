-- Leaderboard RLS fix: allow everyone to read profiles + daily_results
-- so seeded test players (no auth.users row) appear in the leaderboard.
--
-- Run in Supabase SQL editor.

-- 1) Sanity check — are the fake players actually in the table?
SELECT id, username, classic_high_score, language
FROM profiles
WHERE username IS NOT NULL
  AND classic_high_score > 0
ORDER BY classic_high_score DESC
LIMIT 10;

-- 2) Make profiles publicly readable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

-- 3) Make daily_results publicly readable (needed for the Today tab join)
ALTER TABLE daily_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_results_select_all" ON daily_results;
CREATE POLICY "daily_results_select_all" ON daily_results
  FOR SELECT USING (true);

-- 4) Sanity check — does daily_results have rows for today?
SELECT player_id, attempts, duration_seconds, language
FROM daily_results
WHERE word_date = CURRENT_DATE
LIMIT 10;
