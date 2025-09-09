const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDescriptions() {
  console.log('🔍 Checking product descriptions...\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, generated_description, manual_language_override')
    .in('id', ['350', '351', '353', '396'])
    .limit(4);

  if (error) {
    console.error('Error:', error);
    return;
  }

  products.forEach(product => {
    console.log(`${product.id}: ${product.name}`);
    console.log(`  manual_language_override: ${product.manual_language_override}`);
    console.log(`  description: ${product.generated_description?.substring(0, 100)}...`);
    console.log('');
  });
}

checkDescriptions();
