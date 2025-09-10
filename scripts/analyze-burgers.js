/**
 * Analyze the two burger products in Tais Gastrobar database
 * to understand recipe differences and calorie discrepancies
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function analyzeBurgers() {
  try {
    console.log('🔍 Analyzing burger products in Tais Gastrobar...\n');

    // First, get the restaurant ID for Tais Gastrobar
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, slug')
      .ilike('name', '%tais%')
      .or('slug.eq.tais-gastrobar')
      .single();

    if (restaurantError) {
      console.error('❌ Error finding restaurant:', restaurantError);
      return;
    }

    console.log(`📍 Found restaurant: ${restaurant.name} (${restaurant.slug})`);
    console.log(`🆔 Restaurant ID: ${restaurant.id}\n`);

    // Get the two specific burger products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .or('name.ilike.%Classic Crispy CK Burger%,name.ilike.%Spicy Crispy Chicken%')
      .order('name');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    if (!products || products.length === 0) {
      console.log('❌ No burger products found');
      return;
    }

    console.log(`🍔 Found ${products.length} burger products:\n`);

    // Analyze each product
    for (const product of products) {
      console.log(`📋 Product: ${product.name}`);
      console.log(`🆔 ID: ${product.id}`);
      console.log(`💰 Price: ${product.price} RON`);
      console.log(`📝 Description: ${product.description || 'No description'}`);
      console.log(`🍽️ Has Recipe: ${product.has_recipe ? 'Yes' : 'No'}`);
      
      // Nutritional information
      if (product.nutrition) {
        console.log(`📊 Nutrition:`);
        console.log(`   Calories: ${product.nutrition.calories || 'N/A'}`);
        console.log(`   Protein: ${product.nutrition.protein || 'N/A'}g`);
        console.log(`   Carbs: ${product.nutrition.carbs || 'N/A'}g`);
        console.log(`   Fat: ${product.nutrition.fat || 'N/A'}g`);
        console.log(`   Sugars: ${product.nutrition.sugars || 'N/A'}g`);
        console.log(`   Salts: ${product.nutrition.salts || 'N/A'}g`);
      } else {
        console.log(`📊 Nutrition: No nutritional data`);
      }

      // Recipe information
      if (product.recipe && Array.isArray(product.recipe)) {
        console.log(`🥘 Recipe (${product.recipe.length} ingredients):`);
        product.recipe.forEach((ingredient, index) => {
          console.log(`   ${index + 1}. ${ingredient.ingredient}: ${ingredient.quantity}`);
        });
      } else {
        console.log(`🥘 Recipe: No recipe data`);
      }

      // AI Generated fields
      if (product.generated_description) {
        console.log(`🤖 AI Description: ${product.generated_description}`);
      }
      
      if (product.allergens && Array.isArray(product.allergens)) {
        console.log(`⚠️ Allergens: ${product.allergens.join(', ')}`);
      }

      // Timestamps
      console.log(`🕒 Created: ${product.created_at}`);
      console.log(`🔄 Last Updated: ${product.updated_at}`);
      if (product.ai_last_updated) {
        console.log(`🤖 AI Last Updated: ${product.ai_last_updated}`);
      }

      console.log('\n' + '='.repeat(80) + '\n');
    }

    // Compare the two products
    if (products.length === 2) {
      console.log('🔍 COMPARISON ANALYSIS:\n');
      
      const [product1, product2] = products;
      
      // Compare calories
      const calories1 = product1.nutrition?.calories || 0;
      const calories2 = product2.nutrition?.calories || 0;
      const calorieDiff = Math.abs(calories1 - calories2);
      
      console.log(`📊 Calorie Comparison:`);
      console.log(`   ${product1.name}: ${calories1} kcal`);
      console.log(`   ${product2.name}: ${calories2} kcal`);
      console.log(`   Difference: ${calorieDiff} kcal (${((calorieDiff / Math.max(calories1, calories2)) * 100).toFixed(1)}% difference)\n`);

      // Compare recipes
      console.log(`🥘 Recipe Comparison:`);
      console.log(`   ${product1.name} has ${product1.recipe?.length || 0} ingredients`);
      console.log(`   ${product2.name} has ${product2.recipe?.length || 0} ingredients\n`);

      // Check for common ingredients
      if (product1.recipe && product2.recipe) {
        const ingredients1 = product1.recipe.map(i => i.ingredient.toLowerCase());
        const ingredients2 = product2.recipe.map(i => i.ingredient.toLowerCase());
        
        const commonIngredients = ingredients1.filter(ing => 
          ingredients2.some(ing2 => ing2.includes(ing) || ing.includes(ing2))
        );
        
        console.log(`🔄 Common ingredients: ${commonIngredients.length}`);
        if (commonIngredients.length > 0) {
          console.log(`   ${commonIngredients.join(', ')}\n`);
        }

        // Check for unique ingredients
        const unique1 = ingredients1.filter(ing => 
          !ingredients2.some(ing2 => ing2.includes(ing) || ing.includes(ing2))
        );
        const unique2 = ingredients2.filter(ing => 
          !ingredients1.some(ing1 => ing1.includes(ing) || ing.includes(ing1))
        );

        if (unique1.length > 0) {
          console.log(`🔸 Unique to ${product1.name}: ${unique1.join(', ')}`);
        }
        if (unique2.length > 0) {
          console.log(`🔸 Unique to ${product2.name}: ${unique2.join(', ')}`);
        }
      }

      // Check if one has AI-generated data and the other doesn't
      console.log(`\n🤖 AI Generation Status:`);
      console.log(`   ${product1.name}: ${product1.generated_description ? 'AI Generated' : 'Manual'}`);
      console.log(`   ${product2.name}: ${product2.generated_description ? 'AI Generated' : 'Manual'}`);
    }

  } catch (error) {
    console.error('❌ Error analyzing burgers:', error);
  }
}

analyzeBurgers();
