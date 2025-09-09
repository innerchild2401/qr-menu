const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseAfterRegeneration() {
  console.log('🔍 Checking database state after regeneration...\n');

  try {
    // Check the products that were being regenerated
    const testProductIds = ['584', '396', '351', '353', '350', '372', '400', '390', '395', '379'];
    
    console.log('📋 Current state of regenerated products:');
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, manual_language_override, generated_description, ai_last_updated')
      .in('id', testProductIds)
      .order('ai_last_updated', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    console.log(`Found ${products.length} products:\n`);

    let productsWithOverride = 0;
    let productsWithoutOverride = 0;
    let recentUpdates = 0;

    products.forEach(product => {
      const hasOverride = product.manual_language_override === 'ro';
      const isRecent = product.ai_last_updated && new Date(product.ai_last_updated) > new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
      
      if (hasOverride) productsWithOverride++;
      if (!hasOverride) productsWithoutOverride++;
      if (isRecent) recentUpdates++;

      console.log(`  ${product.id}: ${product.name}`);
      console.log(`    manual_language_override: ${product.manual_language_override || 'null'} ${hasOverride ? '✅' : '❌'}`);
      console.log(`    has_description: ${!!product.generated_description}`);
      console.log(`    last_updated: ${product.ai_last_updated || 'null'} ${isRecent ? '🕐' : ''}`);
      console.log('');
    });

    console.log('📊 Summary:');
    console.log(`  Products with manual_language_override='ro': ${productsWithOverride}`);
    console.log(`  Products without manual_language_override: ${productsWithoutOverride}`);
    console.log(`  Products updated in last 5 minutes: ${recentUpdates}`);

    if (productsWithOverride > 0) {
      console.log('\n✅ SUCCESS: Some products have manual_language_override set to "ro"');
      console.log('🎯 This means our fix is working!');
    } else if (recentUpdates > 0) {
      console.log('\n❌ ISSUE: Products were recently updated but manual_language_override is still null');
      console.log('🔍 This means our fix is not working - the database update is not happening');
    } else {
      console.log('\n❓ UNCLEAR: No recent updates detected');
      console.log('🔍 The regeneration might not be calling the API or the API might be failing');
    }

  } catch (error) {
    console.error('Error in check:', error);
  }
}

checkDatabaseAfterRegeneration();
