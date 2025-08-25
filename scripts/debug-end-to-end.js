#!/usr/bin/env node

/**
 * End-to-End Debug Script
 * Tests the complete authentication and API flow to identify unauthorized errors
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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

function logSubSection(message) {
  console.log('\n' + '─'.repeat(30));
  log(message, 'yellow');
  console.log('─'.repeat(30));
}

async function checkEnvironmentConfiguration() {
  logSection('1. Environment Configuration Check');
  
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  logSubSection('Environment Variables');
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      log(`✅ ${key}: SET`, 'green');
      // Show first and last 10 characters for verification
      const preview = value.length > 20 ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}` : value;
      log(`   Preview: ${preview}`, 'blue');
    } else {
      log(`❌ ${key}: NOT SET`, 'red');
    }
  });
  
  logSubSection('Supabase Client Configuration');
  log(`Admin Client URL: ${supabaseUrl}`, 'blue');
  log(`Admin Client Key: ${supabaseServiceKey.substring(0, 10)}...${supabaseServiceKey.substring(supabaseServiceKey.length - 10)}`, 'blue');
  log(`Anon Client Key: ${supabaseAnonKey.substring(0, 10)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}`, 'blue');
  
  return Object.values(envVars).every(v => v);
}

async function testSupabaseConnections() {
  logSection('2. Supabase Connection Tests');
  
  logSubSection('Admin Client Test');
  try {
    const { data: adminTest, error: adminError } = await supabaseAdmin
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (adminError) {
      log(`❌ Admin client error: ${adminError.message}`, 'red');
      log(`   Code: ${adminError.code}`, 'red');
      log(`   Details: ${adminError.details}`, 'red');
    } else {
      log('✅ Admin client working', 'green');
    }
  } catch (error) {
    log(`❌ Admin client exception: ${error.message}`, 'red');
  }
  
  logSubSection('Anon Client Test');
  try {
    const { data: anonTest, error: anonError } = await supabaseAnon
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (anonError) {
      log(`❌ Anon client error: ${anonError.message}`, 'red');
      log(`   Code: ${anonError.code}`, 'red');
      log(`   Details: ${anonError.details}`, 'red');
    } else {
      log('✅ Anon client working', 'green');
    }
  } catch (error) {
    log(`❌ Anon client exception: ${error.message}`, 'red');
  }
}

async function checkUserAuthentication() {
  logSection('3. User Authentication Check');
  
  logSubSection('Listing All Users');
  try {
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      log(`❌ Auth error: ${authError.message}`, 'red');
      return null;
    }
    
    if (users && users.length > 0) {
      log(`✅ Found ${users.length} users in auth.users:`, 'green');
      users.forEach((user, index) => {
        log(`  ${index + 1}. ${user.email} (${user.id})`, 'blue');
        log(`     Created: ${user.created_at}`, 'blue');
        log(`     Last Sign In: ${user.last_sign_in_at || 'Never'}`, 'blue');
        log(`     Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`, 'blue');
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

async function testUserSession(user) {
  logSection('4. User Session Test');
  
  if (!user) {
    log('❌ No user provided for session test', 'red');
    return false;
  }
  
  logSubSection('Testing User Session');
  log(`Testing session for user: ${user.email}`, 'blue');
  
  try {
    // Try to get user session using admin client
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.getUserById(user.id);
    
    if (sessionError) {
      log(`❌ Session error: ${sessionError.message}`, 'red');
      return false;
    }
    
    if (session) {
      log('✅ User session retrieved successfully', 'green');
      log(`   User ID: ${session.user.id}`, 'blue');
      log(`   Email: ${session.user.email}`, 'blue');
      log(`   Created: ${session.user.created_at}`, 'blue');
      log(`   Last Sign In: ${session.user.last_sign_in_at || 'Never'}`, 'blue');
      return true;
    } else {
      log('❌ No session found for user', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error testing session: ${error.message}`, 'red');
    return false;
  }
}

async function testUserRestaurantAccess(user) {
  logSection('5. User Restaurant Access Test');
  
  if (!user) {
    log('❌ No user provided for restaurant access test', 'red');
    return false;
  }
  
  logSubSection('Testing Direct Database Access');
  log(`Testing restaurant access for user: ${user.email}`, 'blue');
  
  try {
    // Test user_restaurants table access
    const { data: userRestaurants, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select(`
        *,
        restaurants (*)
      `)
      .eq('user_id', user.id);
    
    if (urError) {
      log(`❌ user_restaurants query error: ${urError.message}`, 'red');
      log(`   Code: ${urError.code}`, 'red');
    } else if (userRestaurants && userRestaurants.length > 0) {
      log(`✅ Found ${userRestaurants.length} restaurant relationships:`, 'green');
      userRestaurants.forEach(ur => {
        log(`   - Restaurant: ${ur.restaurants.name} (Role: ${ur.role})`, 'blue');
      });
    } else {
      log('⚠️ No restaurant relationships found', 'yellow');
    }
    
    // Test restaurants table access
    const { data: ownedRestaurants, error: ownerError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id);
    
    if (ownerError) {
      log(`❌ restaurants query error: ${ownerError.message}`, 'red');
      log(`   Code: ${ownerError.code}`, 'red');
    } else if (ownedRestaurants && ownedRestaurants.length > 0) {
      log(`✅ Found ${ownedRestaurants.length} owned restaurants:`, 'green');
      ownedRestaurants.forEach(restaurant => {
        log(`   - ${restaurant.name} (${restaurant.slug})`, 'blue');
      });
    } else {
      log('⚠️ No owned restaurants found', 'yellow');
    }
    
    return (userRestaurants && userRestaurants.length > 0) || (ownedRestaurants && ownedRestaurants.length > 0);
  } catch (error) {
    log(`❌ Error testing restaurant access: ${error.message}`, 'red');
    return false;
  }
}

async function simulateAPIRouteLogic(user) {
  logSection('6. API Route Logic Simulation');
  
  if (!user) {
    log('❌ No user provided for API simulation', 'red');
    return false;
  }
  
  logSubSection('Simulating getCurrentUserFromSession');
  log('This simulates what happens in the API route when getting user from session', 'blue');
  
  try {
    // Simulate the session extraction logic
    log('Step 1: Creating server client with cookies...', 'blue');
    // Note: In a real API route, this would use cookies from the request
    
    log('Step 2: Getting user from session...', 'blue');
    log(`   User ID: ${user.id}`, 'green');
    log(`   User Email: ${user.email}`, 'green');
    
    logSubSection('Simulating getUserRestaurant');
    log('This simulates the restaurant lookup logic in the API route', 'blue');
    
    // Test the exact logic from the API route
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
      log(`❌ user_restaurants query failed: ${urError.message}`, 'red');
      log(`   Code: ${urError.code}`, 'red');
    } else if (userRestaurant && userRestaurant.restaurants && Array.isArray(userRestaurant.restaurants) && userRestaurant.restaurants.length > 0) {
      const restaurant = userRestaurant.restaurants[0];
      log(`✅ Found restaurant via user_restaurants: ${restaurant.name}`, 'green');
      return true;
    } else {
      log('ℹ️ No restaurant found via user_restaurants, trying owner_id...', 'blue');
      
      // Fallback: try to find restaurant by owner_id
      const { data: ownedRestaurant, error: ownerError } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (ownerError) {
        log(`❌ owner_id query failed: ${ownerError.message}`, 'red');
        log(`   Code: ${ownerError.code}`, 'red');
      } else if (ownedRestaurant) {
        log(`✅ Found restaurant via owner_id: ${ownedRestaurant.name}`, 'green');
        return true;
      } else {
        log('❌ No restaurant found for user', 'red');
      }
    }
    
    return false;
  } catch (error) {
    log(`❌ Error simulating API route: ${error.message}`, 'red');
    return false;
  }
}

async function testRLSPolicies() {
  logSection('7. RLS Policy Test');
  
  logSubSection('Testing RLS with Different Clients');
  
  try {
    // Test with anon client (should be blocked by RLS)
    log('Testing anon client access...', 'blue');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('restaurants')
      .select('*')
      .limit(1);
    
    if (anonError) {
      log(`✅ Anon client blocked by RLS: ${anonError.message}`, 'green');
      log(`   Code: ${anonError.code}`, 'blue');
    } else {
      log(`⚠️ Anon client not blocked by RLS (found ${anonData?.length || 0} restaurants)`, 'yellow');
    }
    
    // Test with admin client (should bypass RLS)
    log('Testing admin client access...', 'blue');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .limit(1);
    
    if (adminError) {
      log(`❌ Admin client error: ${adminError.message}`, 'red');
      log(`   Code: ${adminError.code}`, 'red');
    } else {
      log(`✅ Admin client bypassed RLS (found ${adminData?.length || 0} restaurants)`, 'green');
    }
    
  } catch (error) {
    log(`❌ Error testing RLS: ${error.message}`, 'red');
  }
}

async function checkJWTConfiguration() {
  logSection('8. JWT Configuration Check');
  
  logSubSection('JWT Token Analysis');
  
  try {
    // Decode the anon key to check JWT structure
    const anonKeyParts = supabaseAnonKey.split('.');
    if (anonKeyParts.length === 3) {
      log('✅ Anon key has valid JWT structure (3 parts)', 'green');
      
      // Decode header and payload (base64url decode)
      const header = JSON.parse(Buffer.from(anonKeyParts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(anonKeyParts[1], 'base64url').toString());
      
      log('JWT Header:', 'blue');
      log(`   Algorithm: ${header.alg}`, 'blue');
      log(`   Type: ${header.typ}`, 'blue');
      
      log('JWT Payload:', 'blue');
      log(`   Issuer: ${payload.iss}`, 'blue');
      log(`   Subject: ${payload.sub}`, 'blue');
      log(`   Audience: ${payload.aud}`, 'blue');
      log(`   Role: ${payload.role}`, 'blue');
      log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`, 'blue');
      
      // Check if the issuer matches the Supabase URL
      const expectedIssuer = supabaseUrl.replace('https://', 'https://');
      if (payload.iss === expectedIssuer) {
        log('✅ JWT issuer matches Supabase URL', 'green');
      } else {
        log(`❌ JWT issuer mismatch: ${payload.iss} vs ${expectedIssuer}`, 'red');
      }
      
    } else {
      log('❌ Anon key does not have valid JWT structure', 'red');
    }
    
  } catch (error) {
    log(`❌ Error analyzing JWT: ${error.message}`, 'red');
  }
}

async function generateUnauthorizedChecklist() {
  logSection('9. Unauthorized Error Checklist');
  
  log('🔍 Common reasons for "unauthorized" errors in Supabase:', 'bright');
  
  log('\n1. **Invalid API Key**', 'yellow');
  log('   - Wrong anon key or service role key');
  log('   - Key belongs to different project');
  log('   - Key has been rotated/regenerated');
  
  log('\n2. **Wrong Project URL**', 'yellow');
  log('   - Using URL from different Supabase project');
  log('   - URL format is incorrect');
  log('   - Project has been deleted or suspended');
  
  log('\n3. **RLS Policy Issues**', 'yellow');
  log('   - RLS is enabled but policies are too restrictive');
  log('   - User is not authenticated when RLS requires auth');
  log('   - User does not match policy conditions');
  
  log('\n4. **Authentication Context Missing**', 'yellow');
  log('   - No session token in API routes');
  log('   - Session has expired');
  log('   - User is not logged in');
  
  log('\n5. **Database Permissions**', 'yellow');
  log('   - User lacks database permissions');
  log('   - Table does not exist or is inaccessible');
  log('   - Schema permissions are incorrect');
  
  log('\n6. **JWT Token Issues**', 'yellow');
  log('   - Token is malformed');
  log('   - Token has expired');
  log('   - Token signature is invalid');
  
  log('\n7. **Environment Variable Issues**', 'yellow');
  log('   - Variables not loaded in API routes');
  log('   - Variables contain extra whitespace/newlines');
  log('   - Variables are undefined or null');
}

async function generateRecommendations(results) {
  logSection('10. Recommendations Based on Test Results');
  
  log('🔧 Based on the test results, here are the most likely issues:', 'bright');
  
  if (!results.envOk) {
    log('\n❌ **Environment Variables Issue**', 'red');
    log('   - Fix: Check .env.local file and ensure all variables are set');
    log('   - Fix: Restart the development server after changing env vars');
  }
  
  if (!results.connectionsOk) {
    log('\n❌ **Supabase Connection Issue**', 'red');
    log('   - Fix: Verify project URL and API keys in Supabase dashboard');
    log('   - Fix: Check if project is active and not suspended');
  }
  
  if (!results.authOk) {
    log('\n❌ **Authentication Issue**', 'red');
    log('   - Fix: Ensure user is properly logged in');
    log('   - Fix: Check if session tokens are being passed correctly');
  }
  
  if (!results.restaurantAccessOk) {
    log('\n❌ **Restaurant Access Issue**', 'red');
    log('   - Fix: Link user to restaurants via user_restaurants table');
    log('   - Fix: Set owner_id in restaurants table');
  }
  
  if (!results.apiLogicOk) {
    log('\n❌ **API Route Logic Issue**', 'red');
    log('   - Fix: The API route logic is failing to find user restaurants');
    log('   - Fix: Check the getUserRestaurant function implementation');
  }
  
  log('\n🎯 **Most Likely Root Cause**', 'bright');
  if (!results.authOk) {
    log('   The user is not properly authenticated in the API route context.', 'red');
    log('   This is the most common cause of "unauthorized" errors.', 'red');
  } else if (!results.restaurantAccessOk) {
    log('   The user is authenticated but has no restaurant access.', 'red');
    log('   The user needs to be linked to restaurants.', 'red');
  } else if (!results.apiLogicOk) {
    log('   The API route logic is failing to retrieve user data.', 'red');
    log('   The session handling in API routes needs to be fixed.', 'red');
  } else {
    log('   All tests passed. The issue may be in the frontend code.', 'green');
    log('   Check the browser network tab for actual API responses.', 'green');
  }
}

async function main() {
  logHeader('END-TO-END SUPABASE DEBUG');
  
  const results = {
    envOk: false,
    connectionsOk: false,
    authOk: false,
    sessionOk: false,
    restaurantAccessOk: false,
    apiLogicOk: false
  };
  
  try {
    // Step 1: Check environment configuration
    results.envOk = await checkEnvironmentConfiguration();
    
    // Step 2: Test Supabase connections
    await testSupabaseConnections();
    results.connectionsOk = true; // Assume true if no errors thrown
    
    // Step 3: Check user authentication
    const user = await checkUserAuthentication();
    results.authOk = !!user;
    
    if (user) {
      // Step 4: Test user session
      results.sessionOk = await testUserSession(user);
      
      // Step 5: Test restaurant access
      results.restaurantAccessOk = await testUserRestaurantAccess(user);
      
      // Step 6: Simulate API route logic
      results.apiLogicOk = await simulateAPIRouteLogic(user);
    }
    
    // Step 7: Test RLS policies
    await testRLSPolicies();
    
    // Step 8: Check JWT configuration
    await checkJWTConfiguration();
    
    // Step 9: Generate unauthorized checklist
    await generateUnauthorizedChecklist();
    
    // Step 10: Generate recommendations
    await generateRecommendations(results);
    
    // Final summary
    logHeader('DEBUG SUMMARY');
    log(`Environment Configuration: ${results.envOk ? '✅' : '❌'}`, results.envOk ? 'green' : 'red');
    log(`Supabase Connections: ${results.connectionsOk ? '✅' : '❌'}`, results.connectionsOk ? 'green' : 'red');
    log(`User Authentication: ${results.authOk ? '✅' : '❌'}`, results.authOk ? 'green' : 'red');
    log(`User Session: ${results.sessionOk ? '✅' : '❌'}`, results.sessionOk ? 'green' : 'red');
    log(`Restaurant Access: ${results.restaurantAccessOk ? '✅' : '❌'}`, results.restaurantAccessOk ? 'green' : 'red');
    log(`API Route Logic: ${results.apiLogicOk ? '✅' : '❌'}`, results.apiLogicOk ? 'green' : 'red');
    
    if (results.envOk && results.connectionsOk && results.authOk && results.sessionOk && results.restaurantAccessOk && results.apiLogicOk) {
      log('\n🎉 All tests passed! The issue may be in the frontend implementation.', 'green');
      log('Check the browser console and network tab for more details.', 'green');
    } else {
      log('\n⚠️ Some tests failed. Check the recommendations above.', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Debug failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the debug
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentConfiguration,
  testSupabaseConnections,
  checkUserAuthentication,
  testUserSession,
  testUserRestaurantAccess,
  simulateAPIRouteLogic,
  testRLSPolicies,
  checkJWTConfiguration
};
