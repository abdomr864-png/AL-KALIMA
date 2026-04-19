-- ─────────────────────────────────────────────────────────────────────────
-- CHALLENGE MATCH FLOW v2 — eFootball/PES-style two-phase handshake
-- Run this once in the Supabase SQL editor. Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

-- ── MATCHES TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid REFERENCES friend_challenges(id) ON DELETE SET NULL,
  mode text NOT NULL,
  language text DEFAULT 'ar',
  player1_id uuid REFERENCES profiles(id) NOT NULL,
  player2_id uuid REFERENCES profiles(id) NOT NULL,
  player1_ready boolean DEFAULT false,
  player2_ready boolean DEFAULT false,
  player1_score jsonb,
  player2_score jsonb,
  wager_amount int DEFAULT 0,
  wager_currency text DEFAULT 'coins',
  status text DEFAULT 'lobby',
  winner_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_matches_players  ON matches(player1_id, player2_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_challenge ON matches(challenge_id);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches readable by participants" ON matches;
CREATE POLICY "matches readable by participants" ON matches
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "matches updatable by participants" ON matches;
CREATE POLICY "matches updatable by participants" ON matches
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- ── Extend friend_challenges ────────────────────────────────────────────
ALTER TABLE friend_challenges ADD COLUMN IF NOT EXISTS match_id       uuid REFERENCES matches(id);
ALTER TABLE friend_challenges ADD COLUMN IF NOT EXISTS wager_currency text DEFAULT 'coins';
ALTER TABLE friend_challenges ADD COLUMN IF NOT EXISTS responded_at   timestamptz;

-- ── Realtime publication (adds tables only if missing) ──────────────────
DO $pub$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE matches';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'friend_challenges'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE friend_challenges';
  END IF;
END
$pub$;

-- ─────────────────────────────────────────────────────────────────────────
-- NOTE ON STYLE: these functions use scalar locals only (no %ROWTYPE /
-- RECORD) because Supabase's planner was parsing field access like
-- `v_chal.wager_amount` as `schema.table`, throwing 42P01. Scalar SELECT
-- ... INTO sidesteps it entirely.
-- ─────────────────────────────────────────────────────────────────────────

-- ── ATOMIC ACCEPT ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_challenge_atomic(p_challenge_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_status        text;
  v_challenger    uuid;
  v_challenged    uuid;
  v_mode          text;
  v_lang          text;
  v_wager         int;
  v_currency      text;
  v_expires       timestamptz;
  v_me            uuid := auth.uid();
  v_gems          int;
  v_match_id      uuid;
BEGIN
  SELECT status, challenger_id, challenged_id, mode, language,
         COALESCE(wager_amount, 0), COALESCE(wager_currency, 'coins'), expires_at
    INTO v_status, v_challenger, v_challenged, v_mode, v_lang,
         v_wager,  v_currency,  v_expires
    FROM friend_challenges
   WHERE id = p_challenge_id
   FOR UPDATE;

  IF NOT FOUND                            THEN RAISE EXCEPTION 'CHALLENGE_NOT_FOUND'; END IF;
  IF v_challenged <> v_me                 THEN RAISE EXCEPTION 'NOT_RECIPIENT'; END IF;
  IF v_status <> 'pending'                THEN RAISE EXCEPTION 'CHALLENGE_NOT_PENDING'; END IF;
  IF v_expires IS NOT NULL AND v_expires < now() THEN
    UPDATE friend_challenges SET status = 'expired' WHERE id = p_challenge_id;
    RAISE EXCEPTION 'CHALLENGE_EXPIRED';
  END IF;

  IF v_wager > 0 THEN
    IF v_currency = 'gems' THEN
      SELECT gems INTO v_gems FROM profiles WHERE id = v_me FOR UPDATE;
      IF COALESCE(v_gems, 0) < v_wager THEN
        RAISE EXCEPTION 'INSUFFICIENT_GEMS';
      END IF;
      UPDATE profiles SET gems = gems - v_wager WHERE id = v_me;
    ELSE
      PERFORM hold_coins_escrow(v_me, p_challenge_id, v_wager);
    END IF;
  END IF;

  INSERT INTO matches (
    challenge_id, mode, language,
    player1_id, player2_id,
    wager_amount, wager_currency, status
  ) VALUES (
    p_challenge_id, v_mode, v_lang,
    v_challenger, v_challenged,
    v_wager, v_currency, 'lobby'
  )
  RETURNING id INTO v_match_id;

  UPDATE friend_challenges
     SET status = 'accepted',
         match_id = v_match_id,
         responded_at = now()
   WHERE id = p_challenge_id;

  RETURN v_match_id;
END
$fn$;

-- ── MARK READY ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_ready(p_match_id uuid)
RETURNS matches
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_status text;
  v_p1     uuid;
  v_p2     uuid;
  v_me     uuid := auth.uid();
  v_out    matches;
BEGIN
  SELECT status, player1_id, player2_id
    INTO v_status, v_p1, v_p2
    FROM matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;
  IF v_me <> v_p1 AND v_me <> v_p2 THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT';
  END IF;

  IF v_status = 'lobby' THEN
    IF v_me = v_p1 THEN
      UPDATE matches SET player1_ready = true WHERE id = p_match_id;
    ELSE
      UPDATE matches SET player2_ready = true WHERE id = p_match_id;
    END IF;

    UPDATE matches
       SET status = 'active', started_at = now()
     WHERE id = p_match_id
       AND player1_ready = true
       AND player2_ready = true
       AND status = 'lobby';
  END IF;

  SELECT * INTO v_out FROM matches WHERE id = p_match_id;
  RETURN v_out;
END
$fn$;

-- ── CANCEL CHALLENGE (sender-initiated) ─────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_challenge(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_status     text;
  v_challenger uuid;
  v_wager      int;
  v_currency   text;
  v_me         uuid := auth.uid();
BEGIN
  SELECT status, challenger_id, COALESCE(wager_amount, 0), COALESCE(wager_currency, 'coins')
    INTO v_status, v_challenger, v_wager, v_currency
    FROM friend_challenges
   WHERE id = p_challenge_id
   FOR UPDATE;

  IF NOT FOUND OR v_challenger <> v_me OR v_status <> 'pending' THEN
    RETURN;
  END IF;

  UPDATE friend_challenges
     SET status = 'cancelled', responded_at = now()
   WHERE id = p_challenge_id;

  IF v_wager > 0 THEN
    IF v_currency = 'gems' THEN
      UPDATE profiles SET gems = COALESCE(gems, 0) + v_wager WHERE id = v_me;
    ELSE
      PERFORM refund_escrow(p_challenge_id);
    END IF;
  END IF;
END
$fn$;

-- ── EXPIRE STALE (lazy, client-poll) ───────────────────────────────────
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_id           uuid;
  v_wager        int;
  v_currency     text;
  v_challenger   uuid;
  v_count        int := 0;
BEGIN
  FOR v_id, v_wager, v_currency, v_challenger IN
    SELECT id, COALESCE(wager_amount, 0), COALESCE(wager_currency, 'coins'), challenger_id
      FROM friend_challenges
     WHERE status = 'pending' AND expires_at < now()
     FOR UPDATE
  LOOP
    UPDATE friend_challenges SET status = 'expired' WHERE id = v_id;
    IF v_wager > 0 THEN
      IF v_currency = 'gems' THEN
        UPDATE profiles SET gems = COALESCE(gems, 0) + v_wager WHERE id = v_challenger;
      ELSE
        PERFORM refund_escrow(v_id);
      END IF;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END
$fn$;

-- ── SUBMIT SCORE (idempotent, auto-resolves when both reported) ────────
CREATE OR REPLACE FUNCTION submit_match_score(p_match_id uuid, p_score int)
RETURNS matches
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_status      text;
  v_p1          uuid;
  v_p2          uuid;
  v_p1_score    jsonb;
  v_p2_score    jsonb;
  v_wager       int;
  v_currency    text;
  v_challenge   uuid;
  v_me          uuid := auth.uid();
  v_opp         int;
  v_winner      uuid;
  v_tied        boolean := false;
  v_out         matches;
BEGIN
  SELECT status, player1_id, player2_id,
         player1_score, player2_score,
         COALESCE(wager_amount, 0), COALESCE(wager_currency, 'coins'),
         challenge_id
    INTO v_status, v_p1, v_p2,
         v_p1_score, v_p2_score,
         v_wager, v_currency,
         v_challenge
    FROM matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;
  IF v_me <> v_p1 AND v_me <> v_p2 THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT';
  END IF;
  IF v_status = 'completed' OR v_status = 'cancelled' THEN
    SELECT * INTO v_out FROM matches WHERE id = p_match_id;
    RETURN v_out;
  END IF;

  IF v_me = v_p1 THEN
    UPDATE matches SET player1_score = jsonb_build_object('score', p_score, 'at', now())
     WHERE id = p_match_id;
    v_opp := (v_p2_score->>'score')::int;
  ELSE
    UPDATE matches SET player2_score = jsonb_build_object('score', p_score, 'at', now())
     WHERE id = p_match_id;
    v_opp := (v_p1_score->>'score')::int;
  END IF;

  IF v_opp IS NULL THEN
    SELECT * INTO v_out FROM matches WHERE id = p_match_id;
    RETURN v_out;
  END IF;

  IF v_me = v_p1 THEN
    IF p_score > v_opp THEN v_winner := v_p1;
    ELSIF p_score < v_opp THEN v_winner := v_p2;
    ELSE v_tied := true; END IF;
  ELSE
    IF p_score > v_opp THEN v_winner := v_p2;
    ELSIF p_score < v_opp THEN v_winner := v_p1;
    ELSE v_tied := true; END IF;
  END IF;

  IF v_wager > 0 THEN
    IF v_tied THEN
      IF v_currency = 'gems' THEN
        UPDATE profiles SET gems = COALESCE(gems, 0) + v_wager WHERE id = v_p1;
        UPDATE profiles SET gems = COALESCE(gems, 0) + v_wager WHERE id = v_p2;
      ELSIF v_challenge IS NOT NULL THEN
        PERFORM refund_escrow(v_challenge);
      END IF;
    ELSE
      IF v_currency = 'gems' THEN
        UPDATE profiles SET gems = COALESCE(gems, 0) + (v_wager * 2) WHERE id = v_winner;
      ELSIF v_challenge IS NOT NULL THEN
        PERFORM release_escrow_to_winner(v_challenge, v_winner);
      END IF;
    END IF;
  END IF;

  UPDATE matches
     SET status = 'completed',
         winner_id = CASE WHEN v_tied THEN NULL ELSE v_winner END,
         ended_at = now()
   WHERE id = p_match_id;

  IF v_challenge IS NOT NULL THEN
    UPDATE friend_challenges
       SET status = 'finished',
           winner_id = CASE WHEN v_tied THEN NULL ELSE v_winner END
     WHERE id = v_challenge;
  END IF;

  SELECT * INTO v_out FROM matches WHERE id = p_match_id;
  RETURN v_out;
END
$fn$;
