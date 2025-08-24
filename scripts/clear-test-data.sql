-- Clear Test Data for Fresh Testing
-- This script removes all test data from the database to allow clean signup testing

-- Clear user_restaurants table first (due to foreign key constraints)
DELETE FROM user_restaurants;

-- Clear restaurants table
DELETE FROM restaurants;

-- Clear users table (public.users, not auth.users)
DELETE FROM users;

-- Reset sequences if they exist (for auto-incrementing IDs)
-- Note: This is optional and depends on your table structure
-- ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS restaurants_id_seq RESTART WITH 1;

-- Verify tables are empty
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'restaurants' as table_name, COUNT(*) as count FROM restaurants
UNION ALL
SELECT 'user_restaurants' as table_name, COUNT(*) as count FROM user_restaurants;
