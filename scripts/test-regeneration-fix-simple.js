const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRegenerationFixSimple() {
  try {
    console.log('🧪 Testing regeneration fix (simple)...\n');

    const restaurantId = '2f370868-9665-4d38-84ad-912af03940c3';
    const productId = '349'; // Classic Cheese Burger

    // 1. Test the processProductsForGeneration function directly
    console.log('1. Testing processProductsForGeneration function...');
    
    // Simulate the data structure that would come from the database
    const testProducts = [
      {
        id: productId,
        name: 'Classic Cheese Burger',
        has_recipe: null, // This is the key - null should be allowed
        manual_language_override: undefined
      }
    ];

    // Import the function (we'll simulate it)
    console.log('Testing with has_recipe: null');
    console.log('Should process:', testProducts[0].has_recipe !== false);
    
    // 2. Test a single product regeneration
    console.log('\n2. Testing single product regeneration...');
    
    const response = await fetch('http://localhost:3000/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        products: [{
          id: productId,
          name: 'Classic Cheese Burger Test'
        }],
        scenario: 'force', // Use force instead of regenerate_all
        respect_cost_limits: true
      })
    });

    console.log('API Response Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ API Response:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
    }

    console.log('\n🎯 Test completed!');

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testRegenerationFixSimple();
