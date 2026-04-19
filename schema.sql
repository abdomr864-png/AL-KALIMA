-- Kalimat Database Schema
-- Run this in Supabase SQL Editor

-- Players table
create table profiles (
  id uuid references auth.users primary key,
  username text unique,
  avatar_color text default '#7C3AED',
  total_games int default 0,
  total_wins int default 0,
  current_streak int default 0,
  best_streak int default 0,
  coins int default 50,
  is_plus boolean default false,
  is_online boolean default false,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Daily words table (one word per day)
create table daily_words (
  id uuid default gen_random_uuid() primary key,
  word text not null,
  word_date date unique not null,
  created_at timestamptz default now()
);

-- Daily results (one per player per day)
create table daily_results (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references profiles(id),
  word_date date not null,
  attempts int not null,
  success boolean not null,
  guess_pattern text not null, -- JSON: [["correct","absent","present",...], ...]
  duration_seconds int,
  created_at timestamptz default now(),
  unique(player_id, word_date)
);

-- Classic mode scores
create table classic_scores (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references profiles(id),
  score int not null,
  words_solved int not null,
  max_streak int not null,
  created_at timestamptz default now()
);

-- Speed duels
create table duels (
  id uuid default gen_random_uuid() primary key,
  word text not null,
  word_length int not null,
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id),
  player1_attempts int,
  player2_attempts int,
  player1_success boolean,
  player2_success boolean,
  player1_duration int,
  player2_duration int,
  winner_id uuid references profiles(id),
  status text default 'waiting', -- waiting, active, finished
  created_at timestamptz default now()
);

-- Duel moves (realtime)
create table duel_moves (
  id uuid default gen_random_uuid() primary key,
  duel_id uuid references duels(id),
  player_id uuid references profiles(id),
  attempt_number int not null,
  guess text not null,
  result text not null, -- JSON array: ["correct","absent","present",...]
  created_at timestamptz default now()
);

-- Friends
create table friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references profiles(id),
  addressee_id uuid references profiles(id),
  status text default 'pending', -- pending, accepted
  created_at timestamptz default now(),
  unique(requester_id, addressee_id)
);

-- Leaderboard view
create view leaderboard_daily as
select
  p.id,
  p.username,
  p.avatar_color,
  p.current_streak,
  dr.attempts,
  dr.duration_seconds,
  dr.word_date,
  rank() over (
    partition by dr.word_date
    order by dr.attempts asc, dr.duration_seconds asc
  ) as daily_rank
from daily_results dr
join profiles p on p.id = dr.player_id
where dr.success = true;

-- RLS Policies
alter table profiles enable row level security;
alter table daily_results enable row level security;
alter table classic_scores enable row level security;
alter table duels enable row level security;
alter table duel_moves enable row level security;
alter table friendships enable row level security;

create policy "profiles readable by all" on profiles for select using (true);
create policy "profiles editable by owner" on profiles for update using (auth.uid() = id);
create policy "profiles insertable by owner" on profiles for insert with check (auth.uid() = id);
create policy "daily results readable by all" on daily_results for select using (true);
create policy "daily results insertable by owner" on daily_results for insert with check (auth.uid() = player_id);
create policy "classic scores readable by all" on classic_scores for select using (true);
create policy "classic scores insertable by owner" on classic_scores for insert with check (auth.uid() = player_id);
create policy "duels readable by participants" on duels for select using (auth.uid() = player1_id or auth.uid() = player2_id or status = 'waiting');
create policy "duels insertable by auth" on duels for insert with check (auth.uid() = player1_id);
create policy "duels updatable by participants" on duels for update using (auth.uid() = player1_id or auth.uid() = player2_id);
create policy "duel moves readable by participants" on duel_moves for select using (
  exists (select 1 from duels where id = duel_id and (player1_id = auth.uid() or player2_id = auth.uid()))
);
create policy "duel moves insertable by owner" on duel_moves for insert with check (auth.uid() = player_id);
create policy "friendships readable by participants" on friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships insertable by auth" on friendships for insert with check (auth.uid() = requester_id);
create policy "friendships updatable by addressee" on friendships for update using (auth.uid() = addressee_id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'لاعب_' || substr(new.id::text, 1, 6));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Realtime on duels and duel_moves (also do this in Supabase Dashboard)
-- alter publication supabase_realtime add table duels;
-- alter publication supabase_realtime add table duel_moves;

-- ─── NEW GAME MODES ───

-- Word Rush (hourly mode) results
CREATE TABLE IF NOT EXISTS rush_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id),
  hour_key text NOT NULL,
  attempts int NOT NULL,
  success boolean NOT NULL,
  duration_seconds int,
  rank int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, hour_key)
);

-- Category Blitz scores
CREATE TABLE IF NOT EXISTS blitz_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id),
  category text NOT NULL,
  words_solved int NOT NULL,
  score int NOT NULL,
  duration_seconds int NOT NULL DEFAULT 90,
  created_at timestamptz DEFAULT now()
);

-- Who Am I scores
CREATE TABLE IF NOT EXISTS whoami_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id),
  word text NOT NULL,
  clues_used int NOT NULL,
  points int NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Word Chain results
CREATE TABLE IF NOT EXISTS chain_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id),
  chain_length int NOT NULL,
  player_words int NOT NULL,
  won boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number int NOT NULL,
  status text DEFAULT 'registration',
  registration_ends timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid REFERENCES tournaments(id),
  player_id uuid REFERENCES profiles(id),
  seed int,
  current_round int DEFAULT 1,
  eliminated boolean DEFAULT false,
  UNIQUE(tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid REFERENCES tournaments(id),
  round int NOT NULL,
  player1_id uuid REFERENCES profiles(id),
  player2_id uuid REFERENCES profiles(id),
  winner_id uuid REFERENCES profiles(id),
  duel_id uuid,
  status text DEFAULT 'pending'
);

-- Blind Word results
CREATE TABLE IF NOT EXISTS blind_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id),
  word text NOT NULL,
  attempts int NOT NULL,
  success boolean NOT NULL,
  points int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS for new tables
ALTER TABLE rush_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE blitz_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE whoami_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE blind_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rush readable by all" ON rush_results FOR SELECT USING (true);
CREATE POLICY "rush insertable by owner" ON rush_results FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "blitz readable by all" ON blitz_scores FOR SELECT USING (true);
CREATE POLICY "blitz insertable by owner" ON blitz_scores FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "whoami readable by all" ON whoami_scores FOR SELECT USING (true);
CREATE POLICY "whoami insertable by owner" ON whoami_scores FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "chain readable by all" ON chain_results FOR SELECT USING (true);
CREATE POLICY "chain insertable by owner" ON chain_results FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "tournaments readable by all" ON tournaments FOR SELECT USING (true);
CREATE POLICY "tournament entries readable by all" ON tournament_entries FOR SELECT USING (true);
CREATE POLICY "tournament entries insertable by owner" ON tournament_entries FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "tournament matches readable by all" ON tournament_matches FOR SELECT USING (true);
CREATE POLICY "blind readable by all" ON blind_results FOR SELECT USING (true);
CREATE POLICY "blind insertable by owner" ON blind_results FOR INSERT WITH CHECK (auth.uid() = player_id);

-- ─── ECONOMY V2: Gems & Premium Cosmetics ───

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gems int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_icon text DEFAULT 'default_purple';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_border text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_win_animation text DEFAULT 'default';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owned_icons text[] DEFAULT ARRAY['default_purple','default_blue'];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owned_borders text[] DEFAULT ARRAY['none'];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owned_win_animations text[] DEFAULT ARRAY['default'];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_profile_bg text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owned_profile_bgs text[] DEFAULT ARRAY['none'];

-- ─── GACHA SYSTEM: Tickets & Spins ───

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bronze_tickets int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS silver_tickets int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS golden_tickets int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ads_watched_today int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ads_reset_date date DEFAULT CURRENT_DATE;

-- Spin history
CREATE TABLE IF NOT EXISTS spin_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id),
  spin_tier text NOT NULL,
  prize_id text NOT NULL,
  prize_name text NOT NULL,
  prize_rarity text NOT NULL,
  reward_type text NOT NULL,
  reward_amount int,
  reward_item_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spin history readable by owner" ON spin_history
  FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "spin history insertable by owner" ON spin_history
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- ─── FRIENDS SYSTEM: Presence & Delete Policy ───

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- Allow participants to delete friendships (unfriend / reject)
CREATE POLICY "friendships deletable by participants" ON friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ─── USERNAME SYSTEM ───

-- Enforce unique usernames (already unique in CREATE TABLE, this is for ALTER)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_changed_count int DEFAULT 0;

-- Safe username setter (checks uniqueness, returns JSON result)
CREATE OR REPLACE FUNCTION set_username(p_user_id uuid, p_username text)
RETURNS json AS $$
DECLARE
  existing_count int;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM profiles WHERE username = p_username AND id != p_user_id;
  IF existing_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'username_taken');
  END IF;
  UPDATE profiles SET username = p_username WHERE id = p_user_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime on friendships
-- ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- ─── BILINGUAL SYSTEM ───

-- Add language column to all relevant tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar' CHECK (language IN ('ar', 'en'));
ALTER TABLE daily_words ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';
ALTER TABLE daily_results ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';
ALTER TABLE duels ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';
ALTER TABLE rush_results ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';
ALTER TABLE classic_scores ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';

-- Update daily_words unique constraint to include language
-- (so we can have one Arabic and one English word per day)
ALTER TABLE daily_words DROP CONSTRAINT IF EXISTS daily_words_word_date_key;
ALTER TABLE daily_words ADD CONSTRAINT daily_words_word_date_language_key UNIQUE (word_date, language);

-- Indexes for language-filtered queries
CREATE INDEX IF NOT EXISTS idx_profiles_language ON profiles(language);
CREATE INDEX IF NOT EXISTS idx_daily_results_language ON daily_results(language, word_date, success);
CREATE INDEX IF NOT EXISTS idx_duels_language ON duels(language, status);

-- ─── RETENTION SYSTEM: Push tokens, streak fields ───

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_played_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_freezes int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false;

-- ─── ELITE VIP TIER ───

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_elite boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS elite_since timestamptz;

-- ─── ANTI-CHEAT SYSTEM ───

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flagged_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE daily_results ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE daily_results ADD COLUMN IF NOT EXISTS flag_reason text;

-- Clean leaderboard view (excludes flagged results)
CREATE OR REPLACE VIEW leaderboard_clean AS
SELECT * FROM daily_results
WHERE is_flagged = false OR is_flagged IS NULL;

-- ─── REFERRAL SYSTEM ───

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_count int DEFAULT 0;

CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES profiles(id),
  referred_id uuid REFERENCES profiles(id),
  device_id text,
  code text,
  status text DEFAULT 'pending', -- pending, confirmed
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals readable by participants" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "referrals insertable by auth" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_id);
CREATE POLICY "referrals updatable by referred" ON referrals
  FOR UPDATE USING (auth.uid() = referred_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- RPC: add gems to a user
CREATE OR REPLACE FUNCTION add_gems(p_user_id uuid, p_amount int)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET gems = COALESCE(gems, 0) + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: add golden tickets to a user
CREATE OR REPLACE FUNCTION add_golden_tickets(p_user_id uuid, p_amount int)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET golden_tickets = COALESCE(golden_tickets, 0) + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── FRIEND CHALLENGE WITH WAGER ───

CREATE TABLE IF NOT EXISTS friend_challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id uuid REFERENCES profiles(id),
  challenged_id uuid REFERENCES profiles(id),
  mode text NOT NULL,
  wager_amount int DEFAULT 0,
  room_code text,
  status text DEFAULT 'pending', -- pending, accepted, active, finished, declined, expired
  language text DEFAULT 'ar',
  winner_id uuid REFERENCES profiles(id),
  challenger_score jsonb,
  challenged_score jsonb,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE friend_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges readable by participants" ON friend_challenges
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);
CREATE POLICY "challenges insertable by challenger" ON friend_challenges
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "challenges updatable by participants" ON friend_challenges
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE INDEX IF NOT EXISTS idx_challenges_status ON friend_challenges(challenged_id, status);

-- Coin escrow table
CREATE TABLE IF NOT EXISTS coin_escrow (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  challenge_id uuid REFERENCES friend_challenges(id),
  amount int NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coin_escrow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escrow readable by owner" ON coin_escrow
  FOR SELECT USING (auth.uid() = user_id);

-- Hold coins in escrow
CREATE OR REPLACE FUNCTION hold_coins_escrow(p_user_id uuid, p_challenge_id uuid, p_amount int)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET coins = coins - p_amount WHERE id = p_user_id AND coins >= p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_coins'; END IF;
  INSERT INTO coin_escrow (user_id, challenge_id, amount) VALUES (p_user_id, p_challenge_id, p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release escrow to winner
CREATE OR REPLACE FUNCTION release_escrow_to_winner(p_challenge_id uuid, p_winner_id uuid)
RETURNS void AS $$
DECLARE total_amount int;
BEGIN
  SELECT SUM(amount) INTO total_amount FROM coin_escrow WHERE challenge_id = p_challenge_id;
  IF total_amount IS NOT NULL AND total_amount > 0 THEN
    UPDATE profiles SET coins = coins + total_amount WHERE id = p_winner_id;
    DELETE FROM coin_escrow WHERE challenge_id = p_challenge_id;
    UPDATE friend_challenges SET winner_id = p_winner_id, status = 'finished' WHERE id = p_challenge_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refund escrow (both decline / expire)
CREATE OR REPLACE FUNCTION refund_escrow(p_challenge_id uuid)
RETURNS void AS $$
DECLARE row RECORD;
BEGIN
  FOR row IN SELECT user_id, amount FROM coin_escrow WHERE challenge_id = p_challenge_id LOOP
    UPDATE profiles SET coins = coins + row.amount WHERE id = row.user_id;
  END LOOP;
  DELETE FROM coin_escrow WHERE challenge_id = p_challenge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── EVENTS TABLE (used by admin dashboard) ───

CREATE TABLE IF NOT EXISTS events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text DEFAULT '🎉',
  start_date date NOT NULL,
  end_date date NOT NULL,
  server text DEFAULT 'both',
  type text DEFAULT 'theme',
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events readable by all" ON events FOR SELECT USING (true);

-- ─── CLASSIC SCORE SYSTEM ───

-- Add classic high score column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS classic_high_score int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS classic_high_score_updated_at timestamptz;

-- Index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_classic_score ON profiles(classic_high_score DESC)
WHERE classic_high_score > 0;

-- Classic score history (for tracking session history)
CREATE TABLE IF NOT EXISTS classic_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  score int NOT NULL,
  words_solved int DEFAULT 0,
  letters_completed int DEFAULT 0,
  language text DEFAULT 'ar',
  played_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classic_sessions_player ON classic_sessions(player_id, played_at DESC);

ALTER TABLE classic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classic sessions readable by all" ON classic_sessions FOR SELECT USING (true);
CREATE POLICY "classic sessions insertable by owner" ON classic_sessions FOR INSERT WITH CHECK (auth.uid() = player_id);

-- ═══════════════════════════════════════
-- SECURE COIN ADDITION — replaces direct UPDATE
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION add_coins(amount int, reason text)
RETURNS json AS $$
DECLARE
  user_id uuid := auth.uid();
  current_coins int;
  max_per_reason int;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF reason NOT IN (
    'daily_complete', 'duel_win', 'classic_word', 'ad_reward',
    'daily_reward', 'referral_bonus', 'welcome_back', 'streak_milestone',
    'mission_complete', 'hourly_word', 'night_owl', 'clan_reward',
    'friend_challenge_win', 'tournament_reward'
  ) THEN
    RAISE EXCEPTION 'invalid_reason: %', reason;
  END IF;

  max_per_reason := CASE reason
    WHEN 'ad_reward'       THEN 15
    WHEN 'daily_complete'  THEN 20
    WHEN 'duel_win'        THEN 30
    WHEN 'classic_word'    THEN 10
    WHEN 'daily_reward'    THEN 500
    WHEN 'welcome_back'    THEN 100
    WHEN 'streak_milestone' THEN 200
    ELSE 500
  END;

  IF amount <= 0 OR amount > max_per_reason THEN
    RAISE EXCEPTION 'invalid_amount: % for reason: %', amount, reason;
  END IF;

  UPDATE profiles
  SET coins = coins + amount
  WHERE id = user_id
  RETURNING coins INTO current_coins;

  RETURN json_build_object('success', true, 'new_balance', current_coins);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════
-- SECURE GEM ADDITION
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION add_gems(amount int, reason text)
RETURNS json AS $$
DECLARE
  user_id uuid := auth.uid();
  current_gems int;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF reason NOT IN (
    'iap_purchase', 'elite_monthly', 'referral_milestone',
    'tournament_reward', 'admin_grant', 'streak_milestone'
  ) THEN
    RAISE EXCEPTION 'invalid_gem_reason: %', reason;
  END IF;

  IF reason != 'iap_purchase' AND reason != 'admin_grant' AND amount > 100 THEN
    RAISE EXCEPTION 'gem_amount_too_high: %', amount;
  END IF;

  IF amount <= 0 THEN
    RAISE EXCEPTION 'invalid_gem_amount';
  END IF;

  UPDATE profiles
  SET gems = gems + amount
  WHERE id = user_id
  RETURNING gems INTO current_gems;

  RETURN json_build_object('success', true, 'new_balance', current_gems);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════
-- SECURE SCORE SUBMISSION
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION submit_classic_word(
  p_word_id text,
  p_attempts int,
  p_duration_seconds int,
  p_words_in_session int,
  p_is_hot_streak boolean,
  p_language text
)
RETURNS json AS $$
DECLARE
  user_id uuid := auth.uid();
  word_length int;
  base_pts int;
  attempts_bonus int;
  speed_bonus int;
  difficulty_mult float;
  hot_mult float;
  total_pts int;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_attempts < 1 OR p_attempts > 6 THEN
    RAISE EXCEPTION 'invalid_attempts: %', p_attempts;
  END IF;

  IF p_duration_seconds < 5 THEN
    RAISE EXCEPTION 'impossible_duration: %', p_duration_seconds;
  END IF;

  word_length := length(p_word_id);

  base_pts := word_length * 20;
  attempts_bonus := (7 - p_attempts) * 15;
  speed_bonus := GREATEST(0, 60 - p_duration_seconds);
  difficulty_mult := 1.0 + LEAST(p_words_in_session * 0.1, 1.5);
  hot_mult := CASE WHEN p_is_hot_streak THEN 3.0 ELSE 1.0 END;

  total_pts := ROUND((base_pts + attempts_bonus + speed_bonus) * difficulty_mult * hot_mult);

  IF total_pts > 5000 THEN
    total_pts := 5000;
    UPDATE profiles SET is_flagged = true, flag_reason = 'score_anomaly' WHERE id = user_id;
  END IF;

  RETURN json_build_object('points_earned', total_pts, 'validated', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════
-- APP CONFIG TABLE (force update + maintenance)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_config_select" ON app_config FOR SELECT USING (true);

INSERT INTO app_config (key, value)
VALUES ('minimum_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_config (key, value)
VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════
-- GIFTS TABLE
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS gifts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES profiles(id),
  recipient_id uuid REFERENCES profiles(id),
  tier text NOT NULL,
  message text,
  coins int DEFAULT 0,
  bronze_tickets int DEFAULT 0,
  silver_tickets int DEFAULT 0,
  golden_tickets int DEFAULT 0,
  streak_freezes int DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifts_select" ON gifts FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
CREATE POLICY "gifts_insert" ON gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "gifts_update" ON gifts FOR UPDATE USING (auth.uid() = recipient_id);
CREATE INDEX IF NOT EXISTS idx_gifts_recipient ON gifts(recipient_id, status);

-- ═══════════════════════════════════════
-- USERNAME COLOR SYSTEM
-- ═══════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_color text DEFAULT 'default';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_color_expires_at timestamptz;
