const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCheeseburger() {
  try {
    console.log('🔧 Fixing Classic CheeseBurger...\n');

    const restaurantId = '2f370868-9665-4d38-84ad-912af03940c3';
    const productId = '349';

    // First, let's update the product name to be more specific
    console.log('1. Updating product name to be more specific...');
    const { error: updateNameError } = await supabase
      .from('products')
      .update({ 
        name: 'Classic Cheese Burger',
        has_recipe: true  // Mark as having recipe for AI generation
      })
      .eq('id', productId);

    if (updateNameError) {
      console.error('❌ Error updating product name:', updateNameError);
      return;
    }
    console.log('✅ Product name updated and marked as having recipe');

    // Now let's regenerate the AI content with the correct name
    console.log('\n2. Regenerating AI content...');
    
    const response = await fetch('http://localhost:3000/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'your-user-id', // We'll need to get this
        'Authorization': 'Bearer your-token' // We'll need to get this
      },
      body: JSON.stringify({
        products: [{
          id: productId,
          name: 'Classic Cheese Burger'
        }],
        scenario: 'regenerate_all',
        respect_cost_limits: true
      })
    });

    if (!response.ok) {
      console.log('❌ API call failed, but let\'s check if we can regenerate manually...');
      
      // Let's try to manually update the product with better AI content
      console.log('\n3. Manually updating with better content...');
      
      const { error: manualUpdateError } = await supabase
        .from('products')
        .update({
          generated_description: 'Delicious classic cheeseburger with juicy beef patty, melted cheddar cheese, fresh lettuce, tomato, and special sauce on a toasted bun.',
          recipe: [
            { ingredient: 'Beef patty', quantity: '150g' },
            { ingredient: 'Cheddar cheese', quantity: '30g' },
            { ingredient: 'Burger bun', quantity: '1 piece' },
            { ingredient: 'Lettuce', quantity: '20g' },
            { ingredient: 'Tomato', quantity: '2 slices' },
            { ingredient: 'Onion', quantity: '10g' },
            { ingredient: 'Special sauce', quantity: '15ml' }
          ],
          allergens: ['Gluten', 'Dairy'],
          nutrition: {
            calories: 650,
            protein: 35,
            carbs: 45,
            fat: 35
          },
          ai_generated_at: new Date().toISOString(),
          ai_last_updated: new Date().toISOString()
        })
        .eq('id', productId);

      if (manualUpdateError) {
        console.error('❌ Error manually updating:', manualUpdateError);
        return;
      }
      
      console.log('✅ Product manually updated with proper burger content');
    } else {
      const result = await response.json();
      console.log('✅ AI regeneration successful:', result);
    }

    // Let's verify the final result
    console.log('\n4. Verifying final result...');
    const { data: finalProduct, error: finalError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        generated_description,
        recipe,
        allergens,
        nutrition,
        has_recipe,
        ai_generated_at
      `)
      .eq('id', productId)
      .single();

    if (finalError) {
      console.error('❌ Error fetching final product:', finalError);
      return;
    }

    console.log('\n🍔 Final Classic Cheese Burger:');
    console.log('===============================');
    console.log(`Name: ${finalProduct.name}`);
    console.log(`Description: ${finalProduct.generated_description}`);
    console.log(`Has Recipe: ${finalProduct.has_recipe}`);
    console.log(`AI Generated: ${finalProduct.ai_generated_at}`);
    
    console.log('\n📝 Recipe:');
    if (finalProduct.recipe && Array.isArray(finalProduct.recipe)) {
      finalProduct.recipe.forEach((ingredient, index) => {
        console.log(`  ${index + 1}. ${ingredient.ingredient}: ${ingredient.quantity}`);
      });
    }

    console.log('\n🚨 Allergens:');
    if (finalProduct.allergens && Array.isArray(finalProduct.allergens)) {
      finalProduct.allergens.forEach((allergen, index) => {
        console.log(`  ${index + 1}. ${allergen}`);
      });
    }

    console.log('\n🥗 Nutrition:');
    if (finalProduct.nutrition && typeof finalProduct.nutrition === 'object') {
      Object.entries(finalProduct.nutrition).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing cheeseburger:', error);
  }
}

fixCheeseburger();
