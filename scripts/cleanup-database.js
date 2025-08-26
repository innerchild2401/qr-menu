const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function cleanupDatabase() {
  try {
    console.log('🔄 Starting database cleanup...');

    // 1. Delete all existing data
    console.log('🗑️  Deleting all existing data...');
    
    // Delete products first (foreign key constraint)
    const { error: productsDeleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', 0); // Delete all products
    
    if (productsDeleteError) {
      console.error('Error deleting products:', productsDeleteError);
    } else {
      console.log('✅ Products deleted');
    }

    // Delete categories
    const { error: categoriesDeleteError } = await supabase
      .from('categories')
      .delete()
      .neq('id', 0); // Delete all categories
    
    if (categoriesDeleteError) {
      console.error('Error deleting categories:', categoriesDeleteError);
    } else {
      console.log('✅ Categories deleted');
    }

    // Delete restaurants
    const { error: restaurantsError } = await supabase
      .from('restaurants')
      .delete()
      .neq('id', 0); // Delete all restaurants
    
    if (restaurantsError) {
      console.error('Error deleting restaurants:', restaurantsError);
    } else {
      console.log('✅ Restaurants deleted');
    }

    // 2. Create demo restaurant
    console.log('🏪 Creating demo restaurant...');
    
    const demoRestaurant = {
      name: 'Demo Restaurant',
      slug: 'demo',
      address: '123 Demo Street, Demo City, DC 12345',
      schedule: {
        monday: '9:00 AM - 10:00 PM',
        tuesday: '9:00 AM - 10:00 PM',
        wednesday: '9:00 AM - 10:00 PM',
        thursday: '9:00 AM - 10:00 PM',
        friday: '9:00 AM - 11:00 PM',
        saturday: '10:00 AM - 11:00 PM',
        sunday: '10:00 AM - 9:00 PM'
      }
    };

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert(demoRestaurant)
      .select()
      .single();

    if (restaurantError) {
      console.error('Error creating demo restaurant:', restaurantError);
      return;
    }

    console.log('✅ Demo restaurant created:', restaurant.id);

    // 3. Create demo categories
    console.log('📂 Creating demo categories...');
    
    const demoCategories = [
      { name: 'Appetizers', sort_order: 1 },
      { name: 'Main Courses', sort_order: 2 },
      { name: 'Desserts', sort_order: 3 },
      { name: 'Beverages', sort_order: 4 }
    ];

    const categoriesWithRestaurantId = demoCategories.map(category => ({
      ...category,
      restaurant_id: restaurant.id
    }));

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .insert(categoriesWithRestaurantId)
      .select();

    if (categoriesError) {
      console.error('Error creating demo categories:', categoriesError);
      return;
    }

    console.log('✅ Demo categories created:', categories.length);

    // 4. Create demo products
    console.log('🍽️  Creating demo products...');
    
    const demoProducts = [
      {
        name: 'Bruschetta',
        description: 'Toasted bread topped with fresh tomatoes, basil, and garlic',
        price: 8.99,
        category_id: categories[0].id, // Appetizers
        available: true,
        sort_order: 1
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan',
        price: 12.99,
        category_id: categories[0].id, // Appetizers
        available: true,
        sort_order: 2
      },
      {
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon grilled to perfection with seasonal vegetables',
        price: 24.99,
        category_id: categories[1].id, // Main Courses
        available: true,
        sort_order: 1
      },
      {
        name: 'Beef Tenderloin',
        description: 'Premium cut beef tenderloin with red wine reduction sauce',
        price: 32.99,
        category_id: categories[1].id, // Main Courses
        available: true,
        sort_order: 2
      },
      {
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
        price: 9.99,
        category_id: categories[2].id, // Desserts
        available: true,
        sort_order: 1
      },
      {
        name: 'Tiramisu',
        description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
        price: 8.99,
        category_id: categories[2].id, // Desserts
        available: true,
        sort_order: 2
      },
      {
        name: 'Fresh Lemonade',
        description: 'Homemade lemonade with fresh lemons and a hint of mint',
        price: 4.99,
        category_id: categories[3].id, // Beverages
        available: true,
        sort_order: 1
      },
      {
        name: 'Espresso',
        description: 'Single shot of premium Italian espresso',
        price: 3.99,
        category_id: categories[3].id, // Beverages
        available: true,
        sort_order: 2
      }
    ];

    const productsWithRestaurantId = demoProducts.map(product => ({
      ...product,
      restaurant_id: restaurant.id
    }));

    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert(productsWithRestaurantId)
      .select();

    if (productsError) {
      console.error('Error creating demo products:', productsError);
      return;
    }

    console.log('✅ Demo products created:', products.length);

    console.log('🎉 Database cleanup completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - 1 restaurant (demo)`);
    console.log(`   - ${categories.length} categories`);
    console.log(`   - ${products.length} products`);
    console.log('🌐 Demo menu available at: /menu/demo');

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  }
}

// Run the cleanup
cleanupDatabase();
