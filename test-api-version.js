const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiVersion() {
  console.log('🧪 Testing API version and deployment...\n');

  try {
    // First, reset the test product to null
    console.log('🔄 Resetting test product...');
    const { error: resetError } = await supabase
      .from('products')
      .update({ manual_language_override: null })
      .eq('id', '584');

    if (resetError) {
      console.error('Error resetting product:', resetError);
      return;
    }

    console.log('✅ Product reset to null');

    // Test the API call with a simple product
    console.log('\n🚀 Testing API call...');
    
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

    console.log('\n📡 API Response:');
    console.log('Status:', response.status);
    
    const result = await response.json();
    console.log('Success:', result.success);
    console.log('Results:', result.results);
    console.log('Summary:', result.summary);

    if (result.success) {
      console.log('\n✅ API call successful, checking database...');
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if manual_language_override was updated
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, manual_language_override, generated_description, ai_last_updated')
        .eq('id', '584')
        .single();

      if (productError) {
        console.error('Error fetching product:', productError);
        return;
      }

      console.log('\n📋 Product after API call:');
      console.log(`  ${productData.id}: ${productData.name}`);
      console.log(`    manual_language_override: ${productData.manual_language_override || 'null'}`);
      console.log(`    has_description: ${!!productData.generated_description}`);
      console.log(`    last_updated: ${productData.ai_last_updated || 'null'}`);

      if (productData.manual_language_override === 'ro') {
        console.log('\n✅ SUCCESS: API updated manual_language_override to "ro"');
        console.log('🎯 Our fix is working!');
      } else {
        console.log('\n❌ FAILED: API did not update manual_language_override');
        console.log('🔍 The API is not using our updated code');
      }
    } else {
      console.log('\n❌ API call failed:', result.error);
      console.log('Code:', result.code);
    }

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testApiVersion();
