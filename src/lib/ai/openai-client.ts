/**
 * OpenAI GPT-4o-mini Integration for SmartMenu
 * Generates product descriptions, recipes, and nutritional data
 * 
 * IMPORTANT: See docs/gpt-prompt-uniqueness.md for critical information about
 * GPT prompt uniqueness requirements and caching behavior.
 */

import { env } from '../env';
import { normalizeIngredients } from './ingredient-normalizer';
import { trackTokenConsumption, extractTokenUsageFromResponse } from '../api/token-tracker';

// =============================================================================
// TYPES
// =============================================================================

export interface ProductGenerationRequest {
  name: string;
  language: 'ro' | 'en';
  restaurant_id?: string;
  regenerationMode?: 'description' | 'recipe';
  existingRecipe?: Array<{
    ingredient: string;
    quantity: string;
  }>;
  userId?: string;
  userEmail?: string;
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

CRITICAL LANGUAGE REQUIREMENTS:
- Return ONLY valid JSON, no other text
- ALL content must be in the requested language (Romanian or English)
- Description, ingredient names, and allergen names must ALL be in the requested language
- Do NOT mix languages - use only the requested language throughout
- For Romanian: use Romanian ingredient names (e.g., "Chiflă" not "Bun", "Carne de vită" not "Beef")
- For English: use English ingredient names (e.g., "Beef" not "Carne de vită")

CRITICAL RECIPE REQUIREMENTS:
- Include ONLY consumable ingredients that are actually eaten by the customer
- NEVER include cooking mediums like:
  * Oil for frying (vegetable oil, olive oil, etc.)
  * Water for boiling
  * Cooking sprays
  * Pan greasing materials
- NEVER include equipment, utensils, or cooking processes
- Focus on the final assembled product, not the cooking process
- For fried items, estimate reasonable oil absorption (typically 10-20% of frying oil)

EXAMPLES OF WHAT TO INCLUDE:
✅ Chicken breast, bread, lettuce, tomato, cheese, sauce
✅ Flour, eggs, spices (if they become part of the final product)
✅ Marinades, seasonings, condiments

EXAMPLES OF WHAT TO EXCLUDE:
❌ "Vegetable oil for frying"
❌ "Water for boiling"
❌ "Oil for cooking"
❌ "Cooking spray"

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

const DESCRIPTION_ONLY_SYSTEM_PROMPT = `You are an expert food menu assistant for SmartMenu.
You will be provided with an existing recipe and must:
1. Generate a NEW, engaging description in the requested language (max 150 characters)
2. Recalculate nutritional values based on the EXACT ingredients provided
3. List potential allergen-containing ingredients from the provided recipe

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no other text
- Do NOT modify the recipe - use the provided ingredients exactly as-is
- ALL content must be in the requested language (Romanian or English)
- Description and allergen names must be in the requested language
- For Romanian: use Romanian ingredient names
- For English: use English ingredient names

NUTRITIONAL CALCULATION NOTES:
- Calculate based on the actual consumable ingredients only
- If the recipe includes cooking mediums (oil for frying, water, etc.), exclude them from nutritional calculations
- For fried items, estimate reasonable oil absorption (typically 10-20% of any frying oil)
- Focus on ingredients that are actually consumed by the customer

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
  
  const timestamp = new Date().toISOString();
  const randomId = Math.random().toString(36).substring(7);
  
  // Determine which system prompt and user prompt to use based on regeneration mode
  let systemPrompt: string;
  let userPrompt: string;
  
  if (request.regenerationMode === 'description' && request.existingRecipe) {
    // Description-only mode: use existing recipe
    systemPrompt = DESCRIPTION_ONLY_SYSTEM_PROMPT;
    
    // Normalize ingredients before using them
    console.log('🔧 Normalizing ingredients before processing...');
    const normalizedIngredients = await normalizeIngredients(request.existingRecipe, request.language, request.restaurant_id);
    console.log('🔧 Normalized ingredients:', normalizedIngredients);
    
    const recipeText = normalizedIngredients.map(ing => `${ing.normalized}: ${ing.quantity}`).join(', ');
    userPrompt = request.language === 'ro' 
      ? `Generează o descriere nouă și valorile nutriționale pentru produsul: "${request.name}" folosind EXACT această rețetă: ${recipeText}. Do NOT modifica rețeta. Folosește ingredientele exacte pentru a crea descrierea și datele nutriționale. Timestamp: ${timestamp} | Request ID: ${randomId}`
      : `Generate a new description and nutritional values for product: "${request.name}" using EXACTLY this recipe: ${recipeText}. Do NOT modify the recipe. Use these exact ingredients to create the description and nutritional data. Timestamp: ${timestamp} | Request ID: ${randomId}`;
    
    // Update the request with normalized ingredients for the final data
    request.existingRecipe = normalizedIngredients.map(ing => ({
      ingredient: ing.normalized,
      quantity: ing.quantity
    }));
  } else {
    // Full generation mode: generate everything
    systemPrompt = PRODUCT_SYSTEM_PROMPT;
    userPrompt = request.language === 'ro' 
      ? `Generează date pentru produsul: "${request.name}" în limba română. Toate răspunsurile trebuie să fie în română, inclusiv descrierea, ingredientele și alerganii. Timestamp: ${timestamp} | Request ID: ${randomId}`
      : `Generate data for product: "${request.name}" in English. All responses must be in English, including description, ingredients, and allergens. Timestamp: ${timestamp} | Request ID: ${randomId}`;
  }
  
  // Debug logging
  console.log('🤖 GPT Generation Debug:');
  console.log(`   Product: ${request.name}`);
  console.log(`   Language: ${request.language}`);
  console.log(`   Regeneration Mode: ${request.regenerationMode || 'full'}`);
  console.log(`   Has Existing Recipe: ${!!request.existingRecipe}`);
  console.log(`   Prompt: ${userPrompt}`);
  console.log(`   System Prompt: ${systemPrompt.substring(0, 100)}...`);
  console.log(`   Request body:`, JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
  }, null, 2));
  console.log(`   Unique request ID: ${randomId}`);
  console.log(`   Timestamp: ${timestamp}`);
  
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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
    
    // Debug logging
    console.log('🤖 GPT Response Debug:');
    console.log(`   Raw response: ${JSON.stringify(result, null, 2)}`);
    console.log(`   Content: ${content}`);
    console.log(`   Response ID: ${result.id}`);
    console.log(`   Response created: ${result.created}`);
    console.log(`   Description: "${JSON.parse(content).description}"`);
    console.log(`   Description length: ${JSON.parse(content).description?.length || 0}`);
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Track token consumption
    try {
      const tokenUsage = extractTokenUsageFromResponse(result);
      await trackTokenConsumption({
        userId: request.userId || request.restaurant_id || 'unknown',
        userEmail: request.userEmail || 'unknown@example.com',
        apiEndpoint: '/api/generate-product-data',
        requestId: result.id,
        usage: tokenUsage,
        model: 'gpt-4o-mini'
      });
    } catch (error) {
      console.error('Failed to track token consumption:', error);
      // Don't fail the main request if tracking fails
    }
    
    // Parse the JSON response
    let generatedData: GeneratedProductData;
    try {
      const parsed = JSON.parse(content);
      
      // Normalize generated recipe ingredients
      let normalizedRecipe = parsed.recipe || [];
      if (normalizedRecipe.length > 0) {
        console.log('🔧 Normalizing generated recipe ingredients...');
        const normalizedIngredients = await normalizeIngredients(normalizedRecipe, request.language, request.restaurant_id);
        normalizedRecipe = normalizedIngredients.map(ing => ({
          ingredient: ing.normalized,
          quantity: ing.quantity
        }));
        console.log('🔧 Normalized recipe:', normalizedRecipe);
      }
      
      // For description-only mode, use the normalized existing recipe
      const finalRecipe = (request.regenerationMode === 'description' && request.existingRecipe) 
        ? request.existingRecipe 
        : normalizedRecipe;
      
      generatedData = {
        language: request.language,
        description: parsed.description || '',
        recipe: finalRecipe,
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

    // Track token consumption
    try {
      const tokenUsage = extractTokenUsageFromResponse(result);
      await trackTokenConsumption({
        userId: '00000000-0000-0000-0000-000000000000', // Use a valid UUID for system operations
        userEmail: 'system@smartmenu.app',
        apiEndpoint: '/api/generate-ingredient-nutrition',
        requestId: result.id,
        usage: tokenUsage,
        model: 'gpt-4o-mini'
      });
    } catch (error) {
      console.error('Failed to track token consumption for ingredient nutrition:', error);
      // Don't fail the main request if tracking fails
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
