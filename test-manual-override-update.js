const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testManualOverrideUpdate() {
  console.log('🔍 Testing manual_language_override database updates...\n');

  try {
    // Check a few specific products that were being regenerated
    const testProductIds = ['584', '396', '351', '353', '350'];
    
    console.log('📋 Checking products before API call:');
    const { data: beforeData, error: beforeError } = await supabase
      .from('products')
      .select('id, name, manual_language_override, generated_description')
      .in('id', testProductIds);

    if (beforeError) {
      console.error('Error fetching before data:', beforeError);
      return;
    }

    beforeData.forEach(product => {
      console.log(`  ${product.id}: ${product.name}`);
      console.log(`    manual_language_override: ${product.manual_language_override || 'null'}`);
      console.log(`    has_description: ${!!product.generated_description}`);
      console.log('');
    });

    // Test the API call directly
    console.log('🚀 Testing API call with manual_language_override...');
    
    const testPayload = {
      products: [{
        id: "584",
        name: "Spicy Crispy Chicken",
        manual_language_override: "ro"
      }],
      scenario: "force"
    };

    const response = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    console.log('API Response:', result);

    if (result.success) {
      console.log('\n✅ API call successful, checking database update...');
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n📋 Checking products after API call:');
      const { data: afterData, error: afterError } = await supabase
        .from('products')
        .select('id, name, manual_language_override, generated_description')
        .in('id', testProductIds);

      if (afterError) {
        console.error('Error fetching after data:', afterError);
        return;
      }

      afterData.forEach(product => {
        console.log(`  ${product.id}: ${product.name}`);
        console.log(`    manual_language_override: ${product.manual_language_override || 'null'}`);
        console.log(`    has_description: ${!!product.generated_description}`);
        console.log('');
      });

      // Check if manual_language_override was updated
      const updatedProduct = afterData.find(p => p.id === '584');
      if (updatedProduct && updatedProduct.manual_language_override === 'ro') {
        console.log('✅ SUCCESS: manual_language_override was updated to "ro"');
      } else {
        console.log('❌ FAILED: manual_language_override was not updated');
        console.log('Expected: "ro", Got:', updatedProduct?.manual_language_override);
      }
    } else {
      console.log('❌ API call failed:', result.error);
    }

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testManualOverrideUpdate();
