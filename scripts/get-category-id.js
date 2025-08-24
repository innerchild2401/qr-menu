const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function getCategoryId() {
  try {
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('restaurant_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
    
    console.log('Categories:');
    if (categories && categories.length > 0) {
      categories.forEach(cat => console.log(`  - ${cat.name}: ${cat.id}`));
      
      // Now add a product using the correct category ID
      const categoryId = categories[0].id;
    } else {
      console.log('No categories found');
      return;
    }
    
    const { error } = await supabase.from('products').insert({
      restaurant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      category_id: categoryId,
      name: 'Grilled Salmon',
      description: 'Fresh Atlantic salmon with herbs',
      price: 28.99,
      nutrition: { calories: 350, protein: '35g', carbs: '5g', fat: '18g' }
    });
    
    if (error) {
      console.error('Error inserting product:', error);
    } else {
      console.log('✅ Added Grilled Salmon');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getCategoryId();
