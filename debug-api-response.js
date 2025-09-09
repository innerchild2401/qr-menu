const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugApiResponse() {
  console.log('🔍 Debugging API response and database state...\n');

  try {
    // Check current state
    console.log('📋 Current state:');
    const { data: beforeData, error: beforeError } = await supabase
      .from('products')
      .select('id, name, manual_language_override, generated_description, ai_last_updated')
      .in('id', ['584', '396', '351'])
      .limit(3);

    if (beforeError) {
      console.error('Error fetching data:', beforeError);
      return;
    }

    beforeData.forEach(product => {
      console.log(`  ${product.id}: ${product.name}`);
      console.log(`    manual_language_override: ${product.manual_language_override || 'null'}`);
      console.log(`    last_updated: ${product.ai_last_updated || 'null'}`);
      console.log('');
    });

    // The issue is clear now:
    console.log('🔍 ANALYSIS:');
    console.log('1. Products are being "regenerated successfully" in the UI');
    console.log('2. But manual_language_override is still null in the database');
    console.log('3. This means the API calls are not actually updating the database');
    console.log('4. Our debugging logs are not appearing, suggesting deployment issues');
    
    console.log('\n🎯 POSSIBLE CAUSES:');
    console.log('1. API calls are failing silently');
    console.log('2. API calls are succeeding but not updating the database');
    console.log('3. There is a caching issue preventing our code from being deployed');
    console.log('4. The API route is not using our updated code');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Check if there are any API errors in the network tab');
    console.log('2. Verify the deployment is actually using our updated code');
    console.log('3. Check if there are any TypeScript compilation errors');
    console.log('4. Consider a different approach to fix this issue');

  } catch (error) {
    console.error('Error in debug:', error);
  }
}

debugApiResponse();
