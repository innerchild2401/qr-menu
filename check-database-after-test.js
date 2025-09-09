const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://nnhyuqhypzytnkkdifuk.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabaseAfterTest() {
  console.log('🔍 Checking database after test generation...\n');
  
  try {
    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'afilip.mme@gmail.com',
      password: 'parolamea'
    });
    
    if (authError) {
      console.error('❌ Auth Error:', authError);
      return;
    }
    
    // Check the specific product we just generated
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, generated_description, manual_language_override, ai_last_updated')
      .eq('id', 584)
      .single();
    
    if (error) {
      console.error('❌ Database Error:', error);
      return;
    }
    
    console.log('📦 Product 584 (Spicy Crispy Chicken):');
    console.log(`   Manual Override: ${product.manual_language_override}`);
    console.log(`   AI Last Updated: ${product.ai_last_updated}`);
    console.log(`   Description: ${product.generated_description}`);
    
    // Check if it's the new Romanian description
    if (product.generated_description === "Pui crocant picant, servit fierbinte și aromat.") {
      console.log('✅ Database was updated with the new Romanian description!');
    } else {
      console.log('❌ Database still has the old description');
    }
    
    // Check a few other products with manual_language_override: 'ro'
    console.log('\n🔍 Checking other products with manual_language_override: ro...');
    const { data: roProducts, error: roError } = await supabase
      .from('products')
      .select('id, name, generated_description, manual_language_override, ai_last_updated')
      .eq('manual_language_override', 'ro')
      .limit(5);
    
    if (roError) {
      console.error('❌ RO Products Error:', roError);
      return;
    }
    
    roProducts.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.name} (ID: ${p.id}):`);
      console.log(`   Manual Override: ${p.manual_language_override}`);
      console.log(`   AI Last Updated: ${p.ai_last_updated}`);
      console.log(`   Description: ${p.generated_description?.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

checkDatabaseAfterTest().catch(console.error);
