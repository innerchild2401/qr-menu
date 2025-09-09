const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testForceRegeneration() {
  console.log('🧪 Testing force regeneration fix...\n');

  try {
    // First, let's check the current state
    console.log('📋 Current state before test:');
    const { data: beforeData, error: beforeError } = await supabase
      .from('products')
      .select('id, name, manual_language_override, generated_description, ai_last_updated')
      .in('id', ['584', '396', '351'])
      .limit(3);

    if (beforeError) {
      console.error('Error fetching before data:', beforeError);
      return;
    }

    beforeData.forEach(product => {
      console.log(`  ${product.id}: ${product.name}`);
      console.log(`    manual_language_override: ${product.manual_language_override || 'null'}`);
      console.log(`    has_description: ${!!product.generated_description}`);
      console.log(`    last_updated: ${product.ai_last_updated || 'null'}`);
      console.log('');
    });

    // Test the API call with force scenario
    console.log('🚀 Testing API call with force scenario...');
    
    const testPayload = {
      products: [{
        id: "584",
        name: "Spicy Crispy Chicken",
        manual_language_override: "ro"
      }],
      scenario: "force"
    };

    console.log('Request payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    console.log('\n📡 API Response:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('Results:', result.results);
    console.log('Summary:', result.summary);

    if (result.success) {
      console.log('\n✅ API call successful, checking database update...');
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('\n📋 State after API call:');
      const { data: afterData, error: afterError } = await supabase
        .from('products')
        .select('id, name, manual_language_override, generated_description, ai_last_updated')
        .in('id', ['584', '396', '351'])
        .limit(3);

      if (afterError) {
        console.error('Error fetching after data:', afterError);
        return;
      }

      afterData.forEach(product => {
        console.log(`  ${product.id}: ${product.name}`);
        console.log(`    manual_language_override: ${product.manual_language_override || 'null'}`);
        console.log(`    has_description: ${!!product.generated_description}`);
        console.log(`    last_updated: ${product.ai_last_updated || 'null'}`);
        console.log('');
      });

      // Check if manual_language_override was updated
      const updatedProduct = afterData.find(p => p.id === '584');
      if (updatedProduct && updatedProduct.manual_language_override === 'ro') {
        console.log('✅ SUCCESS: manual_language_override was updated to "ro"');
        console.log('🎯 The fix is working!');
      } else {
        console.log('❌ FAILED: manual_language_override was not updated');
        console.log('Expected: "ro", Got:', updatedProduct?.manual_language_override);
        console.log('🔍 This means our fix is not working as expected');
      }
    } else {
      console.log('❌ API call failed:', result.error);
      console.log('Code:', result.code);
    }

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testForceRegeneration();
