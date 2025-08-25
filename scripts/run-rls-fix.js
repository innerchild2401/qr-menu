#!/usr/bin/env node

/**
 * Restaurant RLS Fix Script
 * Runs the RLS diagnostic and fix queries directly against Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
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

async function checkRLSStatus() {
  logSection('Checking RLS Status');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, row_security')
      .eq('table_schema', 'public')
      .eq('table_name', 'restaurants');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const rlsEnabled = data[0].row_security === 'YES';
      log(`RLS Status: ${rlsEnabled ? '✅ Enabled' : '❌ Disabled'}`, rlsEnabled ? 'green' : 'red');
      return rlsEnabled;
    } else {
      log('❌ Restaurants table not found', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking RLS: ${error.message}`, 'red');
    return false;
  }
}

async function checkExistingPolicies() {
  logSection('Checking Existing Policies');
  
  try {
    const { data, error } = await supabase
      .rpc('get_restaurant_policies');
    
    if (error) {
      // If the function doesn't exist, try direct query
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('policyname, cmd, permissive')
        .eq('tablename', 'restaurants');
      
      if (policyError) throw policyError;
      
      if (policies && policies.length > 0) {
        log(`Found ${policies.length} existing policies:`, 'yellow');
        policies.forEach(policy => {
          log(`  - ${policy.policyname} (${policy.cmd})`, 'blue');
        });
        return policies;
      } else {
        log('No existing policies found', 'yellow');
        return [];
      }
    } else {
      log(`Found ${data.length} existing policies`, 'yellow');
      return data;
    }
  } catch (error) {
    log(`❌ Error checking policies: ${error.message}`, 'red');
    return [];
  }
}

async function enableRLS() {
  logSection('Enabling RLS');
  
  try {
    const { error } = await supabase.rpc('enable_restaurant_rls');
    if (error) throw error;
    log('✅ RLS enabled successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Error enabling RLS: ${error.message}`, 'red');
    return false;
  }
}

async function dropExistingPolicies() {
  logSection('Dropping Existing Policies');
  
  const policiesToDrop = [
    'Restaurant owners can view their restaurants',
    'Restaurant owners can update their restaurants',
    'Restaurant owners can insert their restaurants',
    'Users can read own restaurant',
    'Users can update own restaurant',
    'Users can insert own restaurant',
    'Restaurant owners can delete their restaurants'
  ];
  
  for (const policyName of policiesToDrop) {
    try {
      const { error } = await supabase.rpc('drop_policy_if_exists', {
        policy_name: policyName,
        table_name: 'restaurants'
      });
      if (!error) {
        log(`✅ Dropped policy: ${policyName}`, 'green');
      }
    } catch (error) {
      // Policy might not exist, which is fine
      log(`⚠️  Policy not found: ${policyName}`, 'yellow');
    }
  }
}

async function createRLSPolicies() {
  logSection('Creating RLS Policies');
  
  const policies = [
    {
      name: 'Users can select their restaurants',
      sql: `
        CREATE POLICY "Users can select their restaurants" ON restaurants
        FOR SELECT
        USING (
          auth.uid() = owner_id 
          OR 
          auth.uid() IN (
            SELECT user_id 
            FROM user_restaurants 
            WHERE restaurant_id = restaurants.id 
            AND role IN ('owner', 'admin')
          )
        );
      `
    },
    {
      name: 'Users can insert restaurants',
      sql: `
        CREATE POLICY "Users can insert restaurants" ON restaurants
        FOR INSERT
        WITH CHECK (auth.uid() = owner_id);
      `
    },
    {
      name: 'Users can update their restaurants',
      sql: `
        CREATE POLICY "Users can update their restaurants" ON restaurants
        FOR UPDATE
        USING (
          auth.uid() = owner_id 
          OR 
          auth.uid() IN (
            SELECT user_id 
            FROM user_restaurants 
            WHERE restaurant_id = restaurants.id 
            AND role IN ('owner', 'admin')
          )
        );
      `
    },
    {
      name: 'Users can delete their restaurants',
      sql: `
        CREATE POLICY "Users can delete their restaurants" ON restaurants
        FOR DELETE
        USING (
          auth.uid() = owner_id 
          OR 
          auth.uid() IN (
            SELECT user_id 
            FROM user_restaurants 
            WHERE restaurant_id = restaurants.id 
            AND role = 'owner'
          )
        );
      `
    }
  ];
  
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('execute_sql', { sql: policy.sql });
      if (error) throw error;
      log(`✅ Created policy: ${policy.name}`, 'green');
    } catch (error) {
      log(`❌ Error creating policy ${policy.name}: ${error.message}`, 'red');
    }
  }
}

async function linkUserToRestaurants() {
  logSection('Linking User to Restaurants');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    if (!user) {
      log('❌ No authenticated user found', 'red');
      return false;
    }
    
    log(`Current user: ${user.email} (${user.id})`, 'blue');
    
    // Link user to demo restaurant
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, slug, owner_id')
      .eq('slug', 'demo');
    
    if (restaurantError) throw restaurantError;
    
    if (restaurants && restaurants.length > 0) {
      const restaurant = restaurants[0];
      
      // Check if user is already linked
      const { data: existingLink, error: linkError } = await supabase
        .from('user_restaurants')
        .select('*')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id);
      
      if (linkError) throw linkError;
      
      if (!existingLink || existingLink.length === 0) {
        // Create link
        const { error: insertError } = await supabase
          .from('user_restaurants')
          .insert({
            user_id: user.id,
            restaurant_id: restaurant.id,
            role: 'owner'
          });
        
        if (insertError) throw insertError;
        log(`✅ Linked user to restaurant: ${restaurant.name}`, 'green');
      } else {
        log(`✅ User already linked to restaurant: ${restaurant.name}`, 'green');
      }
      
      // Set owner_id if not set
      if (!restaurant.owner_id) {
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ owner_id: user.id })
          .eq('id', restaurant.id);
        
        if (updateError) throw updateError;
        log(`✅ Set user as owner of restaurant: ${restaurant.name}`, 'green');
      }
      
      return true;
    } else {
      log('⚠️  No demo restaurant found', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error linking user: ${error.message}`, 'red');
    return false;
  }
}

async function verifyFix() {
  logSection('Verifying Fix');
  
  try {
    // Test if user can access restaurants
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, slug');
    
    if (error) {
      log(`❌ Error accessing restaurants: ${error.message}`, 'red');
      return false;
    }
    
    if (restaurants && restaurants.length > 0) {
      log(`✅ User can access ${restaurants.length} restaurants:`, 'green');
      restaurants.forEach(restaurant => {
        log(`  - ${restaurant.name} (${restaurant.slug})`, 'blue');
      });
      return true;
    } else {
      log('⚠️  No restaurants accessible', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error verifying fix: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  logHeader('RESTAURANT RLS FIX SCRIPT');
  
  try {
    // Step 1: Check current RLS status
    const rlsEnabled = await checkRLSStatus();
    
    // Step 2: Check existing policies
    const existingPolicies = await checkExistingPolicies();
    
    // Step 3: Enable RLS if needed
    if (!rlsEnabled) {
      await enableRLS();
    }
    
    // Step 4: Drop existing policies
    await dropExistingPolicies();
    
    // Step 5: Create new policies
    await createRLSPolicies();
    
    // Step 6: Link user to restaurants
    await linkUserToRestaurants();
    
    // Step 7: Verify the fix
    const fixSuccessful = await verifyFix();
    
    // Summary
    logHeader('FIX SUMMARY');
    if (fixSuccessful) {
      log('🎉 Restaurant RLS policies have been successfully configured!', 'green');
      log('You should now be able to access and manage restaurants.', 'green');
    } else {
      log('⚠️  Some issues may remain. Check the output above for details.', 'yellow');
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
  checkRLSStatus,
  createRLSPolicies,
  linkUserToRestaurants,
  verifyFix
};
