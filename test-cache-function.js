const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCacheFunction() {
  console.log('🧪 Testing cacheProductData function directly...\n');

  try {
    // Test updating a product with manual_language_override
    const testProductId = '584';
    
    console.log('📋 Before update:');
    const { data: beforeData, error: beforeError } = await supabase
      .from('products')
      .select('id, name, manual_language_override, generated_description')
      .eq('id', testProductId)
      .single();

    if (beforeError) {
      console.error('Error fetching before data:', beforeError);
      return;
    }

    console.log(`  ${beforeData.id}: ${beforeData.name}`);
    console.log(`    manual_language_override: ${beforeData.manual_language_override || 'null'}`);
    console.log(`    has_description: ${!!beforeData.generated_description}`);

    // Simulate what cacheProductData should do
    console.log('\n🔄 Simulating cacheProductData update...');
    
    const updateData = {
      generated_description: beforeData.generated_description, // Keep existing description
      manual_language_override: 'ro', // Add the override
      ai_last_updated: new Date().toISOString(),
    };

    console.log('Update data:', updateData);

    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', testProductId);

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }

    console.log('✅ Update successful!');

    // Check the result
    console.log('\n📋 After update:');
    const { data: afterData, error: afterError } = await supabase
      .from('products')
      .select('id, name, manual_language_override, generated_description')
      .eq('id', testProductId)
      .single();

    if (afterError) {
      console.error('Error fetching after data:', afterError);
      return;
    }

    console.log(`  ${afterData.id}: ${afterData.name}`);
    console.log(`    manual_language_override: ${afterData.manual_language_override || 'null'}`);
    console.log(`    has_description: ${!!afterData.generated_description}`);

    if (afterData.manual_language_override === 'ro') {
      console.log('\n✅ SUCCESS: manual_language_override was updated to "ro"');
      console.log('🎯 The database update mechanism works!');
    } else {
      console.log('\n❌ FAILED: manual_language_override was not updated');
      console.log('🔍 There might be a database constraint or permission issue');
    }

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testCacheFunction();
