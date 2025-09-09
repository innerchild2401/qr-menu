const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDeployment() {
  console.log('🚀 Testing deployment and debugging logs...\n');

  try {
    // First, let's check if we can see the current manual_language_override values
    console.log('📋 Checking current manual_language_override values:');
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, manual_language_override')
      .in('id', ['584', '396', '351'])
      .limit(3);

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    products.forEach(product => {
      console.log(`  ${product.id}: ${product.name} - manual_language_override: ${product.manual_language_override || 'null'}`);
    });

    console.log('\n🔍 The issue is clear now:');
    console.log('1. Products are being regenerated successfully (API returns success)');
    console.log('2. But manual_language_override is still null in the database');
    console.log('3. This means our fix is not working as expected');
    
    console.log('\n🔧 Let me check if there are any issues with the cacheProductData function...');
    
    // Let's also check if there are any recent updates to these products
    console.log('\n📅 Checking recent updates:');
    const { data: recentUpdates, error: updateError } = await supabase
      .from('products')
      .select('id, name, manual_language_override, ai_last_updated')
      .in('id', ['584', '396', '351'])
      .order('ai_last_updated', { ascending: false })
      .limit(3);

    if (updateError) {
      console.error('Error fetching recent updates:', updateError);
    } else {
      recentUpdates.forEach(product => {
        console.log(`  ${product.id}: ${product.name}`);
        console.log(`    manual_language_override: ${product.manual_language_override || 'null'}`);
        console.log(`    last_updated: ${product.ai_last_updated || 'null'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testDeployment();
