/**
 * Product Data Generator - Main Orchestrator
 * Combines OpenAI, language detection, and caching for optimal performance
 * 
 * IMPORTANT: See docs/gpt-prompt-uniqueness.md for critical information about
 * GPT prompt uniqueness requirements and caching behavior.
 */

import { 
  generateProductData, 
  generateIngredientNutrition,
  type ProductGenerationRequest,
  type GeneratedProductData
} from './openai-client';

import { 
  getEffectiveLanguage,
  type SupportedLanguage 
} from './language-detector';

import {
  getCachedProductData,
  cacheProductData,
  getProductsNeedingGeneration,
  cacheIngredientNutrition,
  getIngredientsNeedingNutrition,
  mapIngredientsToAllergens,
  logGPTCall,
  getGPTUsageStats
} from './supabase-cache';
import { supabaseAdmin } from '../supabase-server';

// =============================================================================
// TYPES
// =============================================================================

export interface ProductGenerationInput {
  id: string;
  name: string;
  manual_language_override?: SupportedLanguage;
  restaurant_id: string;
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
const MAX_CONCURRENT_REQUESTS = 3; // Max simultaneous GPT calls
const BATCH_RETRY_COUNT = 2; // Number of retries for failed requests
const RETRY_DELAY_MS = 1000; // Base delay between retries (exponential backoff)
const INGREDIENT_NUTRITION_CACHE_ENABLED = true;
const COST_THRESHOLD_PER_RESTAURANT_DAILY = 10.0; // $10 daily limit per restaurant

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Enhanced bottled drink detection with comprehensive patterns
 */
function isBottledDrinkEnhanced(productName: string): boolean {
  const name = productName.toLowerCase().trim();
  
  const bottledDrinkPatterns = [
    // Specific brand names
    /\b(pepsi|coca|cola|coke|fanta|sprite|7up|mirinda|schweppes)\b/,
    // Beer brands and terms
    /\b(beer|bere|heineken|corona|stella|budweiser|becks|carlsberg|guinness|amstel)\b/,
    // Water brands and terms
    /\b(water|apa|evian|perrier|san pellegrino|aqua|dorna|borsec)\b/,
    // Wine and alcohol
    /\b(wine|vin|prosecco|champagne|sauvignon|chardonnay|whiskey|vodka|rum|gin)\b/,
    // Juices
    /\b(juice|suc|tropicana|innocent|fresh|orange|apple|grape)\b/,
    // Energy drinks
    /\b(energy|red bull|monster|burn|hell|rockstar)\b/,
    // Volume indicators (strong indicators of bottled drinks)
    /\b(bottle|sticla|330ml|500ml|250ml|750ml|1l|1\.5l|0\.5l|0\.33l|can|doza)\b/,
    // Package descriptors
    /\b(bottled|canned|draft|draught|tap)\b/
  ];
  
  return bottledDrinkPatterns.some(pattern => pattern.test(name));
}

/**
 * Check if restaurant has exceeded daily cost threshold
 */
async function checkCostThreshold(restaurantId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stats = await getGPTUsageStats(restaurantId, today, today);
    return stats.totalCost < COST_THRESHOLD_PER_RESTAURANT_DAILY;
  } catch (error) {
    console.error('Error checking cost threshold:', error);
    // Allow generation if we can't check (fail open)
    return true;
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = BATCH_RETRY_COUNT,
  baseDelay: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, error);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Process products for generation based on scenario
 */
function processProductsForGeneration(
  products: Array<{ id: string; name: string; has_recipe?: boolean; manual_language_override?: SupportedLanguage }>,
  scenario: 'new' | 'regenerate_all' | 'recipe_edited' | 'force',
  primaryLanguage: SupportedLanguage
): Array<{ id: string; name: string; manual_language_override?: SupportedLanguage; reason: string }> {
  return products
    .map(product => {
      let shouldGenerate = false;
      let reason = '';

      // Only process products that have recipes (if has_recipe column exists)
      // Skip only if explicitly set to false, allow null/undefined (default behavior)
      if (product.has_recipe === false) {
        shouldGenerate = false;
        reason = 'No recipe - skipping';
      } else {
        switch (scenario) {
          case 'new':
            // Always generate for new products with recipes
            shouldGenerate = true;
            reason = 'New product with recipe';
            break;

          case 'regenerate_all':
            // Always regenerate for products with recipes to ensure consistency
            // This ensures AI content is updated when product names or recipes change
            shouldGenerate = true;
            reason = 'Regenerate all - ensuring consistency';
            break;

          case 'recipe_edited':
            // Only recalculate nutrition and allergens, skip description if unchanged
            shouldGenerate = true;
            reason = 'Recipe edited - nutrition update';
            break;

          case 'force':
            // Force regeneration regardless of existing data
            shouldGenerate = true;
            reason = 'Force regeneration';
            break;
        }
      }

      if (shouldGenerate) {
        return {
          id: product.id,
          name: product.name,
          manual_language_override: product.manual_language_override || primaryLanguage,
          reason
        };
      }
      return null;
    })
    .filter((product): product is NonNullable<typeof product> => product !== null);
}

/**
 * Intelligent product filtering for different generation scenarios
 */
export async function getProductsForGeneration(
  productIds: string[],
  scenario: 'new' | 'regenerate_all' | 'recipe_edited' | 'force',
  restaurantId?: string
): Promise<Array<{ id: string; name: string; manual_language_override?: SupportedLanguage; reason: string }>> {
  try {
    console.log('getProductsForGeneration called with:', { productIds, scenario, restaurantId });
    
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, description, generated_description, recipe, manual_language_override, ai_generated_at, has_recipe, restaurant_id')
      .in('id', productIds);

    console.log('getProductsForGeneration query result:', { products, error });

    if (error) {
      console.error('Error fetching products for generation:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      
      // If has_recipe column doesn't exist, try without it
      if (error.message && (error.message.includes('has_recipe') || error.message.includes('column') || error.code === 'PGRST116')) {
        console.log('has_recipe column not found, trying without it...');
        const { data: productsWithoutRecipe, error: errorWithoutRecipe } = await supabaseAdmin
          .from('products')
          .select('id, name, description, generated_description, recipe, manual_language_override, ai_generated_at, restaurant_id')
          .in('id', productIds);
        
        if (errorWithoutRecipe) {
          console.error('Error fetching products without has_recipe:', errorWithoutRecipe);
          return [];
        }
        
        console.log('Successfully fetched products without has_recipe:', productsWithoutRecipe?.length || 0);
        
        // Add has_recipe as undefined for all products
        const productsWithUndefinedRecipe = productsWithoutRecipe?.map(p => ({ ...p, has_recipe: undefined })) || [];
        
        // Determine primary language for fallback case
        let fallbackPrimaryLanguage: SupportedLanguage = 'ro';
        if (restaurantId && productsWithUndefinedRecipe.length > 0) {
          const sampleNames = productsWithUndefinedRecipe.slice(0, 5).map(p => p.name);
          const languageResult = getEffectiveLanguage(sampleNames.join(' '));
          fallbackPrimaryLanguage = languageResult.language;
        }
        
        return processProductsForGeneration(productsWithUndefinedRecipe, scenario, fallbackPrimaryLanguage);
      }
      return [];
    }

    // Determine the primary language for the restaurant based on product names
    let primaryLanguage: SupportedLanguage = 'ro'; // Default to Romanian
    if (restaurantId && products.length > 0) {
      try {
        // Sample a few product names to determine the primary language
        const sampleNames = products.slice(0, 5).map(p => p.name);
        const languageResult = getEffectiveLanguage(sampleNames.join(' '));
        primaryLanguage = languageResult.language;
        console.log('Detected primary language for restaurant:', primaryLanguage);
      } catch (languageError) {
        console.error('Error in language detection:', languageError);
        // Continue with default language
      }
    }

    const result = processProductsForGeneration(products, scenario, primaryLanguage);
    console.log('getProductsForGeneration final result:', result);
    return result;

  } catch (error) {
    console.error('Error in getProductsForGeneration:', error);
    return [];
  }
}

// =============================================================================
// SINGLE PRODUCT GENERATION
// =============================================================================

/**
 * Generate data for a single product with full caching support
 */
export async function generateSingleProductData(
  input: ProductGenerationInput,
  forceRegeneration: boolean = false
): Promise<ProductGenerationOutput> {
  const startTime = Date.now();
  const { id, name, manual_language_override, restaurant_id } = input;

  try {
    // 1. Check if product already has cached data (skip if force regeneration)
    if (!forceRegeneration) {
      const cachedData = await getCachedProductData(id);
      
      // Only use cached data if the product name and language override haven't changed
      // This ensures regeneration happens when name, recipe, or language override is updated
      if (cachedData && cachedData.generated_description && cachedData.name === name && 
          cachedData.manual_language_override === manual_language_override) {
        console.log(`📦 Using cached data for ${name} (language: ${cachedData.manual_language_override})`);
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
    } else {
      console.log(`🔥 FORCE REGENERATION: Bypassing cache for ${name}`);
      console.log(`🔥 FORCE REGENERATION: Product ID: ${id}, Name: ${name}, Language Override: ${manual_language_override}`);
    }

    // 2. Check cost threshold first
    const canAffordGeneration = await checkCostThreshold(restaurant_id);
    if (!canAffordGeneration) {
      throw new Error(`Daily cost threshold exceeded for restaurant ${restaurant_id}`);
    }

    // 3. Determine effective language
    const { language } = getEffectiveLanguage(name, manual_language_override);
    console.log(`🔄 Generating new data for ${name} (language: ${language}, manual_override: ${manual_language_override})`);

    // 4. Check if it's a bottled drink (skip AI generation)
    if (isBottledDrinkEnhanced(name)) {
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
      }, restaurant_id, manual_language_override);

      return emptyResult;
    }

    // 5. Generate product data using OpenAI with retry logic
    const request: ProductGenerationRequest = {
      name,
      language,
      restaurant_id,
    };

    console.log(`🔥 FORCE REGENERATION: Making API call for ${name} with request:`, request);
    const { data: generatedData, usage } = await withRetry(async () => {
      return await generateProductData(request);
    });
    console.log(`🔥 FORCE REGENERATION: API call completed for ${name}, got data:`, {
      hasDescription: !!generatedData.description,
      descriptionLength: generatedData.description?.length || 0,
      recipeLength: generatedData.recipe?.length || 0
    });

    // 6. Process ingredients for better nutrition data
    const enhancedNutrition = await enhanceNutritionalData(
      generatedData.recipe,
      generatedData.nutritional_values,
      language
    );

    // 7. Map allergens
    const allergenCodes = await mapIngredientsToAllergens(
      generatedData.estimated_allergens,
      language
    );

    // 7. Cache the results
    const finalData: GeneratedProductData = {
      ...generatedData,
      nutritional_values: enhancedNutrition,
    };

    console.log(`🔥 FORCE REGENERATION: Caching results for ${name}:`, {
      id,
      description: finalData.description,
      descriptionLength: finalData.description?.length || 0,
      manualLanguageOverride: manual_language_override
    });
    const cacheResult = await cacheProductData(id, finalData, restaurant_id, manual_language_override);
    console.log(`🔥 FORCE REGENERATION: Cache result for ${name}:`, cacheResult);
    
    // Verify the database update by reading back the data
    if (cacheResult) {
      console.log(`🔍 FORCE REGENERATION: Verifying database update for ${name}...`);
      const verificationData = await getCachedProductData(id);
      console.log(`🔍 FORCE REGENERATION: Verification result for ${name}:`, {
        id: verificationData?.id,
        hasDescription: !!verificationData?.generated_description,
        description: verificationData?.generated_description,
        lastUpdated: verificationData?.ai_last_updated
      });
      
      // Also do a direct database query to double-check
      console.log(`🔍 FORCE REGENERATION: Direct database check for ${name}...`);
      try {
        const { data: directCheck, error: directError } = await supabaseAdmin
          .from('products')
          .select('id, generated_description, ai_last_updated')
          .eq('id', id)
          .single();
        
        if (directError) {
          console.error(`❌ Direct database check failed for ${name}:`, directError);
        } else {
          console.log(`🔍 FORCE REGENERATION: Direct database result for ${name}:`, {
            id: directCheck?.id,
            hasDescription: !!directCheck?.generated_description,
            description: directCheck?.generated_description,
            lastUpdated: directCheck?.ai_last_updated
          });
        }
      } catch (error) {
        console.error(`❌ Direct database check error for ${name}:`, error);
      }
    }

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
      cached: false, // Force regeneration always returns false
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
  inputs: ProductGenerationInput[],
  forceRegeneration: boolean = false
): Promise<BatchGenerationResult> {
  const startTime = Date.now();
  
  console.log('🚀 BATCH GENERATION DEBUG:');
  console.log('🚀 Inputs count:', inputs.length);
  console.log('🚀 Force regeneration:', forceRegeneration);
  console.log('🚀 First input:', inputs[0]);
  
  // Validate batch size
  if (inputs.length > MAX_PRODUCTS_PER_BATCH) {
    throw new Error(`Batch size exceeds limit. Maximum ${MAX_PRODUCTS_PER_BATCH} products per batch.`);
  }

  // 1. Check which products need generation (filter out cached ones unless forcing)
  const productIds = inputs.map(input => input.id);
  let uncachedProducts: Array<{ id: string; name: string; manual_language_override?: SupportedLanguage }> = [];
  let uncachedIds: Set<string> = new Set();
  
  if (forceRegeneration) {
    // For force regeneration, treat all products as uncached
    console.log('🔥 FORCE REGENERATION PATH: Treating all products as uncached');
    uncachedProducts = inputs.map(input => ({
      id: input.id,
      name: input.name,
      manual_language_override: input.manual_language_override
    }));
    uncachedIds = new Set(inputs.map(input => input.id));
    console.log('🔥 Force regeneration - uncached products:', uncachedProducts);
    console.log('🔥 Force regeneration - uncached IDs:', Array.from(uncachedIds));
  } else {
    // Normal behavior - filter out cached products
    console.log('📋 NORMAL PATH: Filtering out cached products');
    uncachedProducts = await getProductsNeedingGeneration(productIds);
    uncachedIds = new Set(uncachedProducts.map(p => p.id));
    console.log('📋 Normal - uncached products:', uncachedProducts);
    console.log('📋 Normal - uncached IDs:', Array.from(uncachedIds));
  }

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
        const cachedResult = await generateSingleProductData(input, forceRegeneration);
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

  // 3. Process uncached products with enhanced concurrency control
  const uncachedInputs = inputs.filter(input => uncachedIds.has(input.id));
  
  if (uncachedInputs.length > 0) {
    console.log(`Processing ${uncachedInputs.length} uncached products with max ${MAX_CONCURRENT_REQUESTS} concurrent requests`);
  }
  
  // Use semaphore-like pattern to limit concurrent GPT calls
  for (let i = 0; i < uncachedInputs.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = uncachedInputs.slice(i, i + MAX_CONCURRENT_REQUESTS);
    
    const batchPromises = batch.map(async (input) => {
      try {
        console.log(`🔥 BATCH: Calling generateSingleProductData for ${input.name} with forceRegeneration: ${forceRegeneration}`);
        const result = await generateSingleProductData(input, forceRegeneration);
        console.log(`🔥 BATCH: Result for ${input.name}:`, {
          id: result.id,
          cached: result.cached,
          hasDescription: !!result.generated_description,
          error: result.error
        });
        if (result.error) {
          failedCount++;
        } else {
          generatedCount++;
          if (result.cost_estimate) totalCost += result.cost_estimate;
        }
        return result;
      } catch (error) {
        console.error(`🔥 BATCH: Error for ${input.name}:`, error);
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
    
    // Add delay between batches to respect API rate limits
    if (i + MAX_CONCURRENT_REQUESTS < uncachedInputs.length) {
      console.log(`Completed batch ${Math.floor(i / MAX_CONCURRENT_REQUESTS) + 1}, waiting before next batch...`);
      await sleep(1000); // 1 second delay between batches
    }
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

    // Generate nutrition data for uncached ingredients with retry and concurrency control
    if (uncachedIngredients.length > 0) {
      console.log(`Generating nutrition data for ${uncachedIngredients.length} uncached ingredients`);
      
      // Process ingredients in smaller batches to avoid overwhelming the API
      const ingredientBatchSize = Math.min(3, MAX_CONCURRENT_REQUESTS);
      
      for (let i = 0; i < uncachedIngredients.length; i += ingredientBatchSize) {
        const batch = uncachedIngredients.slice(i, i + ingredientBatchSize);
        
        const batchPromises = batch.map(async (ingredient) => {
          try {
            return await withRetry(async () => {
              const { data: nutritionData } = await generateIngredientNutrition({
                ingredient,
                language,
              });
              
              await cacheIngredientNutrition(nutritionData);
              return nutritionData;
            });
          } catch (error) {
            console.error(`Failed to generate nutrition for ingredient ${ingredient}:`, error);
            return null;
          }
        });
        
        // Wait for the current batch to complete before starting the next
        await Promise.all(batchPromises);
        
        // Small delay between batches to be respectful to the API
        if (i + ingredientBatchSize < uncachedIngredients.length) {
          await sleep(500);
        }
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
