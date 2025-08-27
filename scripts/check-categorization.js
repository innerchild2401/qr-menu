const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCategorization() {
  console.log('🔍 Checking menu item categorization...\n');

  try {
    // Sign in first
    console.log('🔐 Signing in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'eu@eu.com',
      password: 'parolamea'
    });

    if (signInError) {
      console.error('❌ Sign in error:', signInError);
      return;
    }

    console.log('✅ Signed in successfully');

    // Get the demo restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('name', 'myprecious')
      .single();

    if (restaurantError) {
      console.error('❌ Failed to get restaurant:', restaurantError);
      return;
    }

    console.log(`🏪 Restaurant: ${restaurant.name} (ID: ${restaurant.id})\n`);

    // Get all categories for this restaurant
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('name');

    if (categoriesError) {
      console.error('❌ Failed to get categories:', categoriesError);
      return;
    }

    console.log('📂 Categories created:');
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.id})`);
    });
    console.log('');

    // Get all products with their categories
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        categories!inner(name)
      `)
      .eq('restaurant_id', restaurant.id)
      .order('name');

    if (productsError) {
      console.error('❌ Failed to get products:', productsError);
      return;
    }

    console.log('🍽️  Product categorization:');
    
    // Group products by category
    const categoryGroups = {};
    products.forEach(product => {
      const categoryName = product.categories.name;
      if (!categoryGroups[categoryName]) {
        categoryGroups[categoryName] = [];
      }
      categoryGroups[categoryName].push(product);
    });

    // Display products by category
    Object.keys(categoryGroups).forEach(category => {
      console.log(`\n📁 ${category} (${categoryGroups[category].length} items):`);
      categoryGroups[category].forEach(product => {
        console.log(`   • ${product.name} - ${product.price} RON`);
      });
    });

    // Expected categorization from CSV
    const expectedCategorization = {
      'Starters / Appetizers': [
        'Bruschetta al Pomodoro', 'Carpaccio di Manzo', 'Mozzarella Caprese',
        'Crispy Calamari', 'Wild Mushroom Arancini', 'Prosciutto e Melone',
        'Tuna Tartare', 'Burrata Salad'
      ],
      'Main Dishes': [
        'Grilled Salmon Teriyaki', 'Beef Tenderloin Medallions', 'Lobster Linguine',
        'Chicken Marsala', 'Vegetarian Risotto', 'Duck Confit', 'Seafood Paella',
        'Lamb Rack', 'Truffle Pasta', 'Grilled Sea Bass', 'Wagyu Burger'
      ],
      'Desserts': [
        'Tiramisu Classico', 'Chocolate Lava Cake', 'Crème Brûlée',
        'Apple Tarte Tatin', 'Panna Cotta'
      ],
      'Soft Drinks': [
        'Fresh Orange Juice', 'Virgin Mojito', 'Berry Smoothie', 'Lemonade',
        'Iced Tea', 'Coconut Water', 'Green Detox Juice'
      ],
      'Wines': [
        'Château Margaux 2015', 'Dom Pérignon 2012', 'Barolo Riserva 2016',
        'Sancerre Blanc 2022', 'Pinot Noir Reserve 2020'
      ],
      'Spirits & Cocktails': [
        'Classic Martini', 'Old Fashioned', 'Negroni', 'Whiskey Sour',
        'Espresso Martini'
      ],
      'Beers': [
        'Craft IPA', 'Belgian Wheat', 'Stout Porter', 'Pilsner Lager'
      ]
    };

    console.log('\n' + '='.repeat(60));
    console.log('🔍 CATEGORIZATION ANALYSIS');
    console.log('='.repeat(60));

    // Check for mismatches
    let totalMismatches = 0;
    Object.keys(expectedCategorization).forEach(expectedCategory => {
      const expectedItems = expectedCategorization[expectedCategory];
      const actualItems = categoryGroups[expectedCategory] || [];
      
      const actualItemNames = actualItems.map(item => item.name);
      const mismatches = expectedItems.filter(item => !actualItemNames.includes(item));
      
      if (mismatches.length > 0) {
        console.log(`\n❌ MISMATCH in "${expectedCategory}":`);
        console.log(`   Expected: ${expectedItems.length} items`);
        console.log(`   Actual: ${actualItems.length} items`);
        console.log(`   Missing: ${mismatches.join(', ')}`);
        totalMismatches += mismatches.length;
      } else {
        console.log(`\n✅ "${expectedCategory}": ${actualItems.length} items correctly categorized`);
      }
    });

    // Check for unexpected categories
    const unexpectedCategories = Object.keys(categoryGroups).filter(
      cat => !Object.keys(expectedCategorization).includes(cat)
    );

    if (unexpectedCategories.length > 0) {
      console.log(`\n⚠️  UNEXPECTED CATEGORIES: ${unexpectedCategories.join(', ')}`);
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total products: ${products.length}`);
    console.log(`   Total categories: ${categories.length}`);
    console.log(`   Categorization mismatches: ${totalMismatches}`);
    console.log(`   Accuracy: ${((products.length - totalMismatches) / products.length * 100).toFixed(1)}%`);

    // Sign out
    await supabase.auth.signOut();
    console.log('\n🔓 Signed out');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
checkCategorization();
