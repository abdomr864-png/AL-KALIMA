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
-- USERNAME COLOR COLUMNS
-- ═══════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_color text DEFAULT 'default';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_color_expires_at timestamptz;

-- ═══════════════════════════════════════
-- UPDATE add_gems TO SUPPORT NEW REASONS
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
    'tournament_reward', 'admin_grant', 'streak_milestone',
    'gift_sent', 'booster_purchase', 'username_change', 'color_renewal', 'color_purchase'
  ) THEN
    RAISE EXCEPTION 'invalid_gem_reason: %', reason;
  END IF;

  -- Allow negative amounts for spending
  IF amount > 0 AND reason != 'iap_purchase' AND reason != 'admin_grant' AND amount > 100 THEN
    RAISE EXCEPTION 'gem_amount_too_high: %', amount;
  END IF;

  UPDATE profiles
  SET gems = GREATEST(0, gems + amount)
  WHERE id = user_id
  RETURNING gems INTO current_gems;

  RETURN json_build_object('success', true, 'new_balance', current_gems);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
