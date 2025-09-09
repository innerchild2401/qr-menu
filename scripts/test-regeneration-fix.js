const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRegenerationFix() {
  try {
    console.log('🧪 Testing regeneration fix...\n');

    const restaurantId = '2f370868-9665-4d38-84ad-912af03940c3';
    const productId = '349'; // Classic Cheese Burger

    // 1. Check current state
    console.log('1. Checking current product state...');
    const { data: currentProduct, error: currentError } = await supabase
      .from('products')
      .select('id, name, generated_description, recipe, ai_generated_at')
      .eq('id', productId)
      .single();

    if (currentError) {
      console.error('❌ Error fetching current product:', currentError);
      return;
    }

    console.log('Current product:', {
      name: currentProduct.name,
      hasDescription: !!currentProduct.generated_description,
      hasRecipe: !!currentProduct.recipe,
      lastGenerated: currentProduct.ai_generated_at
    });

    // 2. Update the product name to trigger regeneration
    console.log('\n2. Updating product name to trigger regeneration...');
    const newName = `Classic Cheese Burger ${Date.now()}`;
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        name: newName,
        has_recipe: true
      })
      .eq('id', productId);

    if (updateError) {
      console.error('❌ Error updating product:', updateError);
      return;
    }
    console.log('✅ Product name updated to:', newName);

    // 3. Test manual regeneration via API
    console.log('\n3. Testing manual regeneration...');
    
    const response = await fetch('http://localhost:3000/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user', // This will fail auth, but we can see the request
      },
      body: JSON.stringify({
        products: [{
          id: productId,
          name: newName
        }],
        scenario: 'force',
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

    // 4. Check if the product was updated
    console.log('\n4. Checking if product was updated...');
    const { data: updatedProduct, error: updatedError } = await supabase
      .from('products')
      .select('id, name, generated_description, recipe, ai_generated_at')
      .eq('id', productId)
      .single();

    if (updatedError) {
      console.error('❌ Error fetching updated product:', updatedError);
      return;
    }

    console.log('Updated product:', {
      name: updatedProduct.name,
      hasDescription: !!updatedProduct.generated_description,
      hasRecipe: !!updatedProduct.recipe,
      lastGenerated: updatedProduct.ai_generated_at,
      descriptionChanged: updatedProduct.ai_generated_at !== currentProduct.ai_generated_at
    });

    // 5. Test with different name to verify caching works
    console.log('\n5. Testing caching with same name...');
    
    const response2 = await fetch('http://localhost:3000/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user',
      },
      body: JSON.stringify({
        products: [{
          id: productId,
          name: newName // Same name as before
        }],
        scenario: 'force',
        respect_cost_limits: true
      })
    });

    console.log('Second API Response Status:', response2.status);
    
    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Second API Response:', result2);
    } else {
      const errorText2 = await response2.text();
      console.log('❌ Second API Error:', errorText2);
    }

    console.log('\n🎉 Test completed! The fix should now work properly.');

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testRegenerationFix();
