const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugProducts() {
  console.log('🔍 Debugging products...\n');
  
  // Check total products
  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Count Error:', countError);
    return;
  }
  
  console.log(`📊 Total products: ${count}`);
  
  // Get some sample products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, generated_description, manual_language_override')
    .limit(10);
  
  if (productsError) {
    console.error('❌ Products Error:', productsError);
    return;
  }
  
  console.log(`\n📋 Sample products (${products.length}):`);
  products.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.name} (ID: ${p.id}):`);
    console.log(`   Manual Override: ${p.manual_language_override}`);
    console.log(`   Has Description: ${!!p.generated_description}`);
    if (p.generated_description) {
      console.log(`   Description: ${p.generated_description.substring(0, 100)}...`);
    }
  });
}

debugProducts().catch(console.error);
