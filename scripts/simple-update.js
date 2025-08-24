const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function simpleUpdate() {
  try {
    console.log('🔄 Updating demo data...');
    
    // Add a few more products to the existing one
    const newProducts = [
      {
        restaurant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        category_id: 'c2',
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon with herbs',
        price: 28.99,
        nutrition: { calories: 350, protein: '35g', carbs: '5g', fat: '18g' }
      },
      {
        restaurant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        category_id: 'c2',
        name: 'Truffle Pasta',
        description: 'Handmade pasta with truffle oil',
        price: 24.99,
        nutrition: { calories: 480, protein: '12g', carbs: '65g', fat: '18g' }
      }
    ];
    
    for (const product of newProducts) {
      const { error } = await supabase.from('products').insert(product);
      if (error) {
        console.error('Error inserting product:', error);
      } else {
        console.log(`✅ Added ${product.name}`);
      }
    }
    
    // Check current data
    const { data: products } = await supabase
      .from('products')
      .select('name, price')
      .eq('restaurant_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
    
    console.log('\n📊 Current products:');
    products.forEach(prod => console.log(`  - ${prod.name}: $${prod.price}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

simpleUpdate();
