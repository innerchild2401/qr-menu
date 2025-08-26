export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  indicators: string[];
  suggestedLanguage: string;
}

export interface LanguageContext {
  restaurantName: string;
  restaurantAddress?: string;
  menuItems: Array<{
    name: string;
    description?: string;
    category?: string;
  }>;
  categories: string[];
}

// Language detection patterns and keywords
const LANGUAGE_PATTERNS = {
  romanian: {
    keywords: [
      // Common Romanian food terms
      'mâncare', 'băutură', 'desert', 'aperitiv', 'principal', 'supă', 'salată',
      'carne', 'pește', 'pui', 'porc', 'vită', 'miel', 'curcan', 'găină',
      'cartofi', 'orez', 'pâine', 'brânză', 'lapte', 'ouă', 'legume', 'fructe',
      'vin', 'bere', 'cafea', 'ceai', 'suc', 'apă', 'limonadă', 'compot',
      'plăcintă', 'cozonac', 'pască', 'colivă', 'sarmale', 'mămăligă', 'ciorbă',
      'borș', 'zeamă', 'tocană', 'chiftea', 'mititei', 'covrigi', 'gogoașă',
      
      // Romanian restaurant terms
      'restaurant', 'bucătărie', 'meniu', 'preț', 'gramaj', 'porție',
      'chef', 'bucătar', 'ospătar', 'recepție', 'rezervare', 'masă',
      
      // Romanian adjectives and descriptions
      'delicios', 'gustos', 'proaspăt', 'cald', 'rece', 'picant', 'dulce',
      'sărat', 'acru', 'amărui', 'aromat', 'tradițional', 'casnic', 'natural',
      'organic', 'vegetarian', 'vegan', 'fără gluten', 'dietetic',
      
      // Romanian cooking methods
      'fript', 'copt', 'fiert', 'prăjit', 'gătit', 'marinat', 'afumat',
      'grill', 'la cuptor', 'la grătar', 'în sos', 'cu sos', 'fără sos'
    ],
    patterns: [
      /ă|â|î|ș|ț/g, // Romanian diacritics
      /(?:la|cu|din|pe|în|de|și|sau|sau|dar|să|nu|este|sunt|am|ai|au)/g, // Common Romanian words
      /(?:mâncare|băutură|desert|aperitiv|principal)/g, // Romanian food categories
    ],
    confidence: 0.8
  },
  english: {
    keywords: [
      // Common English food terms
      'food', 'drink', 'beverage', 'dessert', 'appetizer', 'main', 'soup', 'salad',
      'meat', 'fish', 'chicken', 'pork', 'beef', 'lamb', 'turkey', 'duck',
      'potato', 'rice', 'bread', 'cheese', 'milk', 'egg', 'vegetable', 'fruit',
      'wine', 'beer', 'coffee', 'tea', 'juice', 'water', 'lemonade', 'soda',
      'cake', 'pie', 'cookie', 'ice cream', 'pudding', 'custard', 'tart',
      
      // English restaurant terms
      'restaurant', 'kitchen', 'menu', 'price', 'portion', 'serving',
      'chef', 'cook', 'waiter', 'server', 'reception', 'reservation', 'table',
      
      // English adjectives and descriptions
      'delicious', 'tasty', 'fresh', 'hot', 'cold', 'spicy', 'sweet',
      'salty', 'sour', 'bitter', 'aromatic', 'traditional', 'homemade', 'natural',
      'organic', 'vegetarian', 'vegan', 'gluten-free', 'dietary',
      
      // English cooking methods
      'fried', 'baked', 'boiled', 'grilled', 'cooked', 'marinated', 'smoked',
      'roasted', 'steamed', 'stewed', 'braised', 'sautéed', 'pan-fried'
    ],
    patterns: [
      /(?:the|and|or|but|with|in|on|at|to|for|of|a|an|is|are|was|were)/g, // Common English words
      /(?:food|drink|beverage|dessert|appetizer|main)/g, // English food categories
    ],
    confidence: 0.7
  },
  spanish: {
    keywords: [
      // Common Spanish food terms
      'comida', 'bebida', 'postre', 'aperitivo', 'plato', 'sopa', 'ensalada',
      'carne', 'pescado', 'pollo', 'cerdo', 'ternera', 'cordero', 'pavo',
      'patata', 'arroz', 'pan', 'queso', 'leche', 'huevo', 'verdura', 'fruta',
      'vino', 'cerveza', 'café', 'té', 'zumo', 'agua', 'limonada', 'refresco',
      'pastel', 'tarta', 'galleta', 'helado', 'pudín', 'flan', 'tarta',
      
      // Spanish restaurant terms
      'restaurante', 'cocina', 'menú', 'precio', 'ración', 'porción',
      'chef', 'cocinero', 'camarero', 'recepcionista', 'reserva', 'mesa',
      
      // Spanish adjectives and descriptions
      'delicioso', 'sabroso', 'fresco', 'caliente', 'frío', 'picante', 'dulce',
      'salado', 'ácido', 'amargo', 'aromático', 'tradicional', 'casero', 'natural',
      'orgánico', 'vegetariano', 'vegano', 'sin gluten', 'dietético',
      
      // Spanish cooking methods
      'frito', 'asado', 'hervido', 'a la parrilla', 'cocido', 'marinado', 'ahumado',
      'al horno', 'al vapor', 'estofado', 'braseado', 'salteado', 'a la plancha'
    ],
    patterns: [
      /(?:el|la|los|las|y|o|pero|con|en|de|a|por|para|es|son|era|eran)/g, // Common Spanish words
      /(?:comida|bebida|postre|aperitivo|plato)/g, // Spanish food categories
    ],
    confidence: 0.7
  },
  french: {
    keywords: [
      // Common French food terms
      'nourriture', 'boisson', 'dessert', 'apéritif', 'plat', 'soupe', 'salade',
      'viande', 'poisson', 'poulet', 'porc', 'bœuf', 'agneau', 'dinde',
      'pomme de terre', 'riz', 'pain', 'fromage', 'lait', 'œuf', 'légume', 'fruit',
      'vin', 'bière', 'café', 'thé', 'jus', 'eau', 'limonade', 'soda',
      'gâteau', 'tarte', 'biscuit', 'glace', 'pudding', 'crème', 'tarte',
      
      // French restaurant terms
      'restaurant', 'cuisine', 'menu', 'prix', 'portion', 'service',
      'chef', 'cuisinier', 'serveur', 'réceptionniste', 'réservation', 'table',
      
      // French adjectives and descriptions
      'délicieux', 'savoureux', 'frais', 'chaud', 'froid', 'épicé', 'doux',
      'salé', 'acide', 'amer', 'aromatique', 'traditionnel', 'maison', 'naturel',
      'bio', 'végétarien', 'végan', 'sans gluten', 'diététique',
      
      // French cooking methods
      'frit', 'cuit', 'bouilli', 'grillé', 'cuit', 'mariné', 'fumé',
      'au four', 'à la vapeur', 'braisé', 'sauté', 'poêlé', 'à la plancha'
    ],
    patterns: [
      /(?:le|la|les|et|ou|mais|avec|en|de|à|pour|par|est|sont|était|étaient)/g, // Common French words
      /(?:nourriture|boisson|dessert|apéritif|plat)/g, // French food categories
    ],
    confidence: 0.7
  }
};

// Language codes mapping
const LANGUAGE_CODES = {
  romanian: 'ro',
  english: 'en',
  spanish: 'es',
  french: 'fr'
};

// Language names mapping
const LANGUAGE_NAMES = {
  romanian: 'Romanian',
  english: 'English',
  spanish: 'Spanish',
  french: 'French'
};

/**
 * Detect the language based on restaurant data and menu items
 */
export function detectLanguage(context: LanguageContext): LanguageDetectionResult {
  const allText = [
    context.restaurantName,
    context.restaurantAddress || '',
    ...context.menuItems.map(item => `${item.name} ${item.description || ''}`),
    ...context.categories
  ].join(' ').toLowerCase();

  const scores: Record<string, { score: number; indicators: string[] }> = {};
  
  // Initialize scores
  Object.keys(LANGUAGE_PATTERNS).forEach(lang => {
    scores[lang] = { score: 0, indicators: [] };
  });

  // Score based on keywords
  Object.entries(LANGUAGE_PATTERNS).forEach(([language, config]) => {
    const foundKeywords = config.keywords.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      scores[language].score += foundKeywords.length * 2;
      scores[language].indicators.push(`Found ${foundKeywords.length} keywords: ${foundKeywords.slice(0, 3).join(', ')}`);
    }
  });

  // Score based on patterns (diacritics, common words)
  Object.entries(LANGUAGE_PATTERNS).forEach(([language, config]) => {
    config.patterns.forEach(pattern => {
      const matches = allText.match(pattern);
      if (matches) {
        scores[language].score += matches.length;
        scores[language].indicators.push(`Pattern matches: ${matches.length} occurrences`);
      }
    });
  });

  // Special detection for Romanian (diacritics are very strong indicators)
  const romanianDiacritics = allText.match(/ă|â|î|ș|ț/g);
  if (romanianDiacritics) {
    scores.romanian.score += romanianDiacritics.length * 3;
    scores.romanian.indicators.push(`Strong Romanian indicators: ${romanianDiacritics.length} diacritics found`);
  }

  // Find the language with the highest score
  let detectedLanguage = 'english'; // default
  let highestScore = 0;
  let confidence = 0;

  Object.entries(scores).forEach(([language, data]) => {
    if (data.score > highestScore) {
      highestScore = data.score;
      detectedLanguage = language;
      confidence = Math.min(data.score / 10, 1); // Normalize confidence to 0-1
    }
  });

  // If no strong indicators found, default to English
  if (highestScore < 2) {
    detectedLanguage = 'english';
    confidence = 0.3;
  }

  return {
    detectedLanguage,
    confidence,
    indicators: scores[detectedLanguage]?.indicators || [],
    suggestedLanguage: detectedLanguage
  };
}

/**
 * Get language code for the detected language
 */
export function getLanguageCode(language: string): string {
  return LANGUAGE_CODES[language as keyof typeof LANGUAGE_CODES] || 'en';
}

/**
 * Get language name for the detected language
 */
export function getLanguageName(language: string): string {
  return LANGUAGE_NAMES[language as keyof typeof LANGUAGE_NAMES] || 'English';
}

/**
 * Test language detection with sample data
 */
export function testLanguageDetection(): void {
  console.log('🧪 Testing Language Detection...\n');

  const testCases = [
    {
      name: 'Romanian Restaurant',
      context: {
        restaurantName: 'Restaurant Tradițional Românesc',
        restaurantAddress: 'Strada Mânăstirii, București',
        menuItems: [
          { name: 'Sarmale cu mămăligă', description: 'Sarmale tradiționale cu mămăligă și smântână' },
          { name: 'Ciorbă de burtă', description: 'Ciorbă tradițională românească' },
          { name: 'Papanăși cu smântână', description: 'Desert tradițional românesc' }
        ],
        categories: ['Mâncăruri principale', 'Deserturi', 'Băuturi']
      }
    },
    {
      name: 'English Restaurant',
      context: {
        restaurantName: 'Traditional English Pub',
        restaurantAddress: 'High Street, London',
        menuItems: [
          { name: 'Fish and Chips', description: 'Traditional English fish and chips with mushy peas' },
          { name: 'Beef Wellington', description: 'Classic English beef wellington with red wine sauce' },
          { name: 'Apple Crumble', description: 'Traditional English dessert with custard' }
        ],
        categories: ['Main Courses', 'Desserts', 'Beverages']
      }
    },
    {
      name: 'Spanish Restaurant',
      context: {
        restaurantName: 'Restaurante Español',
        restaurantAddress: 'Calle Mayor, Madrid',
        menuItems: [
          { name: 'Paella Valenciana', description: 'Paella tradicional con mariscos y pollo' },
          { name: 'Gazpacho', description: 'Sopa fría tradicional española' },
          { name: 'Flan de Caramelo', description: 'Postre tradicional español' }
        ],
        categories: ['Platos principales', 'Postres', 'Bebidas']
      }
    }
  ];

  testCases.forEach(testCase => {
    const result = detectLanguage(testCase.context);
    console.log(`📋 ${testCase.name}:`);
    console.log(`   Detected: ${getLanguageName(result.detectedLanguage)} (${result.detectedLanguage})`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Indicators: ${result.indicators.join(', ')}`);
    console.log('');
  });
}

/**
 * Generate descriptions in the detected language
 */
export function generateDescriptionInLanguage(
  itemName: string,
  language: string,
  category?: string
): string {
  const descriptions = {
    romanian: {
      starters: [
        'Aperitiv tradițional românesc, perfect pentru începutul mesei',
        'Delicios aperitiv cu ingrediente proaspete și aromate',
        'Aperitiv gustos, pregătit după rețete tradiționale'
      ],
      main_courses: [
        'Fel principal tradițional, gătit cu pasiune și ingrediente proaspete',
        'Delicios fel principal cu sos aromat și garnitură tradițională',
        'Fel principal gustos, pregătit după rețete de familie'
      ],
      desserts: [
        'Desert tradițional românesc, perfect pentru încheierea mesei',
        'Desert delicios cu gust autentic românesc',
        'Desert gustos, pregătit cu ingrediente naturale'
      ],
      default: [
        'Delicios preparat tradițional românesc',
        'Gustos preparat cu ingrediente proaspete',
        'Preparat autentic, gătit cu pasiune'
      ]
    },
    english: {
      starters: [
        'Traditional starter, perfect to begin your meal',
        'Delicious appetizer with fresh and aromatic ingredients',
        'Tasty starter prepared with traditional recipes'
      ],
      main_courses: [
        'Traditional main course, cooked with passion and fresh ingredients',
        'Delicious main course with aromatic sauce and traditional garnish',
        'Tasty main course prepared with family recipes'
      ],
      desserts: [
        'Traditional dessert, perfect to end your meal',
        'Delicious dessert with authentic taste',
        'Tasty dessert prepared with natural ingredients'
      ],
      default: [
        'Delicious traditional preparation',
        'Tasty dish with fresh ingredients',
        'Authentic preparation, cooked with passion'
      ]
    },
    spanish: {
      starters: [
        'Aperitivo tradicional español, perfecto para comenzar la comida',
        'Delicioso aperitivo con ingredientes frescos y aromáticos',
        'Sabroso aperitivo preparado con recetas tradicionales'
      ],
      main_courses: [
        'Plato principal tradicional, cocinado con pasión e ingredientes frescos',
        'Delicioso plato principal con salsa aromática y guarnición tradicional',
        'Sabroso plato principal preparado con recetas familiares'
      ],
      desserts: [
        'Postre tradicional español, perfecto para terminar la comida',
        'Delicioso postre con sabor auténtico',
        'Sabroso postre preparado con ingredientes naturales'
      ],
      default: [
        'Deliciosa preparación tradicional',
        'Sabroso plato con ingredientes frescos',
        'Preparación auténtica, cocinada con pasión'
      ]
    },
    french: {
      starters: [
        'Apéritif traditionnel français, parfait pour commencer le repas',
        'Délicieux apéritif avec des ingrédients frais et aromatiques',
        'Savoureux apéritif préparé avec des recettes traditionnelles'
      ],
      main_courses: [
        'Plat principal traditionnel, cuisiné avec passion et ingrédients frais',
        'Délicieux plat principal avec sauce aromatique et garniture traditionnelle',
        'Savoureux plat principal préparé avec des recettes familiales'
      ],
      desserts: [
        'Dessert traditionnel français, parfait pour terminer le repas',
        'Délicieux dessert au goût authentique',
        'Savoureux dessert préparé avec des ingrédients naturels'
      ],
      default: [
        'Délicieuse préparation traditionnelle',
        'Savoureux plat avec des ingrédients frais',
        'Préparation authentique, cuisinée avec passion'
      ]
    }
  };

  const langDescriptions = descriptions[language as keyof typeof descriptions] || descriptions.english;
  const categoryDescriptions = langDescriptions[category as keyof typeof langDescriptions] || langDescriptions.default;
  
  // Return a random description from the appropriate category
  const randomIndex = Math.floor(Math.random() * categoryDescriptions.length);
  return categoryDescriptions[randomIndex];
}

