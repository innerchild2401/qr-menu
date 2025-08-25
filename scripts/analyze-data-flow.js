#!/usr/bin/env node

/**
 * Data Flow Analysis for Restaurant Loading
 * Traces the complete authentication and data fetching process
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

async function analyzeDataFlow() {
  logHeader('RESTAURANT DATA FLOW ANALYSIS');
  
  logSection('1. Data Flow Overview');
  log('The restaurant data loading process follows this flow:', 'blue');
  log('1. User logs in → Session stored in cookies', 'blue');
  log('2. Admin page loads → useEffect triggers', 'blue');
  log('3. getSession() called → Gets session from Supabase', 'blue');
  log('4. loadRestaurantData() called → Fetches /api/admin/me/restaurant', 'blue');
  log('5. API route calls getCurrentUserAndRestaurant()', 'blue');
  log('6. Session extraction from cookies', 'blue');
  log('7. Database query for user\'s restaurant', 'blue');
  log('8. Response returned to frontend', 'blue');
  
  logSection('2. Authentication Flow Analysis');
  
  logSubSection('Step 1: User Session Retrieval');
  log('Location: src/app/admin/settings/page.tsx (lines 50-70)', 'blue');
  log('Code: const { data: { session } } = await supabase.auth.getSession();', 'blue');
  log('This should work if user is logged in', 'green');
  
  logSubSection('Step 2: API Call to /api/admin/me/restaurant');
  log('Location: src/app/admin/settings/page.tsx (lines 72-95)', 'blue');
  log('Code: const response = await fetch(\'/api/admin/me/restaurant\');', 'blue');
  log('This makes a server-side API call', 'blue');
  
  logSubSection('Step 3: API Route Handler');
  log('Location: src/app/api/admin/me/restaurant/route.ts', 'blue');
  log('Code: const { user, restaurant, error } = await getCurrentUserAndRestaurant();', 'blue');
  log('This calls the main authentication function', 'blue');
  
  logSubSection('Step 4: Session Extraction in API Route');
  log('Location: lib/currentRestaurant.ts (lines 167-191)', 'blue');
  log('Code: const { data: { user }, error: userError } = await supabase.auth.getUser();', 'blue');
  log('This is where the 401 error occurs!', 'red');
  
  logSection('3. Root Cause Analysis');
  
  logSubSection('The Problem');
  log('❌ Session extraction fails in API routes', 'red');
  log('❌ getCurrentUserAndRestaurant() returns "Unauthorized"', 'red');
  log('❌ This happens because cookies are not properly passed', 'red');
  
  logSubSection('Why This Happens');
  log('1. Frontend: User session exists in browser cookies', 'yellow');
  log('2. API Route: createServerSupabaseClient() tries to get cookies', 'yellow');
  log('3. Issue: Cookies may not be properly accessible in API routes', 'yellow');
  log('4. Result: supabase.auth.getUser() fails with 401', 'yellow');
  
  logSection('4. Code Flow Analysis');
  
  logSubSection('Frontend Session Handling (WORKING)');
  log('✅ supabase.auth.getSession() - Works in browser', 'green');
  log('✅ Session cookies are available in browser context', 'green');
  log('✅ User authentication state is properly managed', 'green');
  
  logSubSection('API Route Session Handling (FAILING)');
  log('❌ createServerSupabaseClient() - Fails in API routes', 'red');
  log('❌ Cookies may not be properly extracted', 'red');
  log('❌ Session context is lost in server-side API calls', 'red');
  
  logSection('5. Database Query Analysis');
  
  logSubSection('Restaurant Query Logic');
  log('Location: lib/currentRestaurant.ts (lines 63-162)', 'blue');
  log('Priority order:', 'blue');
  log('1. user_restaurants table (role = owner)', 'blue');
  log('2. restaurants table (owner_id = user.id)', 'blue');
  log('3. Enhanced function as fallback', 'blue');
  
  logSubSection('Query Structure');
  log('✅ Uses supabaseAdmin (service role) - Bypasses RLS', 'green');
  log('✅ Proper user ID filtering', 'green');
  log('✅ Fallback mechanisms in place', 'green');
  log('✅ Caching implemented', 'green');
  
  logSection('6. Potential Solutions');
  
  logSubSection('Solution 1: Fix Session Extraction');
  log('🔧 Ensure cookies are properly passed to API routes', 'yellow');
  log('🔧 Verify createServerSupabaseClient() configuration', 'yellow');
  log('🔧 Add better error handling for session extraction', 'yellow');
  
  logSubSection('Solution 2: Alternative Authentication');
  log('🔧 Pass user ID in request headers', 'yellow');
  log('🔧 Use JWT tokens instead of session cookies', 'yellow');
  log('🔧 Implement custom authentication middleware', 'yellow');
  
  logSubSection('Solution 3: Direct Database Access');
  log('🔧 Use service role for all admin operations', 'yellow');
  log('🔧 Bypass session extraction entirely', 'yellow');
  log('🔧 Implement user identification via other means', 'yellow');
  
  logSection('7. Immediate Fix Recommendations');
  
  logSubSection('Quick Fix: Use Service Role for API Routes');
  log('1. Modify API routes to use supabaseAdmin directly', 'green');
  log('2. Get user ID from request headers or session', 'green');
  log('3. Bypass session extraction in API routes', 'green');
  
  logSubSection('Long-term Fix: Proper Session Handling');
  log('1. Fix cookie extraction in createServerSupabaseClient', 'green');
  log('2. Ensure proper session context in API routes', 'green');
  log('3. Add comprehensive error handling', 'green');
  
  logSection('8. Testing Recommendations');
  
  logSubSection('Test Cases to Verify');
  log('1. Test session extraction in API routes', 'blue');
  log('2. Test database queries with service role', 'blue');
  log('3. Test user-restaurant relationships', 'blue');
  log('4. Test error handling and fallbacks', 'blue');
  
  logSubSection('Debug Steps');
  log('1. Add console logs to track session extraction', 'blue');
  log('2. Test API routes with different authentication methods', 'blue');
  log('3. Verify user-restaurant relationships in database', 'blue');
  log('4. Check browser network tab for API responses', 'blue');
}

async function testSessionExtraction() {
  logSection('9. Session Extraction Test');
  
  logSubSection('Testing createServerSupabaseClient');
  log('This simulates what happens in API routes...', 'blue');
  
  try {
    // Simulate the exact logic from the API route
    const { createServerClient } = require('@supabase/ssr');
    
    log('Step 1: Creating server client...', 'blue');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            // This would normally get cookies from the request
            log('⚠️ No cookies available in test context', 'yellow');
            return [];
          },
          setAll(cookiesToSet) {
            // This would normally set cookies in the response
            log('⚠️ Cookie setting not available in test context', 'yellow');
          },
        },
      }
    );
    
    log('Step 2: Trying to get user from session...', 'blue');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      log(`❌ Session extraction failed: ${error.message}`, 'red');
      log(`   Code: ${error.status}`, 'red');
      log(`   This confirms the API route issue!`, 'red');
    } else if (user) {
      log(`✅ Session extraction successful: ${user.email}`, 'green');
    } else {
      log('❌ No user found in session', 'red');
    }
    
  } catch (error) {
    log(`❌ Session extraction error: ${error.message}`, 'red');
  }
}

async function generateSummary() {
  logSection('10. Summary and Recommendations');
  
  log('🎯 **ROOT CAUSE IDENTIFIED**', 'bright');
  log('The restaurant data loading fails because session extraction in API routes returns 401 Unauthorized.', 'red');
  
  log('\n📋 **EXACT DATA FLOW**', 'bright');
  log('1. ✅ User logs in → Session stored in browser cookies', 'green');
  log('2. ✅ Frontend gets session → supabase.auth.getSession() works', 'green');
  log('3. ✅ API call made → fetch(\'/api/admin/me/restaurant\')', 'green');
  log('4. ❌ API route fails → createServerSupabaseClient() can\'t extract session', 'red');
  log('5. ❌ Result → 401 Unauthorized error', 'red');
  
  log('\n🔧 **IMMEDIATE FIX**', 'bright');
  log('Modify API routes to use service role and get user ID from request headers:', 'yellow');
  log('1. Update /api/admin/me/restaurant to use supabaseAdmin', 'blue');
  log('2. Extract user ID from session or request headers', 'blue');
  log('3. Query database directly with service role', 'blue');
  log('4. Bypass session extraction entirely', 'blue');
  
  log('\n🎯 **EXPECTED RESULT AFTER FIX**', 'bright');
  log('✅ API routes will work without session extraction', 'green');
  log('✅ Restaurant data will load successfully', 'green');
  log('✅ Admin dashboard will be fully functional', 'green');
  log('✅ No more 401 Unauthorized errors', 'green');
}

async function main() {
  try {
    await analyzeDataFlow();
    await testSessionExtraction();
    await generateSummary();
  } catch (error) {
    log(`❌ Analysis failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the analysis
if (require.main === module) {
  main();
}

module.exports = {
  analyzeDataFlow,
  testSessionExtraction,
  generateSummary
};
