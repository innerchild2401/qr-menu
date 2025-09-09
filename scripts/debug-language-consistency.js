const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugLanguageConsistency() {
  try {
    console.log('🔍 Debugging language consistency regeneration...\n');

    const restaurantId = '2f370868-9665-4d38-84ad-912af03940c3';

    // 1. Find products with different language descriptions
    console.log('1. Finding products with different language descriptions...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, generated_description, has_recipe')
      .eq('restaurant_id', restaurantId)
      .not('generated_description', 'is', null)
      .limit(10);

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    console.log(`Found ${products.length} products with descriptions:`);
    products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name}: "${product.generated_description?.substring(0, 50)}..." (has_recipe: ${product.has_recipe})`);
    });

    // 2. Test the getProductsForGeneration function with a few products
    console.log('\n2. Testing getProductsForGeneration function...');
    const testProductIds = products.slice(0, 3).map(p => p.id);
    console.log('Testing with product IDs:', testProductIds);

    // Simulate what the API does
    const { data: testProducts, error: testError } = await supabase
      .from('products')
      .select('id, name, description, generated_description, recipe, manual_language_override, ai_generated_at, has_recipe, restaurant_id')
      .in('id', testProductIds);

    if (testError) {
      console.error('❌ Error in test query:', testError);
      
      // Try without has_recipe column
      if (testError.message && (testError.message.includes('has_recipe') || testError.message.includes('column'))) {
        console.log('Trying without has_recipe column...');
        const { data: testProductsWithoutRecipe, error: testErrorWithoutRecipe } = await supabase
          .from('products')
          .select('id, name, description, generated_description, recipe, manual_language_override, ai_generated_at, restaurant_id')
          .in('id', testProductIds);
        
        if (testErrorWithoutRecipe) {
          console.error('❌ Error even without has_recipe:', testErrorWithoutRecipe);
        } else {
          console.log('✅ Success without has_recipe column:', testProductsWithoutRecipe?.length || 0);
        }
      }
    } else {
      console.log('✅ Test query successful:', testProducts?.length || 0);
      testProducts?.forEach(p => {
        console.log(`  - ${p.name}: has_recipe=${p.has_recipe}, has_description=${!!p.generated_description}`);
      });
    }

    // 3. Test a simple API call
    console.log('\n3. Testing simple API call...');
    
    const response = await fetch('http://localhost:3000/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token', // This will fail auth, but we can see the request
      },
      body: JSON.stringify({
        products: testProductIds.map(id => ({
          id: id,
          name: products.find(p => p.id === id)?.name || 'Test Product'
        })),
        scenario: 'regenerate_all',
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

    console.log('\n🎯 Debug completed!');

  } catch (error) {
    console.error('❌ Error in debug:', error);
  }
}

debugLanguageConsistency();
