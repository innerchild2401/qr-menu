const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection and Tables...\n');

  try {
    // Test 1: Check if users table exists
    console.log('1️⃣ Testing users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
    } else {
      console.log('✅ Users table accessible');
    }

    // Test 2: Check if restaurants table exists
    console.log('\n2️⃣ Testing restaurants table...');
    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (restaurantsError) {
      console.error('❌ Restaurants table error:', restaurantsError);
    } else {
      console.log('✅ Restaurants table accessible');
    }

    // Test 3: Check if user_restaurants table exists
    console.log('\n3️⃣ Testing user_restaurants table...');
    const { data: userRestaurantsData, error: userRestaurantsError } = await supabase
      .from('user_restaurants')
      .select('count')
      .limit(1);
    
    if (userRestaurantsError) {
      console.error('❌ User_restaurants table error:', userRestaurantsError);
    } else {
      console.log('✅ User_restaurants table accessible');
    }

    // Test 4: Check if owner_id column exists in restaurants
    console.log('\n4️⃣ Testing restaurants.owner_id column...');
    const { data: ownerIdData, error: ownerIdError } = await supabase
      .from('restaurants')
      .select('owner_id')
      .limit(1);
    
    if (ownerIdError) {
      console.error('❌ owner_id column error:', ownerIdError);
    } else {
      console.log('✅ owner_id column accessible');
    }

    console.log('\n📋 Database Status Summary:');
    console.log('- Users table:', usersError ? '❌ Error' : '✅ OK');
    console.log('- Restaurants table:', restaurantsError ? '❌ Error' : '✅ OK');
    console.log('- User_restaurants table:', userRestaurantsError ? '❌ Error' : '✅ OK');
    console.log('- Owner_id column:', ownerIdError ? '❌ Error' : '✅ OK');

    if (usersError || restaurantsError || userRestaurantsError || ownerIdError) {
      console.log('\n⚠️  Database issues detected!');
      console.log('You may need to run the database migration script:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Run the contents of scripts/fix-auth-schema.sql');
    } else {
      console.log('\n🎉 All database tables and columns are accessible!');
    }

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabaseConnection();
