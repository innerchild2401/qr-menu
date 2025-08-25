#!/usr/bin/env node

/**
 * API Routes Diagnostic Script
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
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

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

async function testSupabaseConnections() {
  logSection('Testing Supabase Connections');
  
  try {
    // Test admin client
    const { data: adminTest, error: adminError } = await supabaseAdmin
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (adminError) {
      log(`❌ Admin client error: ${adminError.message}`, 'red');
    } else {
      log('✅ Admin client working', 'green');
    }
    
    // Test anon client
    const { data: anonTest, error: anonError } = await supabaseAnon
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (anonError) {
      log(`❌ Anon client error: ${anonError.message}`, 'red');
    } else {
      log('✅ Anon client working', 'green');
    }
    
    return !adminError && !anonError;
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

async function testRLSPolicies(user) {
  logSection('Testing RLS Policies');
  
  if (!user) {
    log('❌ No user provided for RLS test', 'red');
    return false;
  }
  
  try {
    // Test with anon client (should be blocked by RLS)
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('restaurants')
      .select('*');
    
    if (anonError) {
      log(`✅ Anon client blocked by RLS: ${anonError.message}`, 'green');
    } else {
      log(`⚠️ Anon client not blocked by RLS (found ${anonData?.length || 0} restaurants)`, 'yellow');
    }
    
    // Test with admin client (should bypass RLS)
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('restaurants')
      .select('*');
    
    if (adminError) {
      log(`❌ Admin client error: ${adminError.message}`, 'red');
    } else {
      log(`✅ Admin client bypassed RLS (found ${adminData?.length || 0} restaurants)`, 'green');
    }
    
    return !adminError;
  } catch (error) {
    log(`❌ Error testing RLS: ${error.message}`, 'red');
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

async function generateRecommendations() {
  logSection('Recommendations');
  
  log('🔧 Based on the analysis, here are the likely issues and solutions:', 'bright');
  
  log('\n1. **Authentication Context Issue**', 'yellow');
  log('   - The API routes use `getCurrentUserAndRestaurant()` which relies on Supabase auth context');
  log('   - This may not be properly set in server-side API routes');
  log('   - Solution: Ensure proper session handling in API routes');
  
  log('\n2. **Session Token Missing**', 'yellow');
  log('   - API routes need access to the user\'s session token');
  log('   - The `createServerSupabaseClient()` function expects cookies');
  log('   - Solution: Pass session token in request headers or use service role for admin operations');
  
  log('\n3. **RLS Policy Conflicts**', 'yellow');
  log('   - Even with service role, RLS policies might be interfering');
  log('   - Solution: Use `supabaseAdmin` consistently for admin operations');
  
  log('\n4. **User-Restaurant Linking**', 'yellow');
  log('   - Users may not be properly linked to restaurants');
  log('   - Solution: Ensure user_restaurants table has correct relationships');
  
  log('\n5. **Environment Variable Issues**', 'yellow');
  log('   - API routes may not have access to environment variables');
  log('   - Solution: Verify .env.local is loaded in API routes');
}

async function main() {
  logHeader('API ROUTES DIAGNOSTIC');
  
  try {
    // Step 1: Check environment variables
    const envOk = await checkEnvironmentVariables();
    if (!envOk) {
      log('❌ Environment variables missing. Cannot proceed.', 'red');
      return;
    }
    
    // Step 2: Test Supabase connections
    const connectionsOk = await testSupabaseConnections();
    if (!connectionsOk) {
      log('❌ Supabase connections failed. Cannot proceed.', 'red');
      return;
    }
    
    // Step 3: Check user authentication
    const user = await checkUserAuthentication();
    
    // Step 4: Check user-restaurant relationships
    if (user) {
      const relationshipsOk = await checkUserRestaurantRelationships(user);
      
      // Step 5: Test RLS policies
      await testRLSPolicies(user);
      
      // Step 6: Simulate API request
      const apiOk = await simulateAPIRequest(user);
      
      // Step 7: Test restaurant creation
      await testRestaurantCreation(user);
      
      // Summary
      logHeader('DIAGNOSTIC SUMMARY');
      log(`Environment Variables: ${envOk ? '✅' : '❌'}`, envOk ? 'green' : 'red');
      log(`Supabase Connections: ${connectionsOk ? '✅' : '❌'}`, connectionsOk ? 'green' : 'red');
      log(`User Authentication: ${user ? '✅' : '❌'}`, user ? 'green' : 'red');
      log(`User-Restaurant Relationships: ${relationshipsOk ? '✅' : '❌'}`, relationshipsOk ? 'green' : 'red');
      log(`API Request Simulation: ${apiOk ? '✅' : '❌'}`, apiOk ? 'green' : 'red');
    }
    
    // Generate recommendations
    await generateRecommendations();
    
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
  testSupabaseConnections,
  checkUserAuthentication,
  checkUserRestaurantRelationships,
  testRLSPolicies,
  simulateAPIRequest,
  testRestaurantCreation
};
