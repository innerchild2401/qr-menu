/**
 * Check User Count Script
 * Simple script to get the current number of users in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserCount() {
  try {
    console.log('🔍 Checking user count in database...\n');

    // Check public.users table
    console.log('1️⃣ Checking public.users table:');
    const { data: publicUsers, error: publicUsersError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at', { count: 'exact', head: true });

    if (publicUsersError) {
      console.error('❌ Error querying public.users:', publicUsersError);
    } else {
      console.log(`   📊 Total users in public.users: ${publicUsers || 0}`);
    }

    // Check auth.users table (Supabase Auth)
    console.log('\n2️⃣ Checking auth.users table:');
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('❌ Error querying auth.users:', authUsersError);
    } else {
      console.log(`   📊 Total users in auth.users: ${authUsers?.users?.length || 0}`);
      if (authUsers?.users?.length > 0) {
        console.log('   👥 User details:');
        authUsers.users.forEach((user, index) => {
          console.log(`      ${index + 1}. ${user.email} (ID: ${user.id})`);
          console.log(`         Created: ${user.created_at}`);
          console.log(`         Last Sign In: ${user.last_sign_in_at || 'Never'}`);
        });
      }
    }

    // Check user_restaurants table
    console.log('\n3️⃣ Checking user_restaurants table:');
    const { data: userRestaurants, error: userRestaurantsError } = await supabase
      .from('user_restaurants')
      .select('user_id, restaurant_id, role, created_at', { count: 'exact', head: true });

    if (userRestaurantsError) {
      console.error('❌ Error querying user_restaurants:', userRestaurantsError);
    } else {
      console.log(`   📊 Total user-restaurant relationships: ${userRestaurants || 0}`);
    }

    // Check restaurants table
    console.log('\n4️⃣ Checking restaurants table:');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, slug, owner_id, created_at', { count: 'exact', head: true });

    if (restaurantsError) {
      console.error('❌ Error querying restaurants:', restaurantsError);
    } else {
      console.log(`   📊 Total restaurants: ${restaurants || 0}`);
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   👥 Public Users: ${publicUsers || 0}`);
    console.log(`   🔐 Auth Users: ${authUsers?.users?.length || 0}`);
    console.log(`   🏪 Restaurants: ${restaurants || 0}`);
    console.log(`   🔗 User-Restaurant Links: ${userRestaurants || 0}`);

    // Check if there's a mismatch
    const publicCount = publicUsers || 0;
    const authCount = authUsers?.users?.length || 0;
    
    if (publicCount !== authCount) {
      console.log('\n⚠️  WARNING: Mismatch between public.users and auth.users!');
      console.log(`   This might indicate incomplete user registration or cleanup issues.`);
    } else {
      console.log('\n✅ User counts are consistent between tables.');
    }

  } catch (error) {
    console.error('❌ Error during user count check:', error);
  }
}

// Run the check
checkUserCount();
