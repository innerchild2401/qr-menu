const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRealDescriptions() {
  console.log('🔍 Checking actual product descriptions in database...\n');
  
  // Get products with descriptions
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, generated_description, manual_language_override, ai_last_updated')
    .not('generated_description', 'is', null)
    .not('generated_description', 'eq', '')
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📋 Found ${products.length} products with descriptions:\n`);
  
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (ID: ${p.id}):`);
    console.log(`   Manual Override: ${p.manual_language_override}`);
    console.log(`   AI Last Updated: ${p.ai_last_updated}`);
    console.log(`   Description: ${p.generated_description}`);
    console.log('');
  });
  
  // Check if descriptions look like hardcoded ones
  const hardcodedPatterns = [
    'Delicios preparat tradițional românesc',
    'Gustos preparat cu ingrediente proaspete',
    'Preparat autentic, gătit cu pasiune',
    'Delicious traditional preparation',
    'Tasty dish with fresh ingredients',
    'Authentic preparation, cooked with passion'
  ];
  
  console.log('🔍 Checking for hardcoded patterns:');
  products.forEach(p => {
    const desc = p.generated_description || '';
    const hasHardcoded = hardcodedPatterns.some(pattern => desc.includes(pattern));
    if (hasHardcoded) {
      console.log(`❌ ${p.name}: Contains hardcoded pattern`);
    } else {
      console.log(`✅ ${p.name}: Appears to be AI-generated`);
    }
  });
}

checkRealDescriptions().catch(console.error);
