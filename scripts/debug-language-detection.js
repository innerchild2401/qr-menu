const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import the language detection function
const { getEffectiveLanguage } = require('./src/lib/ai/language-detector');

async function debugLanguageDetection() {
  try {
    console.log('🔍 Debugging language detection in getProductsForGeneration...\n');

    const restaurantId = '2f370868-9665-4d38-84ad-912af03940c3';
    const testProductIds = ['471', '472', '473', '474', '475'];

    console.log('1. Testing database query...');
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, description, generated_description, recipe, manual_language_override, ai_generated_at, has_recipe, restaurant_id')
      .in('id', testProductIds);

    if (error) {
      console.error('❌ Database query failed:', error);
      return;
    }

    console.log('✅ Database query successful:', products?.length || 0);

    console.log('\n2. Testing language detection...');
    
    if (products && products.length > 0) {
      const sampleNames = products.slice(0, 5).map(p => p.name);
      console.log('Sample names:', sampleNames);
      
      try {
        const languageResult = getEffectiveLanguage(sampleNames.join(' '));
        console.log('Language detection result:', languageResult);
      } catch (error) {
        console.error('❌ Language detection failed:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }

    console.log('\n3. Testing processProductsForGeneration...');
    
    try {
      // Import the function
      const { processProductsForGeneration } = require('./src/lib/ai/product-generator');
      
      const scenario = 'regenerate_all';
      const primaryLanguage = 'ro';
      
      const result = processProductsForGeneration(products, scenario, primaryLanguage);
      console.log('processProductsForGeneration result:', result);
      
    } catch (error) {
      console.error('❌ processProductsForGeneration failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    console.log('\n🎯 Debug completed!');

  } catch (error) {
    console.error('❌ Error in debug:', error);
  }
}

debugLanguageDetection();
