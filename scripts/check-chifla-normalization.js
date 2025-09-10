/**
 * Check if chifla burger normalization actually took effect in the database
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

async function checkChiflaNormalization() {
  try {
    console.log('🔍 Checking chifla normalization in Tais Gastrobar database...\n');

    // Get the restaurant ID for Tais Gastrobar
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

    // Get all products with recipes that might contain chifla variations
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, recipe, ai_last_updated, created_at')
      .eq('restaurant_id', restaurant.id)
      .not('recipe', 'is', null);

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    if (!products || products.length === 0) {
      console.log('❌ No products with recipes found');
      return;
    }

    console.log(`🍔 Found ${products.length} products with recipes:\n`);

    // Look specifically for chifla variations
    const chiflaProducts = [];
    const chiflaVariations = new Set();

    for (const product of products) {
      if (product.recipe && Array.isArray(product.recipe)) {
        const chiflaIngredients = product.recipe.filter(ing => 
          ing.ingredient.toLowerCase().includes('chifla') || 
          ing.ingredient.toLowerCase().includes('chiflă')
        );

        if (chiflaIngredients.length > 0) {
          chiflaProducts.push({
            id: product.id,
            name: product.name,
            ingredients: chiflaIngredients,
            ai_last_updated: product.ai_last_updated,
            created_at: product.created_at
          });

          chiflaIngredients.forEach(ing => {
            chiflaVariations.add(ing.ingredient);
          });
        }
      }
    }

    console.log('🔍 CHIFLA INGREDIENT ANALYSIS:\n');

    if (chiflaProducts.length === 0) {
      console.log('❌ No products with chifla ingredients found');
      return;
    }

    console.log(`Found ${chiflaProducts.length} products with chifla ingredients:\n`);

    chiflaProducts.forEach(product => {
      console.log(`📋 ${product.name} (ID: ${product.id})`);
      console.log(`   AI Last Updated: ${product.ai_last_updated || 'Never'}`);
      console.log(`   Created: ${product.created_at || 'Never'}`);
      console.log(`   Chifla ingredients:`);
      product.ingredients.forEach(ing => {
        console.log(`     - "${ing.ingredient}" (${ing.quantity})`);
      });
      console.log('');
    });

    console.log('🔍 CHIFLA VARIATIONS FOUND:');
    Array.from(chiflaVariations).forEach(variation => {
      console.log(`   - "${variation}"`);
    });

    // Check if normalization worked
    const hasChiflaBurger = Array.from(chiflaVariations).some(v => 
      v.toLowerCase().includes('chifla burger')
    );
    const hasChifla = Array.from(chiflaVariations).some(v => 
      v.toLowerCase().includes('chiflă') && !v.toLowerCase().includes('burger')
    );

    console.log('\n🎯 NORMALIZATION STATUS:');
    if (hasChiflaBurger) {
      console.log('❌ "chifla burger" still exists - normalization did NOT work');
    } else {
      console.log('✅ "chifla burger" not found - normalization may have worked');
    }

    if (hasChifla) {
      console.log('✅ "Chiflă" found - this is the normalized version');
    } else {
      console.log('❌ "Chiflă" not found - no normalized version detected');
    }

    // Check recent updates
    const recentProducts = chiflaProducts.filter(p => 
      p.ai_last_updated && new Date(p.ai_last_updated) > new Date('2025-01-10')
    );

    if (recentProducts.length > 0) {
      console.log('\n🕒 RECENTLY UPDATED PRODUCTS:');
      recentProducts.forEach(product => {
        console.log(`   - ${product.name} (${product.ai_last_updated})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking chifla normalization:', error);
  }
}

checkChiflaNormalization();
