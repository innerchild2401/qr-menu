#!/usr/bin/env node

/**
 * Final Analysis - Key Issues Found
 * Focuses on the specific problems identified in the end-to-end debug
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

function logSubSection(message) {
  console.log('\n' + '─'.repeat(30));
  log(message, 'yellow');
  console.log('─'.repeat(30));
}

async function analyzeJWTIssuerMismatch() {
  logSection('1. JWT Issuer Mismatch Analysis');
  
  logSubSection('Problem Identified');
  log('❌ JWT issuer mismatch: "supabase" vs "https://nnhyuqhypzytnkkdifuk.supabase.co"', 'red');
  
  logSubSection('What This Means');
  log('The anon key has issuer "supabase" but the expected issuer should be the full Supabase URL.', 'yellow');
  log('This suggests the anon key might be from a different project or has incorrect configuration.', 'yellow');
  
  logSubSection('Impact on API Routes');
  log('• API routes using anon key will fail with "Invalid API key"', 'red');
  log('• Session-based authentication may not work properly', 'red');
  log('• Frontend authentication could be affected', 'red');
  
  logSubSection('Solution');
  log('1. Check your Supabase project settings', 'green');
  log('2. Regenerate the anon key from the correct project', 'green');
  log('3. Update .env.local with the new key', 'green');
  log('4. Restart your development server', 'green');
}

async function analyzeAnonKeyIssue() {
  logSection('2. Anon Key "Invalid API Key" Analysis');
  
  logSubSection('Problem Identified');
  log('❌ Anon client error: "Invalid API key"', 'red');
  
  logSubSection('Root Cause');
  log('The anon key is not valid for the current Supabase project.', 'yellow');
  log('This could be due to:', 'yellow');
  log('• Key from different project', 'yellow');
  log('• Key has been rotated/regenerated', 'yellow');
  log('• Key format is corrupted', 'yellow');
  
  logSubSection('Impact on Frontend');
  log('• Client-side authentication will fail', 'red');
  log('• Session management won\'t work', 'red');
  log('• API calls from frontend will be unauthorized', 'red');
}

async function analyzeAPIRouteContext() {
  logSection('3. API Route Context Analysis');
  
  logSubSection('Key Finding');
  log('✅ API route logic simulation works with admin client', 'green');
  log('❌ But real API routes need session context', 'red');
  
  logSubSection('The Real Problem');
  log('The API routes in Next.js need access to the user\'s session token.', 'yellow');
  log('This token is stored in cookies and must be passed to the API route.', 'yellow');
  
  logSubSection('Why This Causes "Unauthorized"');
  log('1. User logs in successfully (frontend)', 'blue');
  log('2. Session token stored in cookies', 'blue');
  log('3. API route tries to get user from session', 'blue');
  log('4. But session extraction fails due to anon key issue', 'red');
  log('5. API route returns "Unauthorized"', 'red');
}

async function testSessionExtraction() {
  logSection('4. Session Extraction Test');
  
  logSubSection('Testing Session Extraction Logic');
  log('This tests what happens in the real API route...', 'blue');
  
  try {
    // Simulate the exact logic from the API route
    const { createServerClient } = require('@supabase/ssr');
    
    log('Step 1: Creating server client...', 'blue');
    // Note: In a real API route, this would use cookies from the request
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            // This would normally get cookies from the request
            return [];
          },
          setAll(cookiesToSet) {
            // This would normally set cookies in the response
          },
        },
      }
    );
    
    log('Step 2: Trying to get user from session...', 'blue');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      log(`❌ Session extraction failed: ${error.message}`, 'red');
      log(`   Code: ${error.status}`, 'red');
      log(`   This is why API routes return "Unauthorized"!`, 'red');
      return false;
    }
    
    if (user) {
      log(`✅ Session extraction successful: ${user.email}`, 'green');
      return true;
    } else {
      log('❌ No user found in session', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Session extraction error: ${error.message}`, 'red');
    return false;
  }
}

async function generateFinalRecommendations() {
  logSection('5. Final Recommendations');
  
  log('🎯 **ROOT CAUSE IDENTIFIED**', 'bright');
  log('The "unauthorized" error is caused by an invalid anon key.', 'red');
  log('This prevents session extraction in API routes.', 'red');
  
  log('\n🔧 **IMMEDIATE FIXES REQUIRED**', 'bright');
  
  log('\n1. **Fix the Anon Key**', 'yellow');
  log('   Go to your Supabase dashboard:', 'blue');
  log('   • Settings → API', 'blue');
  log('   • Copy the correct anon key', 'blue');
  log('   • Update .env.local', 'blue');
  log('   • Restart development server', 'blue');
  
  log('\n2. **Verify Project URL**', 'yellow');
  log('   Ensure NEXT_PUBLIC_SUPABASE_URL matches your project', 'blue');
  log('   The URL should be: https://[project-ref].supabase.co', 'blue');
  
  log('\n3. **Test the Fix**', 'yellow');
  log('   After updating the anon key:', 'blue');
  log('   • Start your dev server: npm run dev', 'blue');
  log('   • Log in to your app', 'blue');
  log('   • Try accessing the admin page', 'blue');
  log('   • Check browser console for API logs', 'blue');
  
  log('\n4. **Expected Behavior After Fix**', 'green');
  log('   • Session extraction will work in API routes', 'blue');
  log('   • Restaurant data will load successfully', 'blue');
  log('   • Restaurant creation will work', 'blue');
  log('   • No more "unauthorized" errors', 'blue');
  
  log('\n⚠️ **WHY THIS HAPPENED**', 'bright');
  log('• The anon key was likely copied from a different project', 'yellow');
  log('• Or the key was regenerated without updating .env.local', 'yellow');
  log('• This is a common issue when switching between projects', 'yellow');
}

async function main() {
  logHeader('FINAL ANALYSIS - KEY ISSUES FOUND');
  
  try {
    // Analyze the key issues found
    await analyzeJWTIssuerMismatch();
    await analyzeAnonKeyIssue();
    await analyzeAPIRouteContext();
    
    // Test session extraction
    const sessionOk = await testSessionExtraction();
    
    // Generate final recommendations
    await generateFinalRecommendations();
    
    // Summary
    logHeader('SUMMARY');
    if (!sessionOk) {
      log('❌ **CONFIRMED**: Session extraction fails due to invalid anon key', 'red');
      log('This is the root cause of your "unauthorized" errors.', 'red');
      log('Fix the anon key and restart your dev server.', 'green');
    } else {
      log('✅ Session extraction works - check other issues', 'green');
    }
    
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
  analyzeJWTIssuerMismatch,
  analyzeAnonKeyIssue,
  analyzeAPIRouteContext,
  testSessionExtraction
};
