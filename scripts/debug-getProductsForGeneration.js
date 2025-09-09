const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugGetProductsForGeneration() {
  try {
    console.log('🔍 Debugging getProductsForGeneration function...\n');

    const restaurantId = '2f370868-9665-4d38-84ad-912af03940c3';
    const testProductIds = ['471', '472', '473', '474', '475'];

    console.log('1. Testing database query directly...');
    
    // Test the exact query that getProductsForGeneration uses
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, description, generated_description, recipe, manual_language_override, ai_generated_at, has_recipe, restaurant_id')
      .in('id', testProductIds);

    console.log('Query result:', { products, error });

    if (error) {
      console.error('❌ Database query failed:', error);
      
      // Try without has_recipe column
      if (error.message && (error.message.includes('has_recipe') || error.message.includes('column'))) {
        console.log('Trying without has_recipe column...');
        const { data: productsWithoutRecipe, error: errorWithoutRecipe } = await supabase
          .from('products')
          .select('id, name, description, generated_description, recipe, manual_language_override, ai_generated_at, restaurant_id')
          .in('id', testProductIds);
        
        if (errorWithoutRecipe) {
          console.error('❌ Error even without has_recipe:', errorWithoutRecipe);
        } else {
          console.log('✅ Success without has_recipe column:', productsWithoutRecipe?.length || 0);
          productsWithoutRecipe?.forEach(p => {
            console.log(`  - ${p.name}: has_description=${!!p.generated_description}`);
          });
        }
      }
    } else {
      console.log('✅ Database query successful:', products?.length || 0);
      products?.forEach(p => {
        console.log(`  - ${p.name}: has_recipe=${p.has_recipe}, has_description=${!!p.generated_description}`);
      });
    }

    console.log('\n2. Testing processProductsForGeneration logic...');
    
    // Simulate the processProductsForGeneration logic
    if (products && products.length > 0) {
      const scenario = 'regenerate_all';
      const primaryLanguage = 'ro'; // Default
      
      console.log('Processing products with scenario:', scenario);
      console.log('Primary language:', primaryLanguage);
      
      const result = products.map(product => {
        let shouldGenerate = false;
        let reason = '';

        // Only process products that have recipes (if has_recipe column exists)
        // Skip only if explicitly set to false, allow null/undefined (default behavior)
        if (product.has_recipe === false) {
          shouldGenerate = false;
          reason = 'No recipe - skipping';
        } else {
          switch (scenario) {
            case 'new':
              // Always generate for new products with recipes
              shouldGenerate = true;
              reason = 'New product with recipe';
              break;
            case 'regenerate_all':
              // Regenerate all products with recipes, regardless of existing content
              shouldGenerate = true;
              reason = 'Regenerate all with recipe';
              break;
            case 'recipe_edited':
              // Only regenerate if recipe was edited
              shouldGenerate = true;
              reason = 'Recipe was edited';
              break;
            case 'force':
              // Force regeneration regardless of existing content
              shouldGenerate = true;
              reason = 'Force regeneration';
              break;
            default:
              shouldGenerate = false;
              reason = 'Unknown scenario';
          }
        }

        return {
          id: product.id,
          name: product.name,
          manual_language_override: product.manual_language_override,
          reason: reason,
          shouldGenerate: shouldGenerate
        };
      });

      console.log('Processed products:');
      result.forEach(p => {
        console.log(`  - ${p.name}: ${p.shouldGenerate ? 'GENERATE' : 'SKIP'} (${p.reason})`);
      });

      const productsToGenerate = result.filter(p => p.shouldGenerate);
      console.log(`\nProducts to generate: ${productsToGenerate.length}`);
    }

    console.log('\n🎯 Debug completed!');

  } catch (error) {
    console.error('❌ Error in debug:', error);
  }
}

debugGetProductsForGeneration();
