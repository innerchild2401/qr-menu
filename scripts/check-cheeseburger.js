const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCheeseburger() {
  try {
    console.log('🔍 Checking classic cheeseburger for Tais Gastrobar...\n');

    // First, find the restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, slug')
      .ilike('name', '%tais%')
      .single();

    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant not found:', restaurantError);
      return;
    }

    console.log('✅ Found restaurant:', {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug
    });

    // Find the classic cheeseburger product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        generated_description,
        recipe,
        allergens,
        nutrition,
        manual_language_override,
        ai_generated_at,
        ai_last_updated,
        has_recipe,
        created_at
      `)
      .eq('restaurant_id', restaurant.id)
      .eq('id', '349')
      .single();

    if (productError || !product) {
      console.error('❌ Product not found:', productError);
      
      // Let's search for any cheeseburger products
      const { data: allProducts, error: allProductsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('restaurant_id', restaurant.id)
        .or('name.ilike.%cheese%,name.ilike.%burger%');

      if (allProductsError) {
        console.error('❌ Error searching products:', allProductsError);
      } else {
        console.log('📋 Available products with "cheese" or "burger":');
        allProducts?.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
      }
      return;
    }

    console.log('\n🍔 Classic Cheeseburger Product Details:');
    console.log('=====================================');
    console.log(`ID: ${product.id}`);
    console.log(`Name: ${product.name}`);
    console.log(`Description: ${product.description || 'None'}`);
    console.log(`Generated Description: ${product.generated_description || 'None'}`);
    console.log(`Has Recipe: ${product.has_recipe}`);
    console.log(`Manual Language Override: ${product.manual_language_override || 'None'}`);
    console.log(`AI Generated At: ${product.ai_generated_at || 'Never'}`);
    console.log(`AI Last Updated: ${product.ai_last_updated || 'Never'}`);
    console.log(`Created: ${product.created_at}`);
    console.log(`Updated: Not available (no updated_at column)`);

    console.log('\n📝 Recipe:');
    if (product.recipe && Array.isArray(product.recipe)) {
      product.recipe.forEach((ingredient, index) => {
        console.log(`  ${index + 1}. ${ingredient.ingredient}: ${ingredient.quantity}`);
      });
    } else {
      console.log('  No recipe found');
    }

    console.log('\n🚨 Allergens:');
    if (product.allergens && Array.isArray(product.allergens)) {
      product.allergens.forEach((allergen, index) => {
        console.log(`  ${index + 1}. ${allergen}`);
      });
    } else {
      console.log('  No allergens listed');
    }

    console.log('\n🥗 Nutrition:');
    if (product.nutrition && typeof product.nutrition === 'object') {
      Object.entries(product.nutrition).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log('  No nutrition data');
    }

    // Check if there are any recent AI generation logs
    console.log('\n🤖 Recent AI Generation Activity:');
    const { data: logs, error: logsError } = await supabase
      .from('gpt_usage_logs')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.log('  No generation logs found or error:', logsError.message);
    } else if (logs && logs.length > 0) {
      logs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.created_at}: ${log.tokens_used} tokens, $${log.estimated_cost_usd}`);
      });
    } else {
      console.log('  No recent generation activity');
    }

  } catch (error) {
    console.error('❌ Error checking cheeseburger:', error);
  }
}

checkCheeseburger();
