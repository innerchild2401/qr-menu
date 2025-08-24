-- Fixed Authentication Schema Setup for SmartMenu
-- Run this in your Supabase SQL Editor to fix the foreign key constraint issues

-- 1. First, let's check and fix the users table structure
-- Drop the existing users table if it exists to recreate it properly
DROP TABLE IF EXISTS user_restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with proper structure
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_restaurants linking table
CREATE TABLE user_restaurants (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

-- 3. Add owner_id column to restaurants table (if not exists)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);

-- 5. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Create RLS policies for user_restaurants table
DROP POLICY IF EXISTS "Users can view own restaurant relationships" ON user_restaurants;
DROP POLICY IF EXISTS "Users can manage own restaurant relationships" ON user_restaurants;

CREATE POLICY "Users can view own restaurant relationships" ON user_restaurants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own restaurant relationships" ON user_restaurants
  FOR ALL USING (auth.uid() = user_id);

-- 8. Create RLS policies for restaurants table
DROP POLICY IF EXISTS "Users can read own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Users can update own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Users can insert own restaurant" ON restaurants;

CREATE POLICY "Users can read own restaurant" ON restaurants
  FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() IN (
    SELECT user_id FROM user_restaurants WHERE restaurant_id = id
  ));

CREATE POLICY "Users can update own restaurant" ON restaurants
  FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() IN (
    SELECT user_id FROM user_restaurants WHERE restaurant_id = id
  ));

CREATE POLICY "Users can insert own restaurant" ON restaurants
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 9. Create a more robust function to handle new user signup
-- This function will handle the case where the user might already exist
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists to avoid conflicts
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    INSERT INTO users (id, email, full_name)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Failed to create user record: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 11. Create function to get user's restaurants
CREATE OR REPLACE FUNCTION get_user_restaurants(user_uuid UUID)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.slug,
    ur.role
  FROM user_restaurants ur
  JOIN restaurants r ON ur.restaurant_id = r.id
  WHERE ur.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to automatically link restaurant to user during creation
CREATE OR REPLACE FUNCTION link_restaurant_to_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- If owner_id is set, create the user_restaurants relationship
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO user_restaurants (user_id, restaurant_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT (user_id, restaurant_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the restaurant creation
    RAISE WARNING 'Failed to create user-restaurant relationship: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger to automatically link restaurant to owner
DROP TRIGGER IF EXISTS on_restaurant_created ON restaurants;
CREATE OR REPLACE TRIGGER on_restaurant_created
  AFTER INSERT ON restaurants
  FOR EACH ROW EXECUTE FUNCTION link_restaurant_to_owner();

-- 14. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON user_restaurants TO authenticated;
GRANT ALL ON restaurants TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_restaurants(UUID) TO authenticated;

-- 15. Enable RLS on restaurants table (if not already enabled)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- 16. Create a function to manually sync existing auth users
CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS INTEGER AS $$
DECLARE
  user_count INTEGER := 0;
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
    WHERE id NOT IN (SELECT id FROM users)
  LOOP
    BEGIN
      INSERT INTO users (id, email, full_name)
      VALUES (
        auth_user.id, 
        auth_user.email, 
        COALESCE(auth_user.raw_user_meta_data->>'full_name', '')
      );
      user_count := user_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to sync user %: %', auth_user.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Fixed authentication schema setup completed successfully!' as status;
