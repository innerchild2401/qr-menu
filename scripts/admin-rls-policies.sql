-- Admin RLS Policies for Restaurant Owners
-- Run these commands in your Supabase SQL Editor

-- Enable RLS on tables if not already enabled
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Restaurant owners can view their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can view their categories" ON categories;
DROP POLICY IF EXISTS "Restaurant owners can insert their categories" ON categories;
DROP POLICY IF EXISTS "Restaurant owners can update their categories" ON categories;
DROP POLICY IF EXISTS "Restaurant owners can delete their categories" ON categories;
DROP POLICY IF EXISTS "Restaurant owners can view their products" ON products;
DROP POLICY IF EXISTS "Restaurant owners can insert their products" ON products;
DROP POLICY IF EXISTS "Restaurant owners can update their products" ON products;
DROP POLICY IF EXISTS "Restaurant owners can delete their products" ON products;
DROP POLICY IF EXISTS "Users can view their restaurant relationships" ON user_restaurants;

-- Restaurant policies
CREATE POLICY "Restaurant owners can view their restaurants" ON restaurants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = restaurants.id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

CREATE POLICY "Restaurant owners can update their restaurants" ON restaurants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_restaurants 
      WHERE user_restaurants.restaurant_id = restaurants.id 
      AND user_restaurants.user_id = auth.uid()
      AND user_restaurants.role = 'owner'
    )
  );

-- Category policies
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

-- Product policies
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

-- User restaurant relationship policies
CREATE POLICY "Users can view their restaurant relationships" ON user_restaurants
  FOR SELECT USING (user_restaurants.user_id = auth.uid());

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('restaurants', 'categories', 'products', 'user_restaurants')
ORDER BY tablename, policyname;
