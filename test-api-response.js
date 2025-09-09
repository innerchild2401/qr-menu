const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test the actual API endpoint that the UI uses
async function testAPIResponse() {
  console.log('🧪 Testing API response...\n');
  
  // Test the products API endpoint
  try {
    const response = await fetch('https://qr-menu-ruby-delta.vercel.app/api/admin/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we can see the error
      }
    });
    
    const result = await response.json();
    console.log('Products API Response Status:', response.status);
    console.log('Products API Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Products API Test Error:', error.message);
  }
  
  // Test the generate-product-data API endpoint
  try {
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
    
    const response = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we can see the error
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    console.log('\nGenerate API Response Status:', response.status);
    console.log('Generate API Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Generate API Test Error:', error.message);
  }
}

testAPIResponse().catch(console.error);
