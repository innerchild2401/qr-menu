// Simple script to generate SQL commands for clearing test data
// Run these commands in your Supabase SQL Editor

console.log('🧹 Database Cleanup Commands for Supabase SQL Editor\n');
console.log('Copy and paste these commands into your Supabase SQL Editor:\n');

console.log('-- Clear test data from database tables');
console.log('-- Run these commands in order due to foreign key constraints\n');

console.log('-- 1. Clear user_restaurants table first (due to foreign key constraints)');
console.log('DELETE FROM user_restaurants;\n');

console.log('-- 2. Clear restaurants table');
console.log('DELETE FROM restaurants;\n');

console.log('-- 3. Clear users table (public.users, not auth.users)');
console.log('DELETE FROM users;\n');

console.log('-- 4. Verify tables are empty');
console.log("SELECT 'users' as table_name, COUNT(*) as count FROM users");
console.log('UNION ALL');
console.log("SELECT 'restaurants' as table_name, COUNT(*) as count FROM restaurants");
console.log('UNION ALL');
console.log("SELECT 'user_restaurants' as table_name, COUNT(*) as count FROM user_restaurants;\n");

console.log('✅ After running these commands, your database will be clean for fresh testing!');
console.log('📝 Note: This only clears the public schema tables. Auth users in auth.users table remain.');
