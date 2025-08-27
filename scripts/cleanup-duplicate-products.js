const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupDuplicateProducts() {
  console.log('🧹 Cleaning up duplicate products...\n');

  try {
    // Sign in
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

    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('name', 'myprecious')
      .single();

    if (restaurantError) {
      console.error('❌ Failed to get restaurant:', restaurantError);
      return;
    }

    // Get all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('name');

    if (productsError) {
      console.error('❌ Failed to get products:', productsError);
      return;
    }

    console.log(`📦 Found ${products.length} products`);

    // Group products by name
    const productGroups = {};
    products.forEach(product => {
      if (!productGroups[product.name]) {
        productGroups[product.name] = [];
      }
      productGroups[product.name].push(product);
    });

    // Find duplicates
    const duplicates = {};
    Object.keys(productGroups).forEach(name => {
      if (productGroups[name].length > 1) {
        duplicates[name] = productGroups[name];
      }
    });

    if (Object.keys(duplicates).length === 0) {
      console.log('✅ No duplicate products found');
      return;
    }

    console.log(`\n🔄 Found ${Object.keys(duplicates).length} products with duplicates`);

    // Delete duplicate products (keep the first one)
    let deletedCount = 0;
    for (const [name, prods] of Object.entries(duplicates)) {
      const keepProduct = prods[0]; // Keep the first one
      const deleteProducts = prods.slice(1); // Delete the rest

      console.log(`\n📦 ${name}:`);
      console.log(`   Keeping: ${keepProduct.id}`);
      console.log(`   Deleting: ${deleteProducts.map(p => p.id).join(', ')}`);

      for (const deleteProd of deleteProducts) {
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', deleteProd.id);

        if (deleteError) {
          console.error(`❌ Failed to delete product ${deleteProd.id}:`, deleteError);
        } else {
          console.log(`   ✅ Deleted product ${deleteProd.id}`);
          deletedCount++;
        }
      }
    }

    console.log(`\n✅ Cleanup completed! Deleted ${deletedCount} duplicate products`);

    // Fix pricing issues for wines and spirits
    console.log('\n💰 Fixing pricing issues...');
    
    // Wines pricing fix
    const winePrices = {
      'Château Margaux 2015': 280,
      'Dom Pérignon 2012': 320,
      'Barolo Riserva 2016': 180,
      'Sancerre Blanc 2022': 120,
      'Pinot Noir Reserve 2020': 95
    };

    for (const [wineName, price] of Object.entries(winePrices)) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ price: price })
        .eq('name', wineName)
        .eq('restaurant_id', restaurant.id);

      if (updateError) {
        console.error(`❌ Failed to update price for ${wineName}:`, updateError);
      } else {
        console.log(`   ✅ Updated ${wineName} price to ${price} RON`);
      }
    }

    // Spirits & Cocktails pricing fix
    const spiritPrices = {
      'Classic Martini': 35,
      'Old Fashioned': 38,
      'Negroni': 32,
      'Whiskey Sour': 30,
      'Espresso Martini': 42
    };

    for (const [spiritName, price] of Object.entries(spiritPrices)) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ price: price })
        .eq('name', spiritName)
        .eq('restaurant_id', restaurant.id);

      if (updateError) {
        console.error(`❌ Failed to update price for ${spiritName}:`, updateError);
      } else {
        console.log(`   ✅ Updated ${spiritName} price to ${price} RON`);
      }
    }

    console.log('\n✅ Pricing fixes completed!');

    // Sign out
    await supabase.auth.signOut();
    console.log('🔓 Signed out');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDuplicateProducts();

