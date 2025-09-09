const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testGPTGeneration() {
  console.log('🧪 Testing GPT generation...\n');
  
  // Test the API endpoint directly
  const testPayload = {
    products: [
      {
        id: "test-123",
        name: "Classic CheeseBurger",
        manual_language_override: "ro"
      }
    ],
    scenario: "force"
  };
  
  try {
    const response = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we can see the error
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    console.log('API Response Status:', response.status);
    console.log('API Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
  
  // Check if we can access the database
  console.log('\n🔍 Checking database access...');
  const { data, error } = await supabase
    .from('products')
    .select('id, name, generated_description')
    .limit(1);
  
  if (error) {
    console.error('❌ Database Error:', error);
  } else {
    console.log('✅ Database accessible, found', data.length, 'products');
    if (data.length > 0) {
      console.log('Sample product:', data[0]);
    }
  }
}

testGPTGeneration().catch(console.error);
