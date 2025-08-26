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

// Mock AI classification functions for testing
function classifyMenuItem(item) {
  const name = item.name.toLowerCase();
  const description = (item.description || '').toLowerCase();
  const fullText = `${name} ${description}`;
  
  // Food-related keywords
  const FOOD_KEYWORDS = [
    'dish', 'plate', 'meal', 'food', 'cuisine', 'entree', 'main',
    'appetizer', 'starter', 'salad', 'soup', 'pasta', 'rice', 'meat',
    'chicken', 'beef', 'pork', 'fish', 'seafood', 'vegetable', 'dessert',
    'cake', 'pie', 'ice cream', 'burger', 'pizza', 'sandwich', 'wrap',
    'taco', 'burrito', 'sushi', 'steak', 'grilled', 'fried', 'baked',
    'roasted', 'sauteed', 'braised', 'curry', 'stew', 'casserole'
  ];
  
  // Beverage-related keywords
  const BEVERAGE_KEYWORDS = [
    'drink', 'beverage', 'juice', 'soda', 'water', 'coffee', 'tea',
    'milk', 'smoothie', 'shake', 'lemonade', 'iced tea', 'hot chocolate',
    'espresso', 'latte', 'cappuccino', 'mocha', 'americano', 'frappe'
  ];
  
  // Alcoholic beverage keywords
  const ALCOHOLIC_KEYWORDS = [
    'wine', 'beer', 'spirit', 'cocktail', 'vodka', 'whiskey', 'whisky',
    'rum', 'gin', 'tequila', 'brandy', 'cognac', 'liqueur', 'sherry',
    'port', 'champagne', 'prosecco', 'martini', 'margarita', 'mojito',
    'daiquiri', 'negroni', 'old fashioned', 'manhattan', 'cosmopolitan',
    'bloody mary', 'moscow mule', 'gin tonic', 'rum coke', 'whiskey sour',
    'sangria', 'mimosa', 'bellini', 'spritz', 'aperol', 'campari'
  ];
  
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

function calculateKeywordScore(text, keywords) {
  let score = 0;
  let matches = 0;
  
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matches++;
      score += keyword.length * 0.2;
    }
  }
  
  const textLength = text.length;
  const matchRatio = matches / Math.max(keywords.length, 1);
  
  // Boost score for shorter texts (more specific matches)
  const textLengthFactor = Math.max(1, textLength / 50);
  
  return Math.min((score * matchRatio) / textLengthFactor, 1.0);
}

function determineFoodCategory(text) {
  const textLower = text.toLowerCase();
  
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
    
    return 'spirits';
  } else {
    if (textLower.includes('coffee') || textLower.includes('tea') || 
        textLower.includes('espresso') || textLower.includes('latte')) {
      return 'hot_beverages';
    }
    
    return 'soft_drinks';
  }
}

function organizeMenuItems(items) {
  const classifiedItems = items.map(classifyMenuItem);
  
  const organized = {
    starters: [],
    main_courses: [],
    desserts: [],
    soft_drinks: [],
    hot_beverages: [],
    cocktails: [],
    spirits: [],
    wines: [],
    beers: [],
    others: []
  };
  
  classifiedItems
    .sort((a, b) => b.confidence - a.confidence)
    .forEach(item => {
      if (organized[item.aiCategory]) {
        organized[item.aiCategory].push(item);
      } else {
        organized.others.push(item);
      }
    });
  
  Object.keys(organized).forEach(category => {
    if (organized[category].length === 0) {
      delete organized[category];
    }
  });
  
  return organized;
}

async function testAIClassification() {
  try {
    console.log('🤖 Testing AI Menu Classification System...\n');

    // Get all products from the database
    const { data: products, error } = await supabase
      .from('products')
      .select('*');

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    console.log(`📊 Found ${products.length} active products\n`);

    // Test AI classification
    const organizedItems = organizeMenuItems(products);

    console.log('🎯 AI Classification Results:\n');

    Object.entries(organizedItems).forEach(([category, items]) => {
      console.log(`📁 ${category.toUpperCase()}: ${items.length} items`);
      
      // Show first 3 items in each category
      items.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} (confidence: ${(item.confidence * 100).toFixed(1)}%)`);
      });
      
      if (items.length > 3) {
        console.log(`   ... and ${items.length - 3} more items`);
      }
      console.log('');
    });

    // Test specific items
    console.log('🧪 Testing Specific Items:\n');
    
    const testItems = [
      { name: 'Caesar Salad', description: 'Fresh romaine lettuce with parmesan cheese' },
      { name: 'Grilled Salmon', description: 'Fresh Atlantic salmon with herbs' },
      { name: 'Chocolate Cake', description: 'Rich chocolate layer cake' },
      { name: 'Espresso', description: 'Single shot of Italian coffee' },
      { name: 'Red Wine', description: 'Cabernet Sauvignon from Napa Valley' },
      { name: 'Margarita Cocktail', description: 'Tequila, lime juice, and triple sec' },
      { name: 'French Fries', description: 'Crispy golden potato fries' }
    ];

    testItems.forEach(item => {
      const classified = classifyMenuItem(item);
      console.log(`🍽️  "${item.name}" → ${classified.aiCategory} (${(classified.confidence * 100).toFixed(1)}% confidence)`);
    });

    console.log('\n✅ AI Classification test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing AI classification:', error);
  }
}

// Run the test
testAIClassification();
