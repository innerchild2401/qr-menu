/**
 * Product Data Generator - Main Orchestrator
 * Combines OpenAI, language detection, and caching for optimal performance
 */

import { 
  generateProductData, 
  generateIngredientNutrition,
  isBottledDrink,
  type ProductGenerationRequest,
  type GeneratedProductData,
  type GPTUsageStats
} from './openai-client';

import { 
  detectLanguage, 
  getEffectiveLanguage,
  type SupportedLanguage 
} from './language-detector';

import {
  getCachedProductData,
  cacheProductData,
  getProductsNeedingGeneration,
  getCachedIngredientNutrition,
  cacheIngredientNutrition,
  getIngredientsNeedingNutrition,
  mapIngredientsToAllergens,
  logGPTCall,
  type CachedProduct
} from './supabase-cache';

// =============================================================================
// TYPES
// =============================================================================

export interface ProductGenerationInput {
  id: string;
  name: string;
  manual_language_override?: SupportedLanguage;
  restaurant_id?: string;
}

export interface ProductGenerationOutput {
  id: string;
  language: SupportedLanguage;
  generated_description: string;
  recipe: Array<{ ingredient: string; quantity: string }>;
  nutritional_values: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  allergens: string[];
  error?: string;
  cached?: boolean;
  processing_time_ms?: number;
  cost_estimate?: number;
}

export interface BatchGenerationResult {
  results: ProductGenerationOutput[];
  summary: {
    total_products: number;
    cached_products: number;
    generated_products: number;
    failed_products: number;
    total_cost: number;
    total_tokens: number;
    total_processing_time: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_PRODUCTS_PER_BATCH = 10;
const MAX_CONCURRENT_BATCHES = 3;
const INGREDIENT_NUTRITION_CACHE_ENABLED = true;

// =============================================================================
// SINGLE PRODUCT GENERATION
// =============================================================================

/**
 * Generate data for a single product with full caching support
 */
export async function generateSingleProductData(
  input: ProductGenerationInput
): Promise<ProductGenerationOutput> {
  const startTime = Date.now();
  const { id, name, manual_language_override, restaurant_id } = input;

  try {
    // 1. Check if product already has cached data
    const cachedData = await getCachedProductData(id);
    if (cachedData && cachedData.generated_description) {
      return {
        id,
        language: cachedData.manual_language_override || 'ro',
        generated_description: cachedData.generated_description,
        recipe: cachedData.recipe || [],
        nutritional_values: cachedData.nutrition || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
        allergens: cachedData.allergens || [],
        cached: true,
        processing_time_ms: Date.now() - startTime,
      };
    }

    // 2. Determine effective language
    const { language } = getEffectiveLanguage(name, manual_language_override);

    // 3. Check if it's a bottled drink (skip AI generation)
    if (isBottledDrink(name)) {
      const emptyResult: ProductGenerationOutput = {
        id,
        language,
        generated_description: '',
        recipe: [],
        nutritional_values: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        allergens: [],
        processing_time_ms: Date.now() - startTime,
      };

      // Cache the empty result
      await cacheProductData(id, {
        language,
        description: '',
        recipe: [],
        nutritional_values: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        estimated_allergens: [],
      }, restaurant_id);

      return emptyResult;
    }

    // 4. Generate product data using OpenAI
    const request: ProductGenerationRequest = {
      name,
      language,
      restaurant_id,
    };

    const { data: generatedData, usage } = await generateProductData(request);

    // 5. Process ingredients for better nutrition data
    const enhancedNutrition = await enhanceNutritionalData(
      generatedData.recipe,
      generatedData.nutritional_values,
      language
    );

    // 6. Map allergens
    const allergenCodes = await mapIngredientsToAllergens(
      generatedData.estimated_allergens,
      language
    );

    // 7. Cache the results
    const finalData: GeneratedProductData = {
      ...generatedData,
      nutritional_values: enhancedNutrition,
    };

    await cacheProductData(id, finalData, restaurant_id);

    // 8. Log the GPT call
    await logGPTCall(
      'product_description',
      request as unknown as Record<string, unknown>,
      generatedData as unknown as Record<string, unknown>,
      undefined,
      usage,
      restaurant_id
    );

    return {
      id,
      language,
      generated_description: generatedData.description,
      recipe: generatedData.recipe,
      nutritional_values: enhancedNutrition,
      allergens: allergenCodes,
      processing_time_ms: Date.now() - startTime,
      cost_estimate: usage.estimated_cost_usd,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the error
    await logGPTCall(
      'product_description',
      { name, language: manual_language_override || 'detected' } as Record<string, unknown>,
      undefined,
      errorMessage,
      undefined,
      restaurant_id
    );

    return {
      id,
      language: manual_language_override || 'ro',
      generated_description: '',
      recipe: [],
      nutritional_values: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      allergens: [],
      error: errorMessage,
      processing_time_ms: Date.now() - startTime,
    };
  }
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

/**
 * Generate data for multiple products with batching and concurrency limits
 */
export async function generateBatchProductData(
  inputs: ProductGenerationInput[]
): Promise<BatchGenerationResult> {
  const startTime = Date.now();
  
  // Validate batch size
  if (inputs.length > MAX_PRODUCTS_PER_BATCH) {
    throw new Error(`Batch size exceeds limit. Maximum ${MAX_PRODUCTS_PER_BATCH} products per batch.`);
  }

  // 1. Check which products need generation (filter out cached ones)
  const productIds = inputs.map(input => input.id);
  const uncachedProducts = await getProductsNeedingGeneration(productIds);
  const uncachedIds = new Set(uncachedProducts.map(p => p.id));

  const results: ProductGenerationOutput[] = [];
  let totalCost = 0;
  const totalTokens = 0; // Will be calculated in future iterations
  let cachedCount = 0;
  let generatedCount = 0;
  let failedCount = 0;

  // 2. Process cached products first
  for (const input of inputs) {
    if (!uncachedIds.has(input.id)) {
      try {
        const cachedResult = await generateSingleProductData(input);
        results.push(cachedResult);
        if (cachedResult.cached) {
          cachedCount++;
        }
      } catch (error) {
        failedCount++;
        results.push({
          id: input.id,
          language: 'ro',
          generated_description: '',
          recipe: [],
          nutritional_values: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          allergens: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  // 3. Process uncached products in controlled batches
  const uncachedInputs = inputs.filter(input => uncachedIds.has(input.id));
  
  for (let i = 0; i < uncachedInputs.length; i += MAX_CONCURRENT_BATCHES) {
    const batch = uncachedInputs.slice(i, i + MAX_CONCURRENT_BATCHES);
    
    const batchPromises = batch.map(async (input) => {
      try {
        const result = await generateSingleProductData(input);
        if (result.error) {
          failedCount++;
        } else {
          generatedCount++;
          if (result.cost_estimate) totalCost += result.cost_estimate;
        }
        return result;
      } catch (error) {
        failedCount++;
        return {
          id: input.id,
          language: input.manual_language_override || 'ro',
          generated_description: '',
          recipe: [],
          nutritional_values: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          allergens: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ProductGenerationOutput;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const summary = {
    total_products: inputs.length,
    cached_products: cachedCount,
    generated_products: generatedCount,
    failed_products: failedCount,
    total_cost: totalCost,
    total_tokens: totalTokens,
    total_processing_time: Date.now() - startTime,
  };

  return { results, summary };
}

// =============================================================================
// NUTRITION ENHANCEMENT
// =============================================================================

/**
 * Enhance nutritional data using ingredient-level caching
 */
async function enhanceNutritionalData(
  recipe: Array<{ ingredient: string; quantity: string }>,
  baseNutrition: { calories: number; protein: number; carbs: number; fat: number },
  language: SupportedLanguage
): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
  if (!INGREDIENT_NUTRITION_CACHE_ENABLED || recipe.length === 0) {
    return baseNutrition;
  }

  try {
    // Extract ingredient names
    const ingredientNames = recipe.map(item => item.ingredient);
    
    // Check which ingredients need nutrition data
    const uncachedIngredients = await getIngredientsNeedingNutrition(
      ingredientNames, 
      language
    );

    // Generate nutrition data for uncached ingredients
    for (const ingredient of uncachedIngredients) {
      try {
        const { data: nutritionData } = await generateIngredientNutrition({
          ingredient,
          language,
        });

        await cacheIngredientNutrition(nutritionData);
      } catch (error) {
        console.error(`Failed to generate nutrition for ingredient ${ingredient}:`, error);
        // Continue with other ingredients
      }
    }

    // For now, return the base nutrition (ingredient-level calculation would be complex)
    // In a production system, you might want to calculate based on quantities and portions
    return baseNutrition;

  } catch (error) {
    console.error('Error enhancing nutritional data:', error);
    return baseNutrition;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate input data
 */
export function validateProductInput(input: ProductGenerationInput): string | null {
  if (!input.id || typeof input.id !== 'string') {
    return 'Product ID is required and must be a string';
  }

  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
    return 'Product name is required and must be a non-empty string';
  }

  if (input.name.length > 200) {
    return 'Product name must be less than 200 characters';
  }

  if (input.manual_language_override && !['ro', 'en'].includes(input.manual_language_override)) {
    return 'Language override must be either "ro" or "en"';
  }

  return null;
}

/**
 * Validate batch input
 */
export function validateBatchInput(inputs: ProductGenerationInput[]): string | null {
  if (!Array.isArray(inputs)) {
    return 'Input must be an array';
  }

  if (inputs.length === 0) {
    return 'At least one product is required';
  }

  if (inputs.length > MAX_PRODUCTS_PER_BATCH) {
    return `Maximum ${MAX_PRODUCTS_PER_BATCH} products allowed per batch`;
  }

  for (let i = 0; i < inputs.length; i++) {
    const validationError = validateProductInput(inputs[i]);
    if (validationError) {
      return `Product at index ${i}: ${validationError}`;
    }
  }

  // Check for duplicate IDs
  const ids = inputs.map(input => input.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    return 'Duplicate product IDs are not allowed';
  }

  return null;
}
