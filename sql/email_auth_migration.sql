-- Email/password auth support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_email_linked boolean DEFAULT false;
