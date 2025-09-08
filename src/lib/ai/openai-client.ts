/**
 * OpenAI GPT-4o-mini Integration for SmartMenu
 * Generates product descriptions, recipes, and nutritional data
 */

import { env } from '../env';

// =============================================================================
// TYPES
// =============================================================================

export interface ProductGenerationRequest {
  name: string;
  language: 'ro' | 'en';
  restaurant_id?: string;
}

export interface IngredientNutritionRequest {
  ingredient: string;
  language: 'ro' | 'en';
}

export interface GeneratedProductData {
  language: 'ro' | 'en';
  description: string;
  recipe: Array<{
    ingredient: string;
    quantity: string;
  }>;
  nutritional_values: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  estimated_allergens: string[]; // Ingredient names that might contain allergens
}

export interface IngredientNutrition {
  name: string;
  language: 'ro' | 'en';
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

export interface GPTUsageStats {
  tokens_used: number;
  estimated_cost_usd: number;
  processing_time_ms: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1000;

// Pricing for gpt-4o-mini (as of 2024)
const COST_PER_INPUT_TOKEN = 0.000150 / 1000; // $0.000150 per 1K tokens
const COST_PER_OUTPUT_TOKEN = 0.000600 / 1000; // $0.000600 per 1K tokens

// System prompts
const PRODUCT_SYSTEM_PROMPT = `You are an expert food menu assistant for SmartMenu.
For each food or cocktail, generate:
1. A short description in the requested language (max 150 characters)
2. A structured recipe with ingredient names and quantities
3. Nutritional values per portion: calories, protein, carbs, fat (in grams except calories)
4. List potential allergen-containing ingredients

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use the exact language requested (Romanian or English)
- For cocktails, include all liquid and garnish ingredients
- Nutritional values should be realistic for a typical serving
- Include ingredient names that might contain common allergens

Example Romanian response:
{
  "description": "Burger suculent cu piept de pui la grătar și legume proaspete",
  "recipe": [
    {"ingredient": "Piept de pui", "quantity": "150g"},
    {"ingredient": "Chiflă", "quantity": "1 buc"}
  ],
  "nutritional_values": {"calories": 420, "protein": 28, "carbs": 32, "fat": 18},
  "estimated_allergens": ["Chiflă", "Maioneză"]
}`;

const INGREDIENT_SYSTEM_PROMPT = `You are a nutrition expert. Provide nutritional values per 100g for the given ingredient.
Return ONLY valid JSON with calories, protein, carbs, and fat values.
Example: {"calories_per_100g": 165, "protein_per_100g": 31.0, "carbs_per_100g": 0.0, "fat_per_100g": 3.6}`;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if OpenAI is available
 */
export function isOpenAIAvailable(): boolean {
  return env.HAS_OPENAI;
}

/**
 * Calculate estimated cost based on token usage
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN);
}

/**
 * Check if product name suggests a bottled drink
 */
export function isBottledDrink(productName: string): boolean {
  const name = productName.toLowerCase();
  
  const bottledDrinkPatterns = [
    // Soft drinks
    /\b(pepsi|coca|cola|coke|fanta|sprite|7up|mirinda)\b/,
    // Beer
    /\b(beer|bere|heineken|corona|stella|budweiser|becks|carlsberg)\b/,
    // Water
    /\b(water|apa|evian|perrier|san pellegrino|aqua)\b/,
    // Wine
    /\b(wine|vin|prosecco|champagne|sauvignon|chardonnay)\b/,
    // Juices
    /\b(juice|suc|tropicana|innocent|fresh)\b/,
    // Energy drinks
    /\b(energy|red bull|monster|burn|hell)\b/,
    // Specific bottle indicators
    /\b(bottle|sticla|330ml|500ml|250ml|0\.5l|0\.33l)\b/
  ];
  
  return bottledDrinkPatterns.some(pattern => pattern.test(name));
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Generate product data using OpenAI GPT-4o-mini
 */
export async function generateProductData(
  request: ProductGenerationRequest
): Promise<{ data: GeneratedProductData; usage: GPTUsageStats }> {
  const startTime = Date.now();
  
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Check if it's a bottled drink - skip AI generation
  if (isBottledDrink(request.name)) {
    return {
      data: {
        language: request.language,
        description: '',
        recipe: [],
        nutritional_values: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
        estimated_allergens: [],
      },
      usage: {
        tokens_used: 0,
        estimated_cost_usd: 0,
        processing_time_ms: Date.now() - startTime,
      }
    };
  }
  
  const prompt = request.language === 'ro' 
    ? `Generează date pentru produsul: "${request.name}"`
    : `Generate data for product: "${request.name}"`;
  
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: PRODUCT_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    // Parse the JSON response
    let generatedData: GeneratedProductData;
    try {
      const parsed = JSON.parse(content);
      generatedData = {
        language: request.language,
        description: parsed.description || '',
        recipe: parsed.recipe || [],
        nutritional_values: {
          calories: parsed.nutritional_values?.calories || 0,
          protein: parsed.nutritional_values?.protein || 0,
          carbs: parsed.nutritional_values?.carbs || 0,
          fat: parsed.nutritional_values?.fat || 0,
        },
        estimated_allergens: parsed.estimated_allergens || [],
      };
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response: ${parseError}`);
    }
    
    // Calculate usage statistics
    const usage: GPTUsageStats = {
      tokens_used: result.usage?.total_tokens || 0,
      estimated_cost_usd: calculateCost(
        result.usage?.prompt_tokens || 0,
        result.usage?.completion_tokens || 0
      ),
      processing_time_ms: Date.now() - startTime,
    };
    
    return { data: generatedData, usage };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('OpenAI generation error:', error);
    
    // Re-throw with additional context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const enhancedError = new Error(`Product generation failed: ${errorMessage}`) as Error & { processingTime?: number };
    enhancedError.processingTime = processingTime;
    throw enhancedError;
  }
}

/**
 * Generate nutritional data for an individual ingredient
 */
export async function generateIngredientNutrition(
  request: IngredientNutritionRequest
): Promise<{ data: IngredientNutrition; usage: GPTUsageStats }> {
  const startTime = Date.now();
  
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  const prompt = request.language === 'ro'
    ? `Ingredientul: "${request.ingredient}"`
    : `Ingredient: "${request.ingredient}"`;
  
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: INGREDIENT_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.3, // Lower temperature for more consistent nutritional data
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    // Parse the JSON response
    let nutritionData: IngredientNutrition;
    try {
      const parsed = JSON.parse(content);
      nutritionData = {
        name: request.ingredient,
        language: request.language,
        calories_per_100g: parsed.calories_per_100g || 0,
        protein_per_100g: parsed.protein_per_100g || 0,
        carbs_per_100g: parsed.carbs_per_100g || 0,
        fat_per_100g: parsed.fat_per_100g || 0,
      };
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response: ${parseError}`);
    }
    
    // Calculate usage statistics
    const usage: GPTUsageStats = {
      tokens_used: result.usage?.total_tokens || 0,
      estimated_cost_usd: calculateCost(
        result.usage?.prompt_tokens || 0,
        result.usage?.completion_tokens || 0
      ),
      processing_time_ms: Date.now() - startTime,
    };
    
    return { data: nutritionData, usage };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('OpenAI ingredient nutrition error:', error);
    
    // Re-throw with additional context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const enhancedError = new Error(`Ingredient nutrition generation failed: ${errorMessage}`) as Error & { processingTime?: number };
    enhancedError.processingTime = processingTime;
    throw enhancedError;
  }
}

/**
 * Batch generate product data with concurrency limits
 */
export async function batchGenerateProductData(
  requests: ProductGenerationRequest[],
  maxConcurrency: number = 3
): Promise<Array<{ 
  request: ProductGenerationRequest; 
  result?: { data: GeneratedProductData; usage: GPTUsageStats }; 
  error?: string 
}>> {
  const results: Array<{ 
    request: ProductGenerationRequest; 
    result?: { data: GeneratedProductData; usage: GPTUsageStats }; 
    error?: string 
  }> = [];
  
  // Process in chunks to respect concurrency limits
  for (let i = 0; i < requests.length; i += maxConcurrency) {
    const chunk = requests.slice(i, i + maxConcurrency);
    
    const chunkPromises = chunk.map(async (request) => {
      try {
        const result = await generateProductData(request);
        return { request, result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { request, error: errorMessage };
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }
  
  return results;
}
