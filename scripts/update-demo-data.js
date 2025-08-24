const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function updateDemoData() {
  try {
    console.log('🔄 Updating demo data...');
    
    const restaurantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    
    // Clear existing demo data
    console.log('🗑️ Clearing existing demo data...');
    await supabase.from('products').delete().eq('restaurant_id', restaurantId);
    await supabase.from('categories').delete().eq('restaurant_id', restaurantId);
    
    // Insert demo categories
    console.log('📂 Inserting categories...');
    const categories = [
      { id: 'c1', name: 'Appetizers' },
      { id: 'c2', name: 'Main Courses' },
      { id: 'c3', name: 'Desserts' },
      { id: 'c4', name: 'Beverages' }
    ];
    
    for (const category of categories) {
      await supabase.from('categories').insert({
        id: category.id,
        restaurant_id: restaurantId,
        name: category.name
      });
    }
    
    // Insert demo products
    console.log('🍽️ Inserting products...');
    const products = [
      {
        category_id: 'c1',
        name: 'Bruschetta',
        description: 'Toasted bread topped with tomatoes, garlic, and fresh basil',
        price: 12.99,
        nutrition: { calories: 180, protein: '4g', carbs: '25g', fat: '8g' }
      },
      {
        category_id: 'c2',
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon with herbs',
        price: 28.99,
        nutrition: { calories: 350, protein: '35g', carbs: '5g', fat: '18g' }
      },
      {
        category_id: 'c2',
        name: 'Truffle Pasta',
        description: 'Handmade pasta with truffle oil',
        price: 24.99,
        nutrition: { calories: 480, protein: '12g', carbs: '65g', fat: '18g' }
      },
      {
        category_id: 'c2',
        name: 'Wagyu Burger',
        description: 'Premium wagyu beef burger',
        price: 32.99,
        nutrition: { calories: 620, protein: '28g', carbs: '45g', fat: '35g' }
      },
      {
        category_id: 'c3',
        name: 'Chocolate Soufflé',
        description: 'Warm chocolate soufflé with vanilla ice cream',
        price: 14.99,
        nutrition: { calories: 320, protein: '6g', carbs: '45g', fat: '15g' }
      },
      {
        category_id: 'c4',
        name: 'Craft Cocktail',
        description: 'House-made cocktail with premium spirits',
        price: 16.99,
        nutrition: { calories: 180, protein: '0g', carbs: '8g', fat: '0g' }
      }
    ];
    
    for (const product of products) {
      await supabase.from('products').insert({
        restaurant_id: restaurantId,
        category_id: product.category_id,
        name: product.name,
        description: product.description,
        price: product.price,
        nutrition: product.nutrition
      });
    }
    
    console.log('✅ Demo data updated successfully!');
    
    // Verify the data
    console.log('\n📊 Verifying data...');
    const { data: categories } = await supabase
      .from('categories')
      .select('name')
      .eq('restaurant_id', restaurantId);
    
    const { data: products } = await supabase
      .from('products')
      .select('name, price')
      .eq('restaurant_id', restaurantId);
    
    console.log(`Categories: ${categories.length}`);
    categories.forEach(cat => console.log(`  - ${cat.name}`));
    
    console.log(`Products: ${products.length}`);
    products.forEach(prod => console.log(`  - ${prod.name}: $${prod.price}`));
    
  } catch (error) {
    console.error('❌ Error updating demo data:', error);
  }
}

updateDemoData();
