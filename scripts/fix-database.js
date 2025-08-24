const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixDatabase() {
  try {
    console.log('🔍 Checking database state...');
    
    // Check restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', 'demo')
      .maybeSingle();
    
    if (!restaurant) {
      console.log('❌ Restaurant not found');
      return;
    }
    
    console.log('✅ Restaurant found:', restaurant.name);
    console.log('Restaurant ID:', restaurant.id);
    
    // Check categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id);
    
    console.log(`📂 Found ${categories?.length || 0} categories`);
    if (categories && categories.length > 0) {
      categories.forEach(cat => console.log(`  - ${cat.name} (${cat.id})`));
    }
    
    // Check products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurant.id);
    
    console.log(`🍽️ Found ${products?.length || 0} products`);
    if (products && products.length > 0) {
      products.forEach(prod => console.log(`  - ${prod.name}: $${prod.price} (category: ${prod.category_id})`));
    }
    
    // If no categories, create them
    if (!categories || categories.length === 0) {
      console.log('📂 Creating categories...');
      const categoryData = [
        { name: 'Appetizers' },
        { name: 'Main Courses' },
        { name: 'Desserts' },
        { name: 'Beverages' }
      ];
      
      for (const cat of categoryData) {
        const { data: newCat, error } = await supabase
          .from('categories')
          .insert({
            restaurant_id: restaurant.id,
            name: cat.name
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating category:', error);
        } else {
          console.log(`✅ Created category: ${newCat.name} (${newCat.id})`);
        }
      }
    }
    
    // Get updated categories
    const { data: updatedCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id);
    
    if (updatedCategories && updatedCategories.length > 0) {
      const mainCourseCategory = updatedCategories.find(cat => cat.name === 'Main Courses');
      
      if (mainCourseCategory) {
        // Add a test product
        const { error } = await supabase.from('products').insert({
          restaurant_id: restaurant.id,
          category_id: mainCourseCategory.id,
          name: 'Grilled Salmon',
          description: 'Fresh Atlantic salmon with herbs',
          price: 28.99,
          nutrition: { calories: 350, protein: '35g', carbs: '5g', fat: '18g' }
        });
        
        if (error) {
          console.error('Error adding product:', error);
        } else {
          console.log('✅ Added Grilled Salmon product');
        }
      }
    }
    
    // Final check
    console.log('\n📊 Final database state:');
    const { data: finalProducts } = await supabase
      .from('products')
      .select('name, price, category_id')
      .eq('restaurant_id', restaurant.id);
    
    finalProducts?.forEach(prod => console.log(`  - ${prod.name}: $${prod.price}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixDatabase();
