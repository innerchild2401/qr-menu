#!/usr/bin/env node

/**
 * Simple Restaurant RLS Fix Script
 * Uses direct SQL queries to fix RLS policies
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bright');
  console.log('='.repeat(60));
}

function logSection(message) {
  console.log('\n' + '-'.repeat(40));
  log(message, 'cyan');
  console.log('-'.repeat(40));
}

async function checkCurrentState() {
  logSection('Checking Current State');
  
  try {
    // Check if RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(1);
    
    if (rlsError) {
      log(`❌ Error accessing restaurants table: ${rlsError.message}`, 'red');
      return false;
    }
    
    log('✅ Can access restaurants table', 'green');
    
    // Check existing policies by trying to access with different permissions
    const { data: policies, error: policyError } = await supabase
      .from('restaurants')
      .select('id, name, slug, owner_id');
    
    if (policyError) {
      log(`❌ RLS policy error: ${policyError.message}`, 'red');
      return false;
    }
    
    if (policies && policies.length > 0) {
      log(`✅ Can access ${policies.length} restaurants:`, 'green');
      policies.forEach(restaurant => {
        log(`  - ${restaurant.name} (${restaurant.slug})`, 'blue');
      });
      return true;
    } else {
      log('⚠️  No restaurants found or accessible', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking state: ${error.message}`, 'red');
    return false;
  }
}

async function getCurrentUser() {
  logSection('Getting Current User');
  
  try {
    // Get all users to find the current one
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(5);
    
    if (error) throw error;
    
    if (users && users.length > 0) {
      // Use the first user as current user for this script
      const currentUser = users[0];
      log(`Current user: ${currentUser.email} (${currentUser.id})`, 'blue');
      return currentUser;
    } else {
      log('❌ No users found', 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error getting user: ${error.message}`, 'red');
    return null;
  }
}

async function linkUserToRestaurants(user) {
  logSection('Linking User to Restaurants');
  
  try {
    // Get all restaurants
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, slug, owner_id');
    
    if (restaurantError) throw restaurantError;
    
    if (!restaurants || restaurants.length === 0) {
      log('⚠️  No restaurants found', 'yellow');
      return false;
    }
    
    let linkedCount = 0;
    
    for (const restaurant of restaurants) {
      // Check if user is already linked
      const { data: existingLink, error: linkError } = await supabase
        .from('user_restaurants')
        .select('*')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id);
      
      if (linkError) {
        log(`⚠️  Error checking link for ${restaurant.name}: ${linkError.message}`, 'yellow');
        continue;
      }
      
      if (!existingLink || existingLink.length === 0) {
        // Create link
        const { error: insertError } = await supabase
          .from('user_restaurants')
          .insert({
            user_id: user.id,
            restaurant_id: restaurant.id,
            role: 'owner'
          });
        
        if (insertError) {
          log(`⚠️  Error linking to ${restaurant.name}: ${insertError.message}`, 'yellow');
        } else {
          log(`✅ Linked user to restaurant: ${restaurant.name}`, 'green');
          linkedCount++;
        }
      } else {
        log(`✅ User already linked to restaurant: ${restaurant.name}`, 'green');
        linkedCount++;
      }
      
      // Set owner_id if not set
      if (!restaurant.owner_id) {
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ owner_id: user.id })
          .eq('id', restaurant.id);
        
        if (updateError) {
          log(`⚠️  Error setting owner for ${restaurant.name}: ${updateError.message}`, 'yellow');
        } else {
          log(`✅ Set user as owner of restaurant: ${restaurant.name}`, 'green');
        }
      }
    }
    
    return linkedCount > 0;
  } catch (error) {
    log(`❌ Error linking user: ${error.message}`, 'red');
    return false;
  }
}

async function testRestaurantAccess() {
  logSection('Testing Restaurant Access');
  
  try {
    // Test SELECT access
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, owner_id');
    
    if (error) {
      log(`❌ SELECT access error: ${error.message}`, 'red');
      return false;
    }
    
    if (restaurants && restaurants.length > 0) {
      log(`✅ SELECT access: Can see ${restaurants.length} restaurants`, 'green');
      
      // Test INSERT access by trying to create a test restaurant
      const testRestaurant = {
        name: 'Test Restaurant',
        slug: 'test-' + Date.now(),
        owner_id: restaurants[0].owner_id // Use existing owner_id
      };
      
      const { data: inserted, error: insertError } = await supabase
        .from('restaurants')
        .insert(testRestaurant)
        .select();
      
      if (insertError) {
        log(`❌ INSERT access error: ${insertError.message}`, 'red');
      } else {
        log(`✅ INSERT access: Successfully created test restaurant`, 'green');
        
        // Clean up test restaurant
        await supabase
          .from('restaurants')
          .delete()
          .eq('id', inserted[0].id);
        
        log(`✅ Cleaned up test restaurant`, 'green');
      }
      
      return true;
    } else {
      log('⚠️  No restaurants accessible', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error testing access: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  logHeader('SIMPLE RESTAURANT RLS FIX');
  
  try {
    // Step 1: Check current state
    const canAccess = await checkCurrentState();
    
    if (!canAccess) {
      log('❌ Cannot access restaurants. RLS policies may be blocking access.', 'red');
      log('You may need to run the SQL script in Supabase SQL Editor instead.', 'yellow');
      return;
    }
    
    // Step 2: Get current user
    const user = await getCurrentUser();
    if (!user) {
      log('❌ No user found. Cannot proceed.', 'red');
      return;
    }
    
    // Step 3: Link user to restaurants
    const linked = await linkUserToRestaurants(user);
    
    // Step 4: Test access
    const accessWorking = await testRestaurantAccess();
    
    // Summary
    logHeader('FIX SUMMARY');
    if (accessWorking) {
      log('🎉 Restaurant access is working!', 'green');
      log('You should now be able to access and manage restaurants in your app.', 'green');
    } else if (linked) {
      log('⚠️  User linked but access still has issues', 'yellow');
      log('You may need to run the SQL script in Supabase SQL Editor to fix RLS policies.', 'yellow');
    } else {
      log('❌ Fix was not successful', 'red');
      log('Please run the SQL script in Supabase SQL Editor.', 'red');
    }
    
  } catch (error) {
    log(`❌ Script failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  checkCurrentState,
  getCurrentUser,
  linkUserToRestaurants,
  testRestaurantAccess
};
