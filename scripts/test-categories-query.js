const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testCategoriesQuery() {
  try {
    console.log('🔧 Testing Categories Query Directly...');
    
    const restaurantId = '88eb9686-479f-474e-af86-c90a54875873';
    
    console.log('🔍 Testing categories query for restaurant:', restaurantId);
    
    // Test 1: Check if categories table exists and has data
    console.log('\n🔍 Step 1: Check categories table...');
    const { data: allCategories, error: allError } = await supabaseAdmin
      .from('categories')
      .select('*');
    
    if (allError) {
      console.error('❌ Error querying all categories:', allError);
      return;
    }
    
    console.log('📊 Total categories in database:', allCategories?.length || 0);
    if (allCategories?.length > 0) {
      console.log('📋 Sample categories:', allCategories.slice(0, 3));
    }
    
    // Test 2: Check categories for specific restaurant
    console.log('\n🔍 Step 2: Check categories for restaurant...');
    const { data: restaurantCategories, error: restaurantError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId);
    
    if (restaurantError) {
      console.error('❌ Error querying restaurant categories:', restaurantError);
      return;
    }
    
    console.log('📊 Categories for restaurant:', restaurantCategories?.length || 0);
    if (restaurantCategories?.length > 0) {
      console.log('📋 Restaurant categories:', restaurantCategories);
    }
    
    // Test 3: Test the exact query from the API
    console.log('\n🔍 Step 3: Test exact API query...');
    const { data: apiQueryCategories, error: apiQueryError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true });
    
    if (apiQueryError) {
      console.error('❌ Error in API query:', apiQueryError);
      return;
    }
    
    console.log('✅ API query successful!');
    console.log('📊 Categories found:', apiQueryCategories?.length || 0);
    if (apiQueryCategories?.length > 0) {
      console.log('📋 Categories from API query:', apiQueryCategories);
    }
    
    // Test 4: Check if there are any categories with different restaurant_id
    console.log('\n🔍 Step 4: Check for categories with different restaurant_id...');
    const { data: otherCategories, error: otherError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .neq('restaurant_id', restaurantId);
    
    if (otherError) {
      console.error('❌ Error querying other categories:', otherError);
      return;
    }
    
    console.log('📊 Categories with different restaurant_id:', otherCategories?.length || 0);
    if (otherCategories?.length > 0) {
      console.log('📋 Other categories:', otherCategories);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCategoriesQuery();
