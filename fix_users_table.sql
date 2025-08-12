-- Fix the users table to work with Supabase Auth
-- Option 1: Make password_hash nullable since we don't store passwords anymore

-- Make password_hash optional
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Also make other unnecessary columns optional
ALTER TABLE users ALTER COLUMN password_reset_token DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email_verification_token DROP NOT NULL;

-- Add default values
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE users ALTER COLUMN login_count SET DEFAULT 0;

-- Make sure created_at has a default
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
