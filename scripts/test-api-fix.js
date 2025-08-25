#!/usr/bin/env node

/**
 * Test API Route Fix
 * Verifies that the fixed API route works correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

async function testAPIRouteLogic() {
  logSection('Testing API Route Logic');
  
  try {
    // Get a test user
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !users || users.length === 0) {
      log('❌ No users found for testing', 'red');
      return false;
    }
    
    const testUser = users[0];
    log(`✅ Using test user: ${testUser.email}`, 'green');
    
    // Test the getUserRestaurant logic (from the fixed API route)
    log('🔍 Testing getUserRestaurant logic...', 'blue');
    
    // First, try to find restaurant through user_restaurants table
    const { data: userRestaurant, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select(`
        restaurant_id,
        restaurants (*)
      `)
      .eq('user_id', testUser.id)
      .eq('role', 'owner')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let foundRestaurant = null;
    
    if (!urError && userRestaurant && userRestaurant.restaurants && Array.isArray(userRestaurant.restaurants) && userRestaurant.restaurants.length > 0) {
      foundRestaurant = userRestaurant.restaurants[0];
      log(`✅ Found restaurant via user_restaurants: ${foundRestaurant.name}`, 'green');
    } else {
      log('ℹ️ No restaurant found via user_restaurants, trying owner_id...', 'blue');
      
      // Fallback: try to find restaurant by owner_id
      const { data: ownedRestaurant, error: ownerError } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('owner_id', testUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!ownerError && ownedRestaurant) {
        foundRestaurant = ownedRestaurant;
        log(`✅ Found restaurant via owner_id: ${foundRestaurant.name}`, 'green');
      } else {
        log('❌ No restaurant found for user', 'red');
      }
    }
    
    if (foundRestaurant) {
      log('✅ API route logic test passed!', 'green');
      return true;
    } else {
      log('❌ API route logic test failed - no restaurant found', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Error testing API route logic: ${error.message}`, 'red');
    return false;
  }
}

async function testRestaurantCreation() {
  logSection('Testing Restaurant Creation Logic');
  
  try {
    // Get a test user
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !users || users.length === 0) {
      log('❌ No users found for testing', 'red');
      return false;
    }
    
    const testUser = users[0];
    log(`✅ Using test user: ${testUser.email}`, 'green');
    
    // Test restaurant creation logic
    const testRestaurant = {
      name: 'Test Restaurant API Fix',
      slug: 'test-restaurant-api-fix-' + Date.now(),
      address: 'Test Address',
      schedule: {},
      owner_id: testUser.id
    };
    
    log('🔍 Testing restaurant creation...', 'blue');
    
    const { data: newRestaurant, error: createError } = await supabaseAdmin
      .from('restaurants')
      .insert(testRestaurant)
      .select()
      .single();
    
    if (createError) {
      log(`❌ Restaurant creation failed: ${createError.message}`, 'red');
      return false;
    }
    
    log(`✅ Restaurant created successfully: ${newRestaurant.name}`, 'green');
    
    // Test user_restaurants relationship creation
    const { error: relationshipError } = await supabaseAdmin
      .from('user_restaurants')
      .insert({
        user_id: testUser.id,
        restaurant_id: newRestaurant.id,
        role: 'owner'
      });
    
    if (relationshipError) {
      log(`⚠️ Relationship creation failed: ${relationshipError.message}`, 'yellow');
    } else {
      log('✅ User-restaurant relationship created', 'green');
    }
    
    // Clean up test restaurant
    await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', newRestaurant.id);
    
    log('✅ Test restaurant cleaned up', 'green');
    log('✅ Restaurant creation logic test passed!', 'green');
    return true;
    
  } catch (error) {
    log(`❌ Error testing restaurant creation: ${error.message}`, 'red');
    return false;
  }
}

async function generateNextSteps() {
  logSection('Next Steps for Testing');
  
  log('🔧 To test the fixed API route:', 'bright');
  
  log('\n1. **Start your Next.js development server**', 'yellow');
  log('   npm run dev');
  
  log('\n2. **Test the API route directly**', 'yellow');
  log('   - Open browser to http://localhost:3000/admin');
  log('   - Check browser console for API logs');
  log('   - Look for the detailed console logs we added');
  
  log('\n3. **Expected Console Output**', 'green');
  log('   ✅ "GET /api/admin/restaurant - Starting request"');
  log('   ✅ "Authenticated user found: [email]"');
  log('   ✅ "Getting restaurant for user: [user-id]"');
  log('   ✅ "Found restaurant via user_restaurants: [name]"');
  log('   ✅ "Successfully retrieved restaurant: [name]"');
  
  log('\n4. **Test Restaurant Creation**', 'yellow');
  log('   - Try creating a new restaurant');
  log('   - Check for "POST /api/admin/restaurant - Starting request"');
  log('   - Verify restaurant is created successfully');
  
  log('\n5. **If Issues Persist**', 'red');
  log('   - Check browser network tab for API responses');
  log('   - Look for authentication errors');
  log('   - Verify user is properly logged in');
}

async function main() {
  logHeader('API ROUTE FIX VERIFICATION');
  
  try {
    // Test the API route logic
    const apiLogicOk = await testAPIRouteLogic();
    
    // Test restaurant creation logic
    const creationOk = await testRestaurantCreation();
    
    // Summary
    logHeader('VERIFICATION SUMMARY');
    log(`API Route Logic: ${apiLogicOk ? '✅' : '❌'}`, apiLogicOk ? 'green' : 'red');
    log(`Restaurant Creation: ${creationOk ? '✅' : '❌'}`, creationOk ? 'green' : 'red');
    
    if (apiLogicOk && creationOk) {
      log('\n🎉 All tests passed! The API route fix should work.', 'green');
      log('You can now test the actual API route in your application.', 'green');
    } else {
      log('\n⚠️ Some tests failed. Check the output above for details.', 'yellow');
    }
    
    // Generate next steps
    await generateNextSteps();
    
  } catch (error) {
    log(`❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  main();
}

module.exports = {
  testAPIRouteLogic,
  testRestaurantCreation
};
