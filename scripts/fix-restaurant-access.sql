-- =====================================================
-- IMMEDIATE RESTAURANT ACCESS FIX
-- =====================================================
-- Run this in your Supabase SQL Editor to fix "unauthorized" errors

-- =====================================================
-- 1. ENABLE RLS AND SET BASIC POLICIES
-- =====================================================

-- Enable RLS on restaurants table
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Restaurant owners can view their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can insert their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can read own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Users can update own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Users can insert own restaurant" ON restaurants;

-- =====================================================
-- 2. CREATE ESSENTIAL RLS POLICIES
-- =====================================================

-- Policy 1: Users can SELECT restaurants they own or have access to
CREATE POLICY "Users can select their restaurants" ON restaurants
  FOR SELECT
  USING (
    auth.uid() = owner_id 
    OR 
    auth.uid() IN (
      SELECT user_id 
      FROM user_restaurants 
      WHERE restaurant_id = restaurants.id 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy 2: Users can INSERT restaurants (becoming the owner)
CREATE POLICY "Users can insert restaurants" ON restaurants
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy 3: Users can UPDATE restaurants they own or have admin access to
CREATE POLICY "Users can update their restaurants" ON restaurants
  FOR UPDATE
  USING (
    auth.uid() = owner_id 
    OR 
    auth.uid() IN (
      SELECT user_id 
      FROM user_restaurants 
      WHERE restaurant_id = restaurants.id 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy 4: Users can DELETE restaurants they own
CREATE POLICY "Users can delete their restaurants" ON restaurants
  FOR DELETE
  USING (
    auth.uid() = owner_id 
    OR 
    auth.uid() IN (
      SELECT user_id 
      FROM user_restaurants 
      WHERE restaurant_id = restaurants.id 
      AND role = 'owner'
    )
  );

-- =====================================================
-- 3. LINK CURRENT USER TO EXISTING RESTAURANTS
-- =====================================================

-- Link current user to the demo restaurant (if it exists)
INSERT INTO user_restaurants (user_id, restaurant_id, role)
SELECT 
  auth.uid(),
  id,
  'owner'
FROM restaurants 
WHERE slug = 'demo' 
AND NOT EXISTS (
  SELECT 1 FROM user_restaurants 
  WHERE user_id = auth.uid() AND restaurant_id = restaurants.id
);

-- Set current user as owner of demo restaurant
UPDATE restaurants 
SET owner_id = auth.uid()
WHERE slug = 'demo' AND owner_id IS NULL;

-- =====================================================
-- 4. VERIFY THE FIX
-- =====================================================

-- Check if policies were created
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'restaurants'
ORDER BY policyname;

-- Test if current user can now access restaurants
SELECT 
  'Access Test' as test_type,
  COUNT(*) as accessible_restaurants,
  STRING_AGG(name, ', ') as restaurant_names
FROM restaurants;

-- Check user's restaurant relationships
SELECT 
  'User-Restaurant Links' as test_type,
  COUNT(*) as relationships,
  STRING_AGG(role, ', ') as roles
FROM user_restaurants 
WHERE user_id = auth.uid();

-- =====================================================
-- 5. TROUBLESHOOTING COMMANDS (Uncomment if needed)
-- =====================================================

-- If you still can't access restaurants, try this:
-- INSERT INTO user_restaurants (user_id, restaurant_id, role)
-- SELECT auth.uid(), id, 'owner'
-- FROM restaurants
-- WHERE NOT EXISTS (
--   SELECT 1 FROM user_restaurants 
--   WHERE user_id = auth.uid() AND restaurant_id = restaurants.id
-- );

-- If you need to see all restaurants temporarily (for debugging):
-- ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
-- SELECT * FROM restaurants;
-- ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. SUMMARY
-- =====================================================

SELECT 
  'Fix Summary' as summary_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'restaurants' AND rowsecurity = true
    ) THEN '✅ RLS Enabled'
    ELSE '❌ RLS Not Enabled'
  END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'restaurants') as policy_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_restaurants WHERE user_id = auth.uid()
    ) THEN '✅ User Linked to Restaurants'
    ELSE '❌ User Not Linked'
  END as user_link_status;
