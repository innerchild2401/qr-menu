/**
 * Language Detection for SmartMenu Products
 * Automatically detects Romanian vs English product names
 */

// =============================================================================
// TYPES
// =============================================================================

export type SupportedLanguage = 'ro' | 'en';

export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number; // 0-1, where 1 is highest confidence
  reasons: string[]; // Array of reasons for the detection
}

// =============================================================================
// LANGUAGE PATTERNS
// =============================================================================

// Romanian-specific patterns
const ROMANIAN_PATTERNS = {
  // Common Romanian food words
  FOOD_WORDS: [
    'ciorbă', 'supă', 'mici', 'papanași', 'mămăligă', 'sarmale', 'cozonac',
    'plăcintă', 'gogoșari', 'ardei', 'roșii', 'castraveți', 'ceapă',
    'usturoi', 'brânză', 'telemea', 'cașcaval', 'smântână', 'lapte',
    'ouă', 'pui', 'porc', 'vită', 'miel', 'peste', 'somon', 'crap',
    'pâine', 'chiflă', 'lipie', 'covrigi', 'prăjituri', 'tort',
    'înghețată', 'cafea', 'ceai', 'suc', 'bere', 'vin', 'țuică', 'pălincă'
  ],
  
  // Romanian cooking methods
  COOKING_METHODS: [
    'la grătar', 'la cuptor', 'prăjit', 'fiert', 'copt', 'afumat',
    'marinat', 'condimentat', 'umplut', 'învelit'
  ],
  
  // Romanian descriptors
  DESCRIPTORS: [
    'proaspăt', 'cald', 'rece', 'picant', 'dulce', 'sărat', 'acru',
    'tradițional', 'casnic', 'de casă', 'artizanal'
  ],
  
  // Romanian diacritics
  DIACRITICS: /[ăâîșțĂÂÎȘȚ]/,
  
  // Romanian specific letter combinations
  LETTER_COMBINATIONS: /\b(ți|și|ău|ea|ia|ie|ii|uri|oare|este|sunt)\b/i,
  
  // Romanian articles and prepositions
  ARTICLES_PREPOSITIONS: [
    'cu', 'și', 'de', 'la', 'în', 'pe', 'din', 'pentru', 'sau',
    'fără', 'plus', 'minus', 'extra'
  ]
};

// English-specific patterns
const ENGLISH_PATTERNS = {
  // Common English food words
  FOOD_WORDS: [
    'burger', 'pizza', 'pasta', 'salad', 'soup', 'sandwich', 'steak',
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp',
    'cheese', 'bread', 'rice', 'noodles', 'fries', 'chips',
    'cake', 'pie', 'ice cream', 'chocolate', 'vanilla',
    'coffee', 'tea', 'juice', 'water', 'beer', 'wine', 'cocktail'
  ],
  
  // English cooking methods
  COOKING_METHODS: [
    'grilled', 'fried', 'baked', 'roasted', 'steamed', 'boiled',
    'sautéed', 'braised', 'smoked', 'marinated', 'seasoned'
  ],
  
  // English descriptors
  DESCRIPTORS: [
    'fresh', 'hot', 'cold', 'spicy', 'sweet', 'salty', 'sour',
    'crispy', 'tender', 'juicy', 'homemade', 'organic', 'premium'
  ],
  
  // English articles and prepositions
  ARTICLES_PREPOSITIONS: [
    'with', 'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at',
    'from', 'to', 'for', 'without', 'plus', 'extra'
  ],
  
  // English specific patterns
  ENDINGS: /\b\w+(ing|ed|tion|ly|ness|ment|able|ible)\b/i
};

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect if text contains Romanian indicators
 */
function detectRomanian(text: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  const lowerText = text.toLowerCase();
  
  // Check for Romanian diacritics (strong indicator)
  if (ROMANIAN_PATTERNS.DIACRITICS.test(text)) {
    score += 0.4;
    reasons.push('Contains Romanian diacritics');
  }
  
  // Check for Romanian letter combinations
  if (ROMANIAN_PATTERNS.LETTER_COMBINATIONS.test(text)) {
    score += 0.2;
    reasons.push('Contains Romanian letter patterns');
  }
  
  // Check for Romanian food words
  const foundFoodWords = ROMANIAN_PATTERNS.FOOD_WORDS.filter(word => 
    lowerText.includes(word)
  );
  if (foundFoodWords.length > 0) {
    score += Math.min(foundFoodWords.length * 0.15, 0.3);
    reasons.push(`Contains Romanian food words: ${foundFoodWords.slice(0, 3).join(', ')}`);
  }
  
  // Check for Romanian cooking methods
  const foundCookingMethods = ROMANIAN_PATTERNS.COOKING_METHODS.filter(method => 
    lowerText.includes(method)
  );
  if (foundCookingMethods.length > 0) {
    score += 0.2;
    reasons.push(`Contains Romanian cooking methods: ${foundCookingMethods[0]}`);
  }
  
  // Check for Romanian descriptors
  const foundDescriptors = ROMANIAN_PATTERNS.DESCRIPTORS.filter(desc => 
    lowerText.includes(desc)
  );
  if (foundDescriptors.length > 0) {
    score += 0.1;
    reasons.push(`Contains Romanian descriptors: ${foundDescriptors[0]}`);
  }
  
  // Check for Romanian articles/prepositions
  const foundArticles = ROMANIAN_PATTERNS.ARTICLES_PREPOSITIONS.filter(article => 
    new RegExp(`\\b${article}\\b`).test(lowerText)
  );
  if (foundArticles.length > 0) {
    score += Math.min(foundArticles.length * 0.05, 0.1);
    reasons.push(`Contains Romanian prepositions: ${foundArticles.slice(0, 2).join(', ')}`);
  }
  
  return { score: Math.min(score, 1), reasons };
}

/**
 * Detect if text contains English indicators
 */
function detectEnglish(text: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  const lowerText = text.toLowerCase();
  
  // Check for English word endings
  if (ENGLISH_PATTERNS.ENDINGS.test(text)) {
    score += 0.2;
    reasons.push('Contains English word endings');
  }
  
  // Check for English food words
  const foundFoodWords = ENGLISH_PATTERNS.FOOD_WORDS.filter(word => 
    lowerText.includes(word)
  );
  if (foundFoodWords.length > 0) {
    score += Math.min(foundFoodWords.length * 0.15, 0.3);
    reasons.push(`Contains English food words: ${foundFoodWords.slice(0, 3).join(', ')}`);
  }
  
  // Check for English cooking methods
  const foundCookingMethods = ENGLISH_PATTERNS.COOKING_METHODS.filter(method => 
    lowerText.includes(method)
  );
  if (foundCookingMethods.length > 0) {
    score += 0.2;
    reasons.push(`Contains English cooking methods: ${foundCookingMethods[0]}`);
  }
  
  // Check for English descriptors
  const foundDescriptors = ENGLISH_PATTERNS.DESCRIPTORS.filter(desc => 
    lowerText.includes(desc)
  );
  if (foundDescriptors.length > 0) {
    score += 0.1;
    reasons.push(`Contains English descriptors: ${foundDescriptors[0]}`);
  }
  
  // Check for English articles/prepositions
  const foundArticles = ENGLISH_PATTERNS.ARTICLES_PREPOSITIONS.filter(article => 
    new RegExp(`\\b${article}\\b`).test(lowerText)
  );
  if (foundArticles.length > 0) {
    score += Math.min(foundArticles.length * 0.05, 0.1);
    reasons.push(`Contains English prepositions: ${foundArticles.slice(0, 2).join(', ')}`);
  }
  
  // Penalty for Romanian diacritics in English detection
  if (ROMANIAN_PATTERNS.DIACRITICS.test(text)) {
    score = Math.max(0, score - 0.5);
  }
  
  return { score: Math.min(score, 1), reasons };
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Detect the language of a product name
 */
export function detectLanguage(productName: string): LanguageDetectionResult {
  // Handle empty or very short strings
  if (!productName || productName.trim().length < 2) {
    return {
      language: 'ro', // Default to Romanian
      confidence: 0.1,
      reasons: ['Text too short, defaulting to Romanian']
    };
  }
  
  const romanianResult = detectRomanian(productName);
  const englishResult = detectEnglish(productName);
  
  // Determine the language based on scores
  if (romanianResult.score > englishResult.score) {
    return {
      language: 'ro',
      confidence: romanianResult.score,
      reasons: romanianResult.reasons
    };
  } else if (englishResult.score > romanianResult.score) {
    return {
      language: 'en',
      confidence: englishResult.score,
      reasons: englishResult.reasons
    };
  } else {
    // Tie or both scores are very low - default to Romanian
    return {
      language: 'ro',
      confidence: Math.max(romanianResult.score, 0.2),
      reasons: [
        'Ambiguous language detection, defaulting to Romanian',
        ...romanianResult.reasons,
        ...englishResult.reasons
      ]
    };
  }
}

/**
 * Batch detect languages for multiple product names
 */
export function batchDetectLanguages(productNames: string[]): LanguageDetectionResult[] {
  return productNames.map(name => detectLanguage(name));
}

/**
 * Get language with manual override support
 */
export function getEffectiveLanguage(
  productName: string, 
  manualOverride?: SupportedLanguage | null
): { language: SupportedLanguage; source: 'manual' | 'detected'; detection?: LanguageDetectionResult } {
  // If manual override exists, use it
  if (manualOverride) {
    return {
      language: manualOverride,
      source: 'manual'
    };
  }
  
  // Otherwise, detect the language
  const detection = detectLanguage(productName);
  return {
    language: detection.language,
    source: 'detected',
    detection
  };
}
