-- Enable RLS and Fix Permissions
-- Run this in your Supabase SQL Editor to fix the "User is not allowed" errors

-- 1. Enable Row Level Security on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own restaurant relationships" ON user_restaurants;
DROP POLICY IF EXISTS "Users can manage own restaurant relationships" ON user_restaurants;
DROP POLICY IF EXISTS "Restaurant owners can view their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can insert their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can view their categories" ON categories;
DROP POLICY IF EXISTS "Restaurant owners can insert their categories" ON categories;
DROP POLICY IF EXISTS "Restaurant owners can update their categories" ON categories;
DROP POLICY IF EXISTS "Restaurant owners can delete their categories" ON categories;
DROP POLICY IF EXISTS "Restaurant owners can view their products" ON products;
DROP POLICY IF EXISTS "Restaurant owners can insert their products" ON products;
DROP POLICY IF EXISTS "Restaurant owners can update their products" ON products;
DROP POLICY IF EXISTS "Restaurant owners can delete their products" ON products;

-- 3. Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Create RLS policies for user_restaurants table
CREATE POLICY "Users can view own restaurant relationships" ON user_restaurants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own restaurant relationships" ON user_restaurants
  FOR ALL USING (auth.uid() = user_id);

-- 5. Create RLS policies for restaurants table
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

-- 6. Create RLS policies for categories table
CREATE POLICY "Restaurant owners can view their categories" ON categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = categories.restaurant_id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can insert their categories" ON categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = categories.restaurant_id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can update their categories" ON categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = categories.restaurant_id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can delete their categories" ON categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = categories.restaurant_id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

-- 7. Create RLS policies for products table
CREATE POLICY "Restaurant owners can view their products" ON products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = products.restaurant_id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can insert their products" ON products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = products.restaurant_id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can update their products" ON products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = products.restaurant_id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can delete their products" ON products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = products.restaurant_id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON user_restaurants TO authenticated;
GRANT ALL ON restaurants TO authenticated;
GRANT ALL ON categories TO authenticated;
GRANT ALL ON products TO authenticated;

-- 9. Create function to link existing user to restaurant (for eu@eu.com)
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

-- 10. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION link_user_to_existing_restaurant(TEXT, TEXT) TO authenticated;

-- 11. Create function to get user's restaurants with better error handling
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

-- 12. Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_restaurants_enhanced(UUID) TO authenticated;

-- 13. Verify the setup
SELECT 'RLS enabled and policies created successfully' as status;
