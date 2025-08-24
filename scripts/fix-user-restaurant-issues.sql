-- Fix User-Restaurant Linking Issues
-- Run this in your Supabase SQL Editor to resolve the restaurant loading and creation problems

-- 1. First, let's check and fix the database schema
-- Drop existing tables if they have wrong structure
DROP TABLE IF EXISTS user_restaurants CASCADE;

-- 2. Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add owner_id column to restaurants table (if not exists)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- 4. Create user_restaurants linking table
CREATE TABLE IF NOT EXISTS user_restaurants (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);

-- 6. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing RLS policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own restaurant relationships" ON user_restaurants;
DROP POLICY IF EXISTS "Users can manage own restaurant relationships" ON user_restaurants;
DROP POLICY IF EXISTS "Restaurant owners can view their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can insert their restaurants" ON restaurants;

-- 8. Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 9. Create RLS policies for user_restaurants table
CREATE POLICY "Users can view own restaurant relationships" ON user_restaurants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own restaurant relationships" ON user_restaurants
  FOR ALL USING (auth.uid() = user_id);

-- 10. Create RLS policies for restaurants table
CREATE POLICY "Restaurant owners can view their restaurants" ON restaurants
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (
      SELECT user_id FROM user_restaurants 
      WHERE restaurant_id = restaurants.id AND role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can update their restaurants" ON restaurants
  FOR UPDATE USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (
      SELECT user_id FROM user_restaurants 
      WHERE restaurant_id = restaurants.id AND role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can insert their restaurants" ON restaurants
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 11. Create function to handle new user signup
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

-- 12. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 13. Create function to automatically link restaurant to owner
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

-- 14. Create trigger to automatically link restaurant to owner
DROP TRIGGER IF EXISTS on_restaurant_created ON restaurants;
CREATE OR REPLACE TRIGGER on_restaurant_created
  AFTER INSERT ON restaurants
  FOR EACH ROW EXECUTE FUNCTION link_restaurant_to_owner();

-- 15. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON user_restaurants TO authenticated;
GRANT ALL ON restaurants TO authenticated;

-- 16. Function to link existing user to their restaurant (for eu@eu.com)
CREATE OR REPLACE FUNCTION link_user_to_existing_restaurant(user_email TEXT, restaurant_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
  restaurant_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id 
  FROM users 
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found', user_email;
    RETURN FALSE;
  END IF;
  
  -- Get restaurant ID
  SELECT id INTO restaurant_id 
  FROM restaurants 
  WHERE slug = restaurant_slug;
  
  IF restaurant_id IS NULL THEN
    RAISE NOTICE 'Restaurant with slug % not found', restaurant_slug;
    RETURN FALSE;
  END IF;
  
  -- Update restaurant owner_id
  UPDATE restaurants 
  SET owner_id = user_id 
  WHERE id = restaurant_id;
  
  -- Create user-restaurant relationship
  INSERT INTO user_restaurants (user_id, restaurant_id, role)
  VALUES (user_id, restaurant_id, 'owner')
  ON CONFLICT (user_id, restaurant_id) DO NOTHING;
  
  RAISE NOTICE 'Successfully linked user % to restaurant %', user_email, restaurant_slug;
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error linking user to restaurant: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION link_user_to_existing_restaurant(TEXT, TEXT) TO authenticated;

-- 18. Create a function to get user's restaurants with better error handling
CREATE OR REPLACE FUNCTION get_user_restaurants_enhanced(user_uuid UUID)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  role TEXT,
  owner_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.slug,
    ur.role,
    r.owner_id
  FROM user_restaurants ur
  JOIN restaurants r ON ur.restaurant_id = r.id
  WHERE ur.user_id = user_uuid;
  
  -- If no restaurants found through user_restaurants, try owner_id
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      r.id,
      r.name,
      r.slug,
      'owner'::TEXT as role,
      r.owner_id
    FROM restaurants r
    WHERE r.owner_id = user_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_restaurants_enhanced(UUID) TO authenticated;

-- 20. Verify the setup
SELECT 'Schema setup completed successfully' as status;
