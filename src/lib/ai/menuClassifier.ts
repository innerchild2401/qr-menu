// AI Menu Item Classification System
// Categorizes menu items based on name, description, and keywords

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  nutrition?: Record<string, unknown>;
}

export interface ClassifiedItem extends MenuItem {
  aiCategory: string;
  confidence: number;
  isAlcoholic: boolean;
  isFood: boolean;
  isBeverage: boolean;
}

// Enhanced category mapping based on menu engineering best practices
const CATEGORY_MAPPING = {
  // Database category names to AI category names
  'Starters / Appetizers': 'starters',
  'Main Dishes': 'main_courses', 
  'Desserts': 'desserts',
  'Soft Drinks': 'soft_drinks',
  'Hot Beverages': 'hot_beverages',
  'Wines': 'wines',
  'Spirits & Cocktails': 'cocktails',
  'Beers': 'beers',
  'Sides': 'sides',
  'Sauces': 'sauces'
};

// Enhanced reverse mapping for display names
const AI_TO_DISPLAY_MAPPING = {
  'starters': 'Starters & Appetizers',
  'main_courses': 'Main Courses',
  'desserts': 'Desserts',
  'soft_drinks': 'Soft Drinks',
  'hot_beverages': 'Hot Beverages',
  'wines': 'Wines',
  'cocktails': 'Spirits & Cocktails',
  'beers': 'Beers',
  'spirits': 'Spirits',
  'sides': 'Sides & Accompaniments',
  'sauces': 'Sauces & Condiments',
  'uncategorized': 'Uncategorized'
};

// Enhanced keyword-based classification system
const CATEGORY_KEYWORDS = {
  starters: [
    'appetizer', 'starter', 'salad', 'soup', 'bruschetta', 'tapas', 'antipasto',
    'dip', 'spread', 'hummus', 'guacamole', 'nachos', 'spring roll', 'dumpling',
    'calamari', 'shrimp cocktail', 'charcuterie', 'cheese board', 'bread', 'garlic bread'
  ],
  main_courses: [
    'main', 'entree', 'dish', 'plate', 'meal', 'steak', 'chicken', 'beef', 'pork',
    'fish', 'seafood', 'pasta', 'rice', 'noodle', 'burger', 'sandwich', 'wrap',
    'pizza', 'taco', 'burrito', 'curry', 'stew', 'casserole', 'roast', 'grill',
    'fillet', 'cutlet', 'chop', 'breast', 'thigh', 'wing', 'leg', 'loin'
  ],
  desserts: [
    'dessert', 'cake', 'pie', 'ice cream', 'pudding', 'tiramisu', 'cheesecake',
    'chocolate', 'sweet', 'pastry', 'cookie', 'brownie', 'mousse', 'sorbet',
    'gelato', 'flan', 'creme brulee', 'tart', 'eclair', 'donut', 'muffin'
  ],
  soft_drinks: [
    'juice', 'soda', 'water', 'lemonade', 'iced tea', 'smoothie', 'shake',
    'milkshake', 'mocktail', 'virgin', 'non-alcoholic', 'soft drink', 'pop',
    'cola', 'sprite', 'fanta', 'ginger ale', 'root beer', 'energy drink'
  ],
  hot_beverages: [
    'coffee', 'tea', 'espresso', 'latte', 'cappuccino', 'mocha', 'americano',
    'frappe', 'hot chocolate', 'hot cocoa', 'chai', 'herbal tea', 'green tea',
    'black tea', 'white tea', 'oolong', 'earl grey', 'chamomile', 'mint tea'
  ],
  wines: [
    'wine', 'champagne', 'prosecco', 'sherry', 'port', 'sangria', 'red wine',
    'white wine', 'rose wine', 'sparkling wine', 'dessert wine', 'fortified wine',
    'merlot', 'cabernet', 'pinot noir', 'chardonnay', 'sauvignon blanc', 'riesling'
  ],
  cocktails: [
    'cocktail', 'martini', 'margarita', 'mojito', 'daiquiri', 'negroni',
    'old fashioned', 'manhattan', 'cosmopolitan', 'bloody mary', 'moscow mule',
    'gin tonic', 'rum coke', 'whiskey sour', 'mimosa', 'bellini', 'spritz'
  ],
  beers: [
    'beer', 'ale', 'lager', 'stout', 'ipa', 'pilsner', 'wheat beer', 'porter',
    'saison', 'belgian', 'hefeweizen', 'pale ale', 'amber ale', 'brown ale',
    'cider', 'hard cider', 'mead', 'radler', 'shandy'
  ],
  spirits: [
    'vodka', 'whiskey', 'whisky', 'rum', 'gin', 'tequila', 'brandy', 'cognac',
    'liqueur', 'schnapps', 'absinthe', 'amaretto', 'baileys', 'kahlua',
    'triple sec', 'cointreau', 'grand marnier', 'sambuca', 'ouzo', 'rakı'
  ],
  sides: [
    'side', 'accompaniment', 'fries', 'potato', 'rice', 'pasta', 'vegetable',
    'salad', 'bread', 'roll', 'bun', 'toast', 'mashed potato', 'baked potato',
    'roasted potato', 'grilled vegetable', 'steamed vegetable', 'sauteed vegetable'
  ],
  sauces: [
    'sauce', 'dressing', 'condiment', 'ketchup', 'mustard', 'mayonnaise',
    'aioli', 'pesto', 'marinara', 'alfredo', 'bolognese', 'carbonara',
    'hollandaise', 'béarnaise', 'chimichurri', 'tzatziki', 'hummus', 'guacamole'
  ]
};

export function classifyMenuItem(item: MenuItem, databaseCategory?: string): ClassifiedItem {
  const name = item.name.toLowerCase();
  const description = (item.description || '').toLowerCase();
  const fullText = `${name} ${description}`;
  
  // If we have a database category, use it directly with high confidence
  if (databaseCategory && CATEGORY_MAPPING[databaseCategory as keyof typeof CATEGORY_MAPPING]) {
    const aiCategory = CATEGORY_MAPPING[databaseCategory as keyof typeof CATEGORY_MAPPING];
    
    // Determine if alcoholic based on category and item name
    const isAlcoholic = databaseCategory === 'Wines' || 
                       databaseCategory === 'Spirits & Cocktails' || 
                       databaseCategory === 'Beers' ||
                       databaseCategory === 'Hot Beverages' && fullText.includes('alcohol');
    
    const isFood = databaseCategory === 'Starters / Appetizers' || 
                   databaseCategory === 'Main Dishes' || 
                   databaseCategory === 'Desserts' ||
                   databaseCategory === 'Sides' ||
                   databaseCategory === 'Sauces';
    
    const isBeverage = !isFood;
    
    return {
      ...item,
      aiCategory,
      confidence: 0.95, // High confidence when using database category
      isAlcoholic,
      isFood,
      isBeverage
    };
  }
  
  // Enhanced keyword-based classification with confidence scoring
  const categoryScores: Record<string, number> = {};
  
  // Initialize all category scores
  Object.keys(CATEGORY_KEYWORDS).forEach(category => {
    categoryScores[category] = 0;
  });
  
  // Score each category based on keyword matches
  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    let matches = 0;
    let totalScore = 0;
    
    keywords.forEach(keyword => {
      if (fullText.includes(keyword)) {
        matches++;
        // Weight by keyword length and position
        const keywordWeight = keyword.length / 10;
        const nameMatch = name.includes(keyword) ? 2 : 1; // Name matches are more important
        totalScore += keywordWeight * nameMatch;
      }
    });
    
    if (matches > 0) {
      // Calculate confidence based on matches and keyword relevance
      const matchRatio = matches / keywords.length;
      const averageWeight = totalScore / matches;
      categoryScores[category] = Math.min(matchRatio * averageWeight * 2, 1.0);
    }
  });
  
  // Find the category with the highest score
  let bestCategory = 'uncategorized';
  let bestScore = 0;
  
  Object.entries(categoryScores).forEach(([category, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });
  
  // Determine item properties based on category
  const isAlcoholic = ['wines', 'cocktails', 'beers', 'spirits'].includes(bestCategory);
  const isFood = ['starters', 'main_courses', 'desserts', 'sides', 'sauces'].includes(bestCategory);
  const isBeverage = !isFood;
  
  // Adjust confidence based on category certainty
  let confidence = bestScore;
  
  // Boost confidence for clear alcoholic beverages
  if (isAlcoholic && fullText.includes('alcohol')) {
    confidence = Math.min(confidence + 0.2, 1.0);
  }
  
  // Reduce confidence for ambiguous items
  if (bestScore < 0.3) {
    confidence = bestScore * 0.5; // Further reduce low confidence scores
  }
  
  // If no clear category found, mark as uncategorized
  if (bestScore < 0.1) {
    bestCategory = 'uncategorized';
    confidence = 0.1;
  }
  
  return {
    ...item,
    aiCategory: bestCategory,
    confidence: Math.max(confidence, 0.1), // Minimum confidence of 0.1
    isAlcoholic,
    isFood,
    isBeverage
  };
}

export function organizeMenuItems(items: MenuItem[], databaseCategories?: Record<string, string>): Record<string, ClassifiedItem[]> {
  const classifiedItems = items.map(item => {
    const categoryId = item.category_id;
    const databaseCategory = databaseCategories?.[categoryId || ''] || '';
    return classifyMenuItem(item, databaseCategory);
  });
  
  // Group by AI category
  const organized: Record<string, ClassifiedItem[]> = {
    starters: [],
    main_courses: [],
    desserts: [],
    soft_drinks: [],
    hot_beverages: [],
    wines: [],
    cocktails: [],
    beers: [],
    spirits: [],
    sides: [],
    sauces: [],
    uncategorized: []
  };
  
  // Sort items by confidence and add to appropriate categories
  classifiedItems
    .sort((a, b) => b.confidence - a.confidence)
    .forEach(item => {
      if (organized[item.aiCategory]) {
        organized[item.aiCategory].push(item);
      } else {
        organized.uncategorized.push(item);
      }
    });
  
  // Remove empty categories
  Object.keys(organized).forEach(category => {
    if (organized[category].length === 0) {
      delete organized[category];
    }
  });
  
  return organized;
}

export function getCategoryDisplayName(category: string): string {
  return AI_TO_DISPLAY_MAPPING[category as keyof typeof AI_TO_DISPLAY_MAPPING] || 'Others';
}

export function getCategoryOrder(): string[] {
  return [
    'starters',
    'main_courses', 
    'desserts',
    'soft_drinks',
    'hot_beverages',
    'wines',
    'cocktails',
    'beers',
    'spirits',
    'sides',
    'sauces',
    'uncategorized'
  ];
}

// Helper function to get all available categories
export function getAvailableCategories(): string[] {
  return Object.keys(AI_TO_DISPLAY_MAPPING);
}

// Helper function to check if a category is alcoholic
export function isAlcoholicCategory(category: string): boolean {
  return ['wines', 'cocktails', 'beers', 'spirits'].includes(category);
}

// Helper function to check if a category is food
export function isFoodCategory(category: string): boolean {
  return ['starters', 'main_courses', 'desserts', 'sides', 'sauces'].includes(category);
}

// Helper function to check if a category is beverage
export function isBeverageCategory(category: string): boolean {
  return ['soft_drinks', 'hot_beverages', 'wines', 'cocktails', 'beers', 'spirits'].includes(category);
}
