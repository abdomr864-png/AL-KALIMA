-- STEP 8: Add Google auth columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_google_linked boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_changed_count int DEFAULT 0;

-- Index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (LOWER(username));

-- STEP 6: Unique username enforcement (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_ci
ON profiles (LOWER(username))
WHERE username IS NOT NULL;

-- Secure username check + set function
CREATE OR REPLACE FUNCTION set_username(desired_username text)
RETURNS json AS $$
DECLARE
  user_id uuid := auth.uid();
  normalized text := LOWER(TRIM(desired_username));
  already_changed boolean;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF LENGTH(normalized) < 3 OR LENGTH(normalized) > 20 THEN
    RAISE EXCEPTION 'invalid_length';
  END IF;

  IF normalized !~ '^[a-z0-9\u0600-\u06ff_]+$' THEN
    RAISE EXCEPTION 'invalid_characters';
  END IF;

  IF normalized IN ('admin','كلمات','kalimat','support','system','moderator') THEN
    RAISE EXCEPTION 'reserved_username';
  END IF;

  SELECT username_changed_count >= 1 INTO already_changed
  FROM profiles WHERE id = user_id;

  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(username) = normalized
    AND id != user_id
  ) THEN
    RAISE EXCEPTION 'username_taken';
  END IF;

  UPDATE profiles
  SET
    username = TRIM(desired_username),
    username_changed_count = COALESCE(username_changed_count, 0) + 1
  WHERE id = user_id;

  RETURN json_build_object('success', true, 'username', TRIM(desired_username));

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'username_taken';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
