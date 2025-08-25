-- =====================================================
-- RESTAURANT RLS POLICIES DIAGNOSTIC AND FIX SCRIPT
-- =====================================================
-- Run this in your Supabase SQL Editor to diagnose and fix restaurant access issues

-- =====================================================
-- 1. DIAGNOSTIC QUERIES - Check Current State
-- =====================================================

-- Check if RLS is enabled on restaurants table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'restaurants';

-- List all existing RLS policies for restaurants table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'restaurants'
ORDER BY policyname;

-- Check current user permissions and roles
SELECT 
  current_user as current_user,
  session_user as session_user,
  auth.uid() as auth_uid,
  auth.role() as auth_role;

-- Check if current user exists in users table
SELECT 
  id,
  email,
  full_name,
  created_at
FROM users 
WHERE id = auth.uid();

-- Check user's restaurant relationships
SELECT 
  ur.user_id,
  ur.restaurant_id,
  ur.role,
  r.name as restaurant_name,
  r.slug as restaurant_slug,
  r.owner_id
FROM user_restaurants ur
JOIN restaurants r ON ur.restaurant_id = r.id
WHERE ur.user_id = auth.uid();

-- Check restaurants that current user should have access to
SELECT 
  r.id,
  r.name,
  r.slug,
  r.owner_id,
  CASE 
    WHEN r.owner_id = auth.uid() THEN 'Owner (direct)'
    WHEN ur.role IS NOT NULL THEN 'Owner (via user_restaurants)'
    ELSE 'No access'
  END as access_type,
  ur.role as user_role
FROM restaurants r
LEFT JOIN user_restaurants ur ON ur.restaurant_id = r.id AND ur.user_id = auth.uid()
ORDER BY r.name;

-- =====================================================
-- 2. FIX RLS POLICIES - Drop and Recreate
-- =====================================================

-- Enable RLS on restaurants table (if not already enabled)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Restaurant owners can view their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can insert their restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can read own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Users can update own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Users can insert own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can delete their restaurants" ON restaurants;

-- =====================================================
-- 3. CREATE PROPER RLS POLICIES
-- =====================================================

-- Policy 1: Users can SELECT restaurants they own (via owner_id or user_restaurants)
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

-- Policy 2: Users can INSERT restaurants (setting themselves as owner)
CREATE POLICY "Users can insert restaurants" ON restaurants
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy 3: Users can UPDATE restaurants they own
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
-- 4. VERIFICATION QUERIES - Test the Policies
-- =====================================================

-- Verify all policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'restaurants'
ORDER BY policyname;

-- Test SELECT access - should show only restaurants user has access to
SELECT 
  'SELECT Test' as test_type,
  COUNT(*) as accessible_restaurants,
  STRING_AGG(name, ', ') as restaurant_names
FROM restaurants;

-- Test if user can see their restaurant relationships
SELECT 
  'User-Restaurant Test' as test_type,
  COUNT(*) as user_restaurant_relationships,
  STRING_AGG(role, ', ') as roles
FROM user_restaurants 
WHERE user_id = auth.uid();

-- =====================================================
-- 5. HELPER FUNCTIONS FOR ADMIN ACCESS
-- =====================================================

-- Function to check if user is admin (has any restaurant with owner/admin role)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_restaurants 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's restaurants
CREATE OR REPLACE FUNCTION get_user_restaurants()
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  user_role TEXT,
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.slug,
    ur.role,
    (r.owner_id = auth.uid()) as is_owner
  FROM restaurants r
  LEFT JOIN user_restaurants ur ON ur.restaurant_id = r.id AND ur.user_id = auth.uid()
  WHERE r.owner_id = auth.uid() OR ur.role IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FINAL DIAGNOSTIC SUMMARY
-- =====================================================

-- Summary of current state
SELECT 
  'RLS Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'restaurants' AND rowsecurity = true
    ) THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status;

SELECT 
  'Policy Count' as check_type,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'restaurants';

SELECT 
  'User Access' as check_type,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ Authenticated'
    ELSE '❌ Not Authenticated'
  END as auth_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) THEN '✅ User Exists'
    ELSE '❌ User Not Found'
  END as user_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_restaurants WHERE user_id = auth.uid()
    ) THEN '✅ Has Restaurant Access'
    ELSE '❌ No Restaurant Access'
  END as restaurant_access;

-- =====================================================
-- 7. TROUBLESHOOTING COMMANDS
-- =====================================================

-- If you need to grant admin access to a user for testing:
-- INSERT INTO user_restaurants (user_id, restaurant_id, role)
-- VALUES (auth.uid(), 'restaurant-id-here', 'admin')
-- ON CONFLICT (user_id, restaurant_id) 
-- DO UPDATE SET role = 'admin';

-- If you need to link a user to an existing restaurant:
-- UPDATE restaurants 
-- SET owner_id = auth.uid() 
-- WHERE id = 'restaurant-id-here';

-- If you need to see all restaurants (for debugging, remove RLS temporarily):
-- ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
-- SELECT * FROM restaurants;
-- ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
