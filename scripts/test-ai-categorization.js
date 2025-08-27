const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple AI classification logic (copied from the TypeScript file)
function classifyMenuItem(item) {
  const name = item.name.toLowerCase();
  const description = (item.description || '').toLowerCase();
  const fullText = `${name} ${description}`;
  
  // Food-related keywords
  const FOOD_KEYWORDS = [
    'dish', 'plate', 'meal', 'appetizer', 'starter', 'salad', 'soup', 'pasta', 'rice', 'meat',
    'chicken', 'beef', 'pork', 'fish', 'seafood', 'vegetable', 'dessert', 'cake', 'pie', 'ice cream', 'burger', 'pizza', 'sandwich', 'wrap',
    'taco', 'burrito', 'sushi', 'steak', 'grilled', 'fried', 'baked', 'roasted', 'sauteed', 'braised', 'curry', 'stew', 'casserole'
  ];

  // Beverage-related keywords
  const BEVERAGE_KEYWORDS = [
    'drink', 'beverage', 'juice', 'soda', 'water', 'coffee', 'tea', 'milk', 'smoothie', 'shake', 'lemonade', 'iced tea', 'hot chocolate',
    'espresso', 'latte', 'cappuccino', 'mocha', 'americano', 'frappe'
  ];

  // Alcoholic beverage keywords
  const ALCOHOLIC_KEYWORDS = [
    'wine', 'beer', 'spirit', 'cocktail', 'vodka', 'whiskey', 'whisky', 'rum', 'gin', 'tequila', 'brandy', 'cognac', 'liqueur', 'sherry',
    'port', 'champagne', 'prosecco', 'martini', 'margarita', 'mojito', 'daiquiri', 'negroni', 'old fashioned', 'manhattan', 'cosmopolitan',
    'bloody mary', 'moscow mule', 'gin tonic', 'rum coke', 'whiskey sour', 'sangria', 'mimosa', 'bellini', 'spritz', 'aperol', 'campari'
  ];

  function calculateKeywordScore(text, keywords) {
    let score = 0;
    let matches = 0;
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += keyword.length;
        matches++;
      }
    });
    
    const textLengthFactor = Math.max(text.length, 1);
    const matchRatio = matches / keywords.length;
    
    return Math.min((score * matchRatio) / textLengthFactor, 1.0);
  }

  // Calculate confidence scores
  const foodScore = calculateKeywordScore(fullText, FOOD_KEYWORDS);
  const beverageScore = calculateKeywordScore(fullText, BEVERAGE_KEYWORDS);
  const alcoholicScore = calculateKeywordScore(fullText, ALCOHOLIC_KEYWORDS);
  
  // Determine primary classification
  const isFood = foodScore > beverageScore && foodScore > 0.05;
  const isBeverage = beverageScore > foodScore && beverageScore > 0.05;
  const isAlcoholic = alcoholicScore > 0.05;
  
  // Determine AI category
  let aiCategory = 'others';
  let confidence = 0.5;
  
  if (isFood) {
    aiCategory = determineFoodCategory(fullText);
    confidence = Math.min(foodScore * 2, 1.0);
  } else if (isBeverage) {
    aiCategory = determineBeverageCategory(fullText, isAlcoholic);
    confidence = Math.min(beverageScore * 2, 1.0);
  }
  
  return {
    ...item,
    aiCategory,
    confidence,
    isAlcoholic,
    isFood,
    isBeverage
  };
}

function determineFoodCategory(text) {
  const textLower = text.toLowerCase();
  
  // Check for specific food categories
  if (textLower.includes('appetizer') || textLower.includes('starter') || 
      textLower.includes('salad') || textLower.includes('soup') ||
      textLower.includes('bruschetta') || textLower.includes('tapas') ||
      textLower.includes('caesar') || textLower.includes('greek salad')) {
    return 'starters';
  }
  
  if (textLower.includes('dessert') || textLower.includes('cake') || 
      textLower.includes('pie') || textLower.includes('ice cream') ||
      textLower.includes('sweet') || textLower.includes('tiramisu') ||
      textLower.includes('chocolate') || textLower.includes('cheesecake')) {
    return 'desserts';
  }
  
  // Default to main courses for food items
  return 'main_courses';
}

function determineBeverageCategory(text, isAlcoholic) {
  const textLower = text.toLowerCase();
  
  if (isAlcoholic) {
    if (textLower.includes('wine') || textLower.includes('champagne') || 
        textLower.includes('prosecco') || textLower.includes('sherry')) {
      return 'wines';
    }
    
    if (textLower.includes('beer') || textLower.includes('ale') || 
        textLower.includes('lager') || textLower.includes('stout')) {
      return 'beers';
    }
    
    if (textLower.includes('cocktail') || textLower.includes('martini') || 
        textLower.includes('margarita') || textLower.includes('mojito')) {
      return 'cocktails';
    }
    
    // Default alcoholic category
    return 'spirits';
  } else {
    if (textLower.includes('coffee') || textLower.includes('tea') || 
        textLower.includes('espresso') || textLower.includes('latte')) {
      return 'hot_beverages';
    }
    
    // Default non-alcoholic category
    return 'soft_drinks';
  }
}

function getCategoryDisplayName(category) {
  const displayNames = {
    starters: 'Starters & Appetizers',
    main_courses: 'Main Courses',
    desserts: 'Desserts',
    soft_drinks: 'Soft Drinks',
    hot_beverages: 'Hot Beverages',
    cocktails: 'Cocktails',
    spirits: 'Spirits',
    wines: 'Wines',
    beers: 'Beers',
    others: 'Others'
  };
  
  return displayNames[category] || category;
}

async function testAICategorization() {
  console.log('🤖 Testing AI Menu Categorization...\n');

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

    // Get all products with their database categories
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

    console.log(`📦 Testing ${products.length} products\n`);

    // Create category mapping
    const categoryMap = {};
    products.forEach(product => {
      if (product.category_id && product.categories?.name) {
        categoryMap[product.category_id] = product.categories.name;
      }
    });

    // Test AI classification on each product
    const aiClassifications = products.map(product => {
      const databaseCategory = categoryMap[product.category_id] || '';
      const classified = classifyMenuItem(product, databaseCategory);
      return {
        name: product.name,
        databaseCategory: product.categories.name,
        aiCategory: classified.aiCategory,
        aiDisplayName: getCategoryDisplayName(classified.aiCategory),
        confidence: classified.confidence,
        isFood: classified.isFood,
        isBeverage: classified.isBeverage,
        isAlcoholic: classified.isAlcoholic
      };
    });

    // Group by AI category
    const aiCategoryGroups = {};
    aiClassifications.forEach(item => {
      if (!aiCategoryGroups[item.aiCategory]) {
        aiCategoryGroups[item.aiCategory] = [];
      }
      aiCategoryGroups[item.aiCategory].push(item);
    });

    // Display AI categorization results
    console.log('🤖 AI CATEGORIZATION RESULTS:');
    console.log('='.repeat(60));
    
    Object.keys(aiCategoryGroups).forEach(aiCategory => {
      const items = aiCategoryGroups[aiCategory];
      const displayName = getCategoryDisplayName(aiCategory);
      
      console.log(`\n📁 ${displayName} (${items.length} items):`);
      items.forEach(item => {
        const match = item.databaseCategory.toLowerCase().includes(aiCategory.replace('_', ' ')) ||
                     aiCategory.includes(item.databaseCategory.toLowerCase().replace(' ', '_'));
        const status = match ? '✅' : '❌';
        console.log(`   ${status} ${item.name} (DB: ${item.databaseCategory}, AI: ${item.aiDisplayName}, Conf: ${(item.confidence * 100).toFixed(1)}%)`);
      });
    });

    // Analyze mismatches
    console.log('\n' + '='.repeat(60));
    console.log('🔍 CATEGORIZATION MISMATCHES:');
    console.log('='.repeat(60));

    let totalMismatches = 0;
    const mismatches = [];

    aiClassifications.forEach(item => {
      const dbCategoryLower = item.databaseCategory.toLowerCase();
      const aiCategoryLower = item.aiCategory.replace('_', ' ');
      
      const isMatch = dbCategoryLower.includes(aiCategoryLower) || 
                     aiCategoryLower.includes(dbCategoryLower) ||
                     (dbCategoryLower.includes('starters') && aiCategoryLower.includes('starters')) ||
                     (dbCategoryLower.includes('main') && aiCategoryLower.includes('main')) ||
                     (dbCategoryLower.includes('desserts') && aiCategoryLower.includes('desserts')) ||
                     (dbCategoryLower.includes('soft drinks') && aiCategoryLower.includes('soft drinks')) ||
                     (dbCategoryLower.includes('wines') && aiCategoryLower.includes('wines')) ||
                     (dbCategoryLower.includes('spirits') && aiCategoryLower.includes('spirits')) ||
                     (dbCategoryLower.includes('beers') && aiCategoryLower.includes('beers'));

      if (!isMatch) {
        totalMismatches++;
        mismatches.push(item);
        console.log(`❌ MISMATCH: "${item.name}"`);
        console.log(`   Database: ${item.databaseCategory}`);
        console.log(`   AI: ${item.aiDisplayName} (${(item.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`   Type: ${item.isFood ? 'Food' : item.isBeverage ? 'Beverage' : 'Other'}`);
        console.log('');
      }
    });

    console.log(`📊 SUMMARY:`);
    console.log(`   Total products: ${products.length}`);
    console.log(`   Mismatches: ${totalMismatches}`);
    console.log(`   Accuracy: ${((products.length - totalMismatches) / products.length * 100).toFixed(1)}%`);

    // Sign out
    await supabase.auth.signOut();
    console.log('\n🔓 Signed out');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAICategorization();
