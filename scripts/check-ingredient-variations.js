/**
 * Check for ingredient variations in Tais Gastrobar database
 * Look for duplicates like "chifla" vs "chifla burger" and "piept pui" vs "piept de pui"
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

async function checkIngredientVariations() {
  try {
    console.log('🔍 Checking ingredient variations in Tais Gastrobar database...\n');

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

    // Get all products with recipes
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, recipe')
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

    // Collect all ingredients
    const allIngredients = new Map();
    const ingredientVariations = new Map();

    for (const product of products) {
      if (product.recipe && Array.isArray(product.recipe)) {
        console.log(`📋 ${product.name}:`);
        
        for (const ingredient of product.recipe) {
          const ingName = ingredient.ingredient.toLowerCase().trim();
          const quantity = ingredient.quantity;
          
          console.log(`   - ${ingredient.ingredient} (${quantity})`);
          
          // Track ingredient variations
          if (allIngredients.has(ingName)) {
            const existing = allIngredients.get(ingName);
            existing.count++;
            existing.products.push(product.name);
            existing.quantities.push(quantity);
          } else {
            allIngredients.set(ingName, {
              original: ingredient.ingredient,
              count: 1,
              products: [product.name],
              quantities: [quantity]
            });
          }
        }
        console.log('');
      }
    }

    // Analyze variations
    console.log('🔍 INGREDIENT VARIATION ANALYSIS:\n');

    // Check for specific variations we're looking for
    const targetVariations = [
      ['chifla', 'chifla burger', 'chiflă', 'chiflă burger'],
      ['piept pui', 'piept de pui', 'piept de pui crispy'],
      ['brânză cheddar', 'cheddar', 'brânză cheddară'],
      ['salată', 'salată coleslaw', 'salată verde'],
      ['roșie', 'roșii', 'tomato', 'tomatoes']
    ];

    for (const variationGroup of targetVariations) {
      console.log(`🔸 Checking variations for: ${variationGroup[0]}`);
      
      const foundVariations = [];
      for (const variation of variationGroup) {
        if (allIngredients.has(variation)) {
          const data = allIngredients.get(variation);
          foundVariations.push({
            name: data.original,
            count: data.count,
            products: data.products,
            quantities: data.quantities
          });
        }
      }

      if (foundVariations.length > 1) {
        console.log(`   ⚠️  FOUND ${foundVariations.length} VARIATIONS:`);
        foundVariations.forEach(variation => {
          console.log(`      - "${variation.name}" (${variation.count} times)`);
          console.log(`        Products: ${variation.products.join(', ')}`);
          console.log(`        Quantities: ${variation.quantities.join(', ')}`);
        });
        console.log('');
      } else if (foundVariations.length === 1) {
        console.log(`   ✅ Only one variation found: "${foundVariations[0].name}"`);
        console.log('');
      } else {
        console.log(`   ❌ No variations found`);
        console.log('');
      }
    }

    // General analysis
    console.log('📊 GENERAL INGREDIENT ANALYSIS:\n');
    console.log(`Total unique ingredients: ${allIngredients.size}`);
    
    // Find ingredients that appear in multiple products
    const multiProductIngredients = Array.from(allIngredients.entries())
      .filter(([name, data]) => data.count > 1)
      .sort((a, b) => b[1].count - a[1].count);

    if (multiProductIngredients.length > 0) {
      console.log(`\n🔄 Ingredients used in multiple products:`);
      multiProductIngredients.forEach(([name, data]) => {
        console.log(`   - "${data.original}" (${data.count} products)`);
        console.log(`     Products: ${data.products.join(', ')}`);
      });
    }

    // Find potential duplicates (similar names)
    console.log(`\n🔍 POTENTIAL DUPLICATES (similar names):`);
    const ingredientNames = Array.from(allIngredients.keys());
    
    for (let i = 0; i < ingredientNames.length; i++) {
      for (let j = i + 1; j < ingredientNames.length; j++) {
        const name1 = ingredientNames[i];
        const name2 = ingredientNames[j];
        
        // Check if names are similar (one contains the other)
        if (name1.includes(name2) || name2.includes(name1)) {
          const data1 = allIngredients.get(name1);
          const data2 = allIngredients.get(name2);
          
          console.log(`   - "${data1.original}" vs "${data2.original}"`);
          console.log(`     Products: ${data1.products.join(', ')} vs ${data2.products.join(', ')}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking ingredient variations:', error);
  }
}

checkIngredientVariations();
