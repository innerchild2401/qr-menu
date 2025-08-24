const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function addMoreProducts() {
  try {
    console.log('🔄 Adding more products...');
    
    const restaurantId = '6b0a75ae-1c2b-4361-a330-7e76b80a9d95';
    const categoryId = '1';
    
    const newProducts = [
      {
        restaurant_id: restaurantId,
        category_id: categoryId,
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon with herbs',
        price: 28.99,
        nutrition: { calories: 350, protein: '35g', carbs: '5g', fat: '18g' }
      },
      {
        restaurant_id: restaurantId,
        category_id: categoryId,
        name: 'Truffle Pasta',
        description: 'Handmade pasta with truffle oil',
        price: 24.99,
        nutrition: { calories: 480, protein: '12g', carbs: '65g', fat: '18g' }
      },
      {
        restaurant_id: restaurantId,
        category_id: categoryId,
        name: 'Wagyu Burger',
        description: 'Premium wagyu beef burger',
        price: 32.99,
        nutrition: { calories: 620, protein: '28g', carbs: '45g', fat: '35g' }
      }
    ];
    
    for (const product of newProducts) {
      const { error } = await supabase.from('products').insert(product);
      if (error) {
        console.error(`Error adding ${product.name}:`, error);
      } else {
        console.log(`✅ Added ${product.name}: $${product.price}`);
      }
    }
    
    // Check final state
    console.log('\n📊 Final products:');
    const { data: products } = await supabase
      .from('products')
      .select('name, price')
      .eq('restaurant_id', restaurantId);
    
    products?.forEach(prod => console.log(`  - ${prod.name}: $${prod.price}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addMoreProducts();
