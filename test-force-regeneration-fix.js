/**
 * Test script to verify force regeneration fix
 * This script tests that force regeneration bypasses cache and makes API calls
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testForceRegenerationFix() {
  console.log('🧪 Testing force regeneration fix...\n');

  try {
    // First, let's check the current state of a test product
    console.log('📋 Current state before test:');
    const { data: beforeData, error: beforeError } = await supabase
      .from('products')
      .select('id, name, manual_language_override, generated_description, ai_last_updated')
      .eq('id', '584') // Using a known product ID
      .single();

    if (beforeError) {
      console.error('Error fetching before data:', beforeError);
      return;
    }

    console.log(`  Product: ${beforeData.name}`);
    console.log(`  manual_language_override: ${beforeData.manual_language_override || 'null'}`);
    console.log(`  has_description: ${!!beforeData.generated_description}`);
    console.log(`  last_updated: ${beforeData.ai_last_updated || 'null'}`);
    console.log('');

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
        'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}` // You'll need to set this
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ API call successful!');
      
      // Check if the product was actually regenerated
      console.log('\n📋 Checking if product was regenerated...');
      const { data: afterData, error: afterError } = await supabase
        .from('products')
        .select('id, name, manual_language_override, generated_description, ai_last_updated')
        .eq('id', '584')
        .single();

      if (afterError) {
        console.error('Error fetching after data:', afterError);
        return;
      }

      console.log(`  Product: ${afterData.name}`);
      console.log(`  manual_language_override: ${afterData.manual_language_override || 'null'}`);
      console.log(`  has_description: ${!!afterData.generated_description}`);
      console.log(`  last_updated: ${afterData.ai_last_updated || 'null'}`);

      // Check if the timestamp changed (indicating regeneration)
      const beforeTime = beforeData.ai_last_updated ? new Date(beforeData.ai_last_updated) : null;
      const afterTime = afterData.ai_last_updated ? new Date(afterData.ai_last_updated) : null;
      
      if (beforeTime && afterTime && afterTime > beforeTime) {
        console.log('✅ SUCCESS: Product was regenerated (timestamp updated)');
      } else if (!beforeTime && afterTime) {
        console.log('✅ SUCCESS: Product was generated for the first time');
      } else {
        console.log('❌ FAILURE: Product was not regenerated (timestamp unchanged)');
      }
    } else {
      console.log('❌ API call failed');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testForceRegenerationFix();
