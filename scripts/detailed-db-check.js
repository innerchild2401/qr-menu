/**
 * Detailed Database Check Script
 * Comprehensive check of all tables to see what data actually exists
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function detailedDbCheck() {
  try {
    console.log('🔍 Detailed Database Check...\n');

    // Check restaurants table with full data
    console.log('1️⃣ RESTAURANTS TABLE:');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (restaurantsError) {
      console.error('❌ Error querying restaurants:', restaurantsError);
    } else {
      console.log(`   📊 Total restaurants: ${restaurants?.length || 0}`);
      if (restaurants && restaurants.length > 0) {
        restaurants.forEach((restaurant, index) => {
          console.log(`   ${index + 1}. ${restaurant.name} (${restaurant.slug})`);
          console.log(`      ID: ${restaurant.id}`);
          console.log(`      Owner ID: ${restaurant.owner_id}`);
          console.log(`      Address: ${restaurant.address || 'N/A'}`);
          console.log(`      Created: ${restaurant.created_at}`);
          console.log(`      Logo: ${restaurant.logo_url ? 'Yes' : 'No'}`);
          console.log(`      Cover: ${restaurant.cover_url ? 'Yes' : 'No'}`);
          console.log('');
        });
      }
    }

    // Check users table with full data
    console.log('2️⃣ USERS TABLE:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error querying users:', usersError);
    } else {
      console.log(`   📊 Total users: ${users?.length || 0}`);
      if (users && users.length > 0) {
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.full_name || 'No name'})`);
          console.log(`      ID: ${user.id}`);
          console.log(`      Created: ${user.created_at}`);
          console.log('');
        });
      }
    }

    // Check user_restaurants table
    console.log('3️⃣ USER_RESTAURANTS TABLE:');
    const { data: userRestaurants, error: userRestaurantsError } = await supabase
      .from('user_restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (userRestaurantsError) {
      console.error('❌ Error querying user_restaurants:', userRestaurantsError);
    } else {
      console.log(`   📊 Total user-restaurant relationships: ${userRestaurants?.length || 0}`);
      if (userRestaurants && userRestaurants.length > 0) {
        userRestaurants.forEach((ur, index) => {
          console.log(`   ${index + 1}. User ${ur.user_id} -> Restaurant ${ur.restaurant_id} (${ur.role})`);
          console.log(`      Created: ${ur.created_at}`);
          console.log('');
        });
      }
    }

    // Check categories table
    console.log('4️⃣ CATEGORIES TABLE:');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (categoriesError) {
      console.error('❌ Error querying categories:', categoriesError);
    } else {
      console.log(`   📊 Total categories: ${categories?.length || 0}`);
      if (categories && categories.length > 0) {
        categories.forEach((category, index) => {
          console.log(`   ${index + 1}. ${category.name} (Restaurant: ${category.restaurant_id})`);
          console.log(`      ID: ${category.id}`);
          console.log(`      Created: ${category.created_at}`);
          console.log('');
        });
      }
    }

    // Check products table
    console.log('5️⃣ PRODUCTS TABLE:');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('❌ Error querying products:', productsError);
    } else {
      console.log(`   📊 Total products: ${products?.length || 0}`);
      if (products && products.length > 0) {
        products.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} ($${product.price})`);
          console.log(`      ID: ${product.id}`);
          console.log(`      Restaurant: ${product.restaurant_id}`);
          console.log(`      Category: ${product.category_id}`);
          console.log(`      Has Description: ${!!product.description}`);
          console.log(`      Has AI Description: ${!!product.generated_description}`);
          console.log(`      Created: ${product.created_at}`);
          console.log('');
        });
      }
    }

    // Check auth users
    console.log('6️⃣ AUTH USERS:');
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('❌ Error querying auth users:', authUsersError);
    } else {
      console.log(`   📊 Total auth users: ${authUsers?.users?.length || 0}`);
      if (authUsers?.users && authUsers.users.length > 0) {
        authUsers.users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email}`);
          console.log(`      ID: ${user.id}`);
          console.log(`      Created: ${user.created_at}`);
          console.log(`      Last Sign In: ${user.last_sign_in_at || 'Never'}`);
          console.log('');
        });
      }
    }

    // Summary
    console.log('📊 FINAL SUMMARY:');
    console.log(`   🏪 Restaurants: ${restaurants?.length || 0}`);
    console.log(`   👥 Public Users: ${users?.length || 0}`);
    console.log(`   🔐 Auth Users: ${authUsers?.users?.length || 0}`);
    console.log(`   🔗 User-Restaurant Links: ${userRestaurants?.length || 0}`);
    console.log(`   📂 Categories: ${categories?.length || 0}`);
    console.log(`   🍽️ Products: ${products?.length || 0}`);

  } catch (error) {
    console.error('❌ Error during detailed database check:', error);
  }
}

// Run the check
detailedDbCheck();
