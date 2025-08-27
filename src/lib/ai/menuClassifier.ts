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

// Simple category mapping based on database categories
const CATEGORY_MAPPING = {
  // Database category names to AI category names
  'Starters / Appetizers': 'starters',
  'Main Dishes': 'main_courses', 
  'Desserts': 'desserts',
  'Soft Drinks': 'soft_drinks',
  'Wines': 'wines',
  'Spirits & Cocktails': 'cocktails',
  'Beers': 'beers'
};

// Reverse mapping for display names
const AI_TO_DISPLAY_MAPPING = {
  'starters': 'Starters & Appetizers',
  'main_courses': 'Main Courses',
  'desserts': 'Desserts',
  'soft_drinks': 'Soft Drinks',
  'wines': 'Wines',
  'cocktails': 'Spirits & Cocktails',
  'beers': 'Beers',
  'others': 'Others'
};

export function classifyMenuItem(item: MenuItem, databaseCategory?: string): ClassifiedItem {
  const name = item.name.toLowerCase();
  const description = (item.description || '').toLowerCase();
  const fullText = `${name} ${description}`;
  
  // If we have a database category, use it directly
  if (databaseCategory && CATEGORY_MAPPING[databaseCategory as keyof typeof CATEGORY_MAPPING]) {
    const aiCategory = CATEGORY_MAPPING[databaseCategory as keyof typeof CATEGORY_MAPPING];
    
    // Determine if alcoholic based on category and item name
    const isAlcoholic = databaseCategory === 'Wines' || 
                       databaseCategory === 'Spirits & Cocktails' || 
                       databaseCategory === 'Beers';
    
    const isFood = databaseCategory === 'Starters / Appetizers' || 
                   databaseCategory === 'Main Dishes' || 
                   databaseCategory === 'Desserts';
    
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
  
  // Fallback to keyword-based classification (simplified)
  const isAlcoholic = fullText.includes('wine') || fullText.includes('beer') || 
                     fullText.includes('cocktail') || fullText.includes('martini') ||
                     fullText.includes('whiskey') || fullText.includes('vodka') ||
                     fullText.includes('gin') || fullText.includes('rum') ||
                     fullText.includes('champagne') || fullText.includes('prosecco');
  
  const isFood = fullText.includes('salad') || fullText.includes('pasta') || 
                fullText.includes('steak') || fullText.includes('chicken') ||
                fullText.includes('fish') || fullText.includes('beef') ||
                fullText.includes('dessert') || fullText.includes('cake') ||
                fullText.includes('appetizer') || fullText.includes('starter');
  
  const isBeverage = !isFood;
  
  let aiCategory = 'others';
  let confidence = 0.5;
  
  if (isFood) {
    if (fullText.includes('dessert') || fullText.includes('cake') || 
        fullText.includes('tiramisu') || fullText.includes('chocolate')) {
      aiCategory = 'desserts';
      confidence = 0.8;
    } else if (fullText.includes('salad') || fullText.includes('appetizer') || 
               fullText.includes('starter') || fullText.includes('bruschetta')) {
      aiCategory = 'starters';
      confidence = 0.8;
    } else {
      aiCategory = 'main_courses';
      confidence = 0.7;
    }
  } else if (isBeverage) {
    if (isAlcoholic) {
      if (fullText.includes('wine') || fullText.includes('champagne')) {
        aiCategory = 'wines';
        confidence = 0.9;
      } else if (fullText.includes('beer') || fullText.includes('ipa') || 
                 fullText.includes('lager') || fullText.includes('stout')) {
        aiCategory = 'beers';
        confidence = 0.9;
      } else {
        aiCategory = 'cocktails';
        confidence = 0.8;
      }
    } else {
      aiCategory = 'soft_drinks';
      confidence = 0.7;
    }
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
    wines: [],
    cocktails: [],
    beers: [],
    others: []
  };
  
  // Sort items by confidence and add to appropriate categories
  classifiedItems
    .sort((a, b) => b.confidence - a.confidence)
    .forEach(item => {
      if (organized[item.aiCategory]) {
        organized[item.aiCategory].push(item);
      } else {
        organized.others.push(item);
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
  return AI_TO_DISPLAY_MAPPING[category as keyof typeof AI_TO_DISPLAY_MAPPING] || category;
}

export function getCategoryOrder(): string[] {
  return [
    'starters',
    'main_courses', 
    'desserts',
    'soft_drinks',
    'wines',
    'cocktails',
    'beers',
    'others'
  ];
}
