#!/usr/bin/env node

/**
 * API Routes Diagnostic Script - Fixed Version
 * Analyzes Next.js API routes for authentication and authorization issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
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

async function checkEnvironmentVariables() {
  logSection('Environment Variables Check');
  
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      log(`✅ ${key}: SET`, 'green');
    } else {
      log(`❌ ${key}: NOT SET`, 'red');
    }
  });
  
  return Object.values(envVars).every(v => v);
}

async function testSupabaseAdminConnection() {
  logSection('Testing Supabase Admin Connection');
  
  try {
    const { data: adminTest, error: adminError } = await supabaseAdmin
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (adminError) {
      log(`❌ Admin client error: ${adminError.message}`, 'red');
      return false;
    } else {
      log('✅ Admin client working', 'green');
      return true;
    }
  } catch (error) {
    log(`❌ Connection test failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkUserAuthentication() {
  logSection('Checking User Authentication');
  
  try {
    // Get all users from auth.users
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      log(`❌ Auth error: ${authError.message}`, 'red');
      return null;
    }
    
    if (users && users.length > 0) {
      log(`✅ Found ${users.length} users in auth.users:`, 'green');
      users.forEach(user => {
        log(`  - ${user.email} (${user.id})`, 'blue');
      });
      return users[0]; // Return first user for testing
    } else {
      log('⚠️ No users found in auth.users', 'yellow');
      return null;
    }
  } catch (error) {
    log(`❌ Error checking authentication: ${error.message}`, 'red');
    return null;
  }
}

async function checkUserRestaurantRelationships(user) {
  logSection('Checking User-Restaurant Relationships');
  
  if (!user) {
    log('❌ No user provided for relationship check', 'red');
    return false;
  }
  
  try {
    // Check users table
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      log(`❌ User not found in users table: ${userError.message}`, 'red');
    } else {
      log(`✅ User found in users table: ${userRecord.email}`, 'green');
    }
    
    // Check user_restaurants table
    const { data: userRestaurants, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select(`
        *,
        restaurants (*)
      `)
      .eq('user_id', user.id);
    
    if (urError) {
      log(`❌ Error querying user_restaurants: ${urError.message}`, 'red');
    } else if (userRestaurants && userRestaurants.length > 0) {
      log(`✅ Found ${userRestaurants.length} restaurant relationships:`, 'green');
      userRestaurants.forEach(ur => {
        log(`  - Restaurant: ${ur.restaurants.name} (Role: ${ur.role})`, 'blue');
      });
    } else {
      log('⚠️ No restaurant relationships found', 'yellow');
    }
    
    // Check restaurants with owner_id
    const { data: ownedRestaurants, error: ownerError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id);
    
    if (ownerError) {
      log(`❌ Error querying owned restaurants: ${ownerError.message}`, 'red');
    } else if (ownedRestaurants && ownedRestaurants.length > 0) {
      log(`✅ Found ${ownedRestaurants.length} owned restaurants:`, 'green');
      ownedRestaurants.forEach(restaurant => {
        log(`  - ${restaurant.name} (${restaurant.slug})`, 'blue');
      });
    } else {
      log('⚠️ No owned restaurants found', 'yellow');
    }
    
    return (userRestaurants && userRestaurants.length > 0) || (ownedRestaurants && ownedRestaurants.length > 0);
  } catch (error) {
    log(`❌ Error checking relationships: ${error.message}`, 'red');
    return false;
  }
}

async function simulateAPIRequest(user) {
  logSection('Simulating API Request');
  
  if (!user) {
    log('❌ No user provided for API simulation', 'red');
    return false;
  }
  
  try {
    // Simulate the getCurrentUserAndRestaurant logic
    log('🔍 Simulating getCurrentUserAndRestaurant...', 'blue');
    
    // Step 1: Get user (this would normally come from auth context)
    log(`✅ User ID: ${user.id}`, 'green');
    
    // Step 2: Try to get restaurant via user_restaurants
    const { data: userRestaurant, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select(`
        restaurant_id,
        restaurants (*)
      `)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (urError) {
      log(`⚠️ user_restaurants query failed: ${urError.message}`, 'yellow');
    } else if (userRestaurant && userRestaurant.restaurants) {
      log(`✅ Found restaurant via user_restaurants: ${userRestaurant.restaurants.name}`, 'green');
      return true;
    } else {
      log('ℹ️ No restaurant found via user_restaurants', 'blue');
    }
    
    // Step 3: Try to get restaurant via owner_id
    const { data: ownedRestaurant, error: ownerError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (ownerError) {
      log(`⚠️ owner_id query failed: ${ownerError.message}`, 'yellow');
    } else if (ownedRestaurant) {
      log(`✅ Found restaurant via owner_id: ${ownedRestaurant.name}`, 'green');
      return true;
    } else {
      log('ℹ️ No restaurant found via owner_id', 'blue');
    }
    
    log('❌ No restaurant found for user', 'red');
    return false;
    
  } catch (error) {
    log(`❌ Error simulating API request: ${error.message}`, 'red');
    return false;
  }
}

async function testRestaurantCreation(user) {
  logSection('Testing Restaurant Creation');
  
  if (!user) {
    log('❌ No user provided for creation test', 'red');
    return false;
  }
  
  try {
    const testRestaurant = {
      name: 'Test Restaurant API',
      slug: 'test-restaurant-api-' + Date.now(),
      address: 'Test Address',
      schedule: {},
      owner_id: user.id
    };
    
    log('🔍 Attempting to create test restaurant...', 'blue');
    
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
    
    // Create user_restaurants relationship
    const { error: relationshipError } = await supabaseAdmin
      .from('user_restaurants')
      .insert({
        user_id: user.id,
        restaurant_id: newRestaurant.id,
        role: 'owner'
      });
    
    if (relationshipError) {
      log(`⚠️ Failed to create relationship: ${relationshipError.message}`, 'yellow');
    } else {
      log('✅ User-restaurant relationship created', 'green');
    }
    
    // Clean up test restaurant
    await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', newRestaurant.id);
    
    log('✅ Test restaurant cleaned up', 'green');
    return true;
    
  } catch (error) {
    log(`❌ Error testing restaurant creation: ${error.message}`, 'red');
    return false;
  }
}

async function analyzeAPIRouteIssues() {
  logSection('API Route Issues Analysis');
  
  log('🔍 Analyzing the API route problems:', 'bright');
  
  log('\n1. **Authentication Context Problem**', 'yellow');
  log('   The API route uses `getCurrentUserAndRestaurant()` which calls:');
  log('   - `createServerSupabaseClient()` - expects cookies/session');
  log('   - `supabase.auth.getUser()` - needs auth context');
  log('   - This fails in API routes because there\'s no session context');
  
  log('\n2. **Session Token Missing**', 'yellow');
  log('   API routes don\'t automatically have access to:');
  log('   - Browser cookies');
  log('   - Session tokens');
  log('   - Auth context');
  
  log('\n3. **Solution: Use Service Role for Admin Operations**', 'green');
  log('   For admin API routes, we should:');
  log('   - Use `supabaseAdmin` (service role) for all operations');
  log('   - Get user ID from request headers or session');
  log('   - Bypass RLS policies for admin operations');
  
  log('\n4. **Current API Route Issues**', 'red');
  log('   - `/api/admin/restaurant` tries to use auth context');
  log('   - `getCurrentUserAndRestaurant()` fails in API routes');
  log('   - No fallback for missing session');
}

async function generateFixRecommendations() {
  logSection('Fix Recommendations');
  
  log('🔧 Here are the specific fixes needed:', 'bright');
  
  log('\n1. **Fix the API Route Authentication**', 'yellow');
  log('   Replace `getCurrentUserAndRestaurant()` with:');
  log('   - Direct service role queries');
  log('   - User ID from request headers');
  log('   - Fallback authentication methods');
  
  log('\n2. **Update API Route Logic**', 'yellow');
  log('   Modify `/api/admin/restaurant` to:');
  log('   - Use `supabaseAdmin` consistently');
  log('   - Handle missing session gracefully');
  log('   - Add proper error handling');
  
  log('\n3. **Add Session Handling**', 'yellow');
  log('   Implement proper session handling:');
  log('   - Extract user ID from request');
  log('   - Use service role for admin operations');
  log('   - Add authentication middleware');
  
  log('\n4. **Test the Fix**', 'green');
  log('   After implementing fixes:');
  log('   - Test restaurant loading');
  log('   - Test restaurant creation');
  log('   - Verify admin access works');
}

async function main() {
  logHeader('API ROUTES DIAGNOSTIC - FIXED VERSION');
  
  try {
    // Step 1: Check environment variables
    const envOk = await checkEnvironmentVariables();
    if (!envOk) {
      log('❌ Environment variables missing. Cannot proceed.', 'red');
      return;
    }
    
    // Step 2: Test Supabase admin connection
    const connectionOk = await testSupabaseAdminConnection();
    if (!connectionOk) {
      log('❌ Supabase admin connection failed. Cannot proceed.', 'red');
      return;
    }
    
    // Step 3: Check user authentication
    const user = await checkUserAuthentication();
    
    // Step 4: Check user-restaurant relationships
    if (user) {
      const relationshipsOk = await checkUserRestaurantRelationships(user);
      
      // Step 5: Simulate API request
      const apiOk = await simulateAPIRequest(user);
      
      // Step 6: Test restaurant creation
      await testRestaurantCreation(user);
      
      // Summary
      logHeader('DIAGNOSTIC SUMMARY');
      log(`Environment Variables: ${envOk ? '✅' : '❌'}`, envOk ? 'green' : 'red');
      log(`Supabase Admin Connection: ${connectionOk ? '✅' : '❌'}`, connectionOk ? 'green' : 'red');
      log(`User Authentication: ${user ? '✅' : '❌'}`, user ? 'green' : 'red');
      log(`User-Restaurant Relationships: ${relationshipsOk ? '✅' : '❌'}`, relationshipsOk ? 'green' : 'red');
      log(`API Request Simulation: ${apiOk ? '✅' : '❌'}`, apiOk ? 'green' : 'red');
    }
    
    // Analyze issues
    await analyzeAPIRouteIssues();
    
    // Generate recommendations
    await generateFixRecommendations();
    
  } catch (error) {
    log(`❌ Diagnostic failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the diagnostic
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  testSupabaseAdminConnection,
  checkUserAuthentication,
  checkUserRestaurantRelationships,
  simulateAPIRequest,
  testRestaurantCreation
};
