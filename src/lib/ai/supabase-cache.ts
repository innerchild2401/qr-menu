/**
 * Supabase Caching System for AI-Generated Data
 * Handles caching of ingredients, allergens, and product data
 */

import { supabaseAdmin } from '../supabase-server';
import type { SupportedLanguage } from './language-detector';
import type { 
  GeneratedProductData, 
  IngredientNutrition, 
  GPTUsageStats 
} from './openai-client';

// =============================================================================
// TYPES
// =============================================================================

export interface CachedProduct {
  id: string;
  restaurant_id: string;
  name: string;
  generated_description?: string;
  recipe?: Array<{ ingredient: string; quantity: string }>;
  allergens?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  manual_language_override?: SupportedLanguage;
  ai_generated_at?: string;
  ai_last_updated?: string;
}

export interface CachedIngredient {
  id: string;
  name: string;
  language: SupportedLanguage;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  created_at: string;
  updated_at: string;
}

export interface AllergenInfo {
  code: string;
  name_ro: string;
  name_en: string;
  description_ro: string;
  description_en: string;
}

export interface GPTLogEntry {
  id: string;
  request_type: string;
  input_data: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  error_message?: string;
  tokens_used?: number;
  cost_estimate?: number;
  processing_time_ms?: number;
  model_used: string;
  restaurant_id?: string;
  created_at: string;
}

// =============================================================================
// PRODUCT CACHING
// =============================================================================

/**
 * Check if product already has generated data
 */
export async function getCachedProductData(productId: string): Promise<CachedProduct | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        restaurant_id,
        name,
        generated_description,
        recipe,
        allergens,
        nutrition,
        manual_language_override,
        ai_generated_at,
        ai_last_updated
      `)
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Error fetching cached product data:', error);
      return null;
    }

    // Only return if we have generated data
    if (data && data.generated_description) {
      return data as CachedProduct;
    }

    return null;
  } catch (error) {
    console.error('Error in getCachedProductData:', error);
    return null;
  }
}

/**
 * Cache generated product data
 */
export async function cacheProductData(
  productId: string,
  generatedData: GeneratedProductData,
  restaurantId?: string,
  manualLanguageOverride?: SupportedLanguage
): Promise<boolean> {
  try {
    const updateData = {
      generated_description: generatedData.description,
      recipe: generatedData.recipe,
      allergens: generatedData.estimated_allergens,
      nutrition: generatedData.nutritional_values,
      ai_generated_at: new Date().toISOString(),
      ai_last_updated: new Date().toISOString(),
      ...(manualLanguageOverride && { manual_language_override: manualLanguageOverride }),
    };

    const { error } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (error) {
      console.error('Error caching product data:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in cacheProductData:', error);
    return false;
  }
}

/**
 * Get products that need AI generation
 */
export async function getProductsNeedingGeneration(
  productIds: string[]
): Promise<Array<{ id: string; name: string; manual_language_override?: SupportedLanguage }>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, name, manual_language_override, generated_description')
      .in('id', productIds);

    if (error) {
      console.error('Error fetching products needing generation:', error);
      return [];
    }

    // Filter products that don't have generated descriptions
    return (data || [])
      .filter(product => !product.generated_description)
      .map(product => ({
        id: product.id,
        name: product.name,
        manual_language_override: product.manual_language_override
      }));
  } catch (error) {
    console.error('Error in getProductsNeedingGeneration:', error);
    return [];
  }
}

// =============================================================================
// INGREDIENT CACHING
// =============================================================================

/**
 * Get cached ingredient nutrition data
 */
export async function getCachedIngredientNutrition(
  ingredientName: string,
  language: SupportedLanguage
): Promise<CachedIngredient | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ingredients_cache')
      .select('*')
      .eq('name', ingredientName)
      .eq('language', language)
      .single();

    if (error) {
      // Not found is expected, other errors should be logged
      if (error.code !== 'PGRST116') {
        console.error('Error fetching cached ingredient:', error);
      }
      return null;
    }

    return data as CachedIngredient;
  } catch (error) {
    console.error('Error in getCachedIngredientNutrition:', error);
    return null;
  }
}

/**
 * Cache ingredient nutrition data
 */
export async function cacheIngredientNutrition(
  nutritionData: IngredientNutrition
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('ingredients_cache')
      .upsert({
        name: nutritionData.name,
        language: nutritionData.language,
        calories_per_100g: nutritionData.calories_per_100g,
        protein_per_100g: nutritionData.protein_per_100g,
        carbs_per_100g: nutritionData.carbs_per_100g,
        fat_per_100g: nutritionData.fat_per_100g,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'name,language'
      });

    if (error) {
      console.error('Error caching ingredient nutrition:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in cacheIngredientNutrition:', error);
    return false;
  }
}

/**
 * Get ingredients that need nutrition data
 */
export async function getIngredientsNeedingNutrition(
  ingredients: string[],
  language: SupportedLanguage
): Promise<string[]> {
  try {
    if (ingredients.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('ingredients_cache')
      .select('name')
      .in('name', ingredients)
      .eq('language', language);

    if (error) {
      console.error('Error checking ingredients cache:', error);
      return ingredients; // Return all if error
    }

    const cachedIngredients = new Set((data || []).map(item => item.name));
    return ingredients.filter(ingredient => !cachedIngredients.has(ingredient));
  } catch (error) {
    console.error('Error in getIngredientsNeedingNutrition:', error);
    return ingredients;
  }
}

// =============================================================================
// ALLERGEN MAPPING
// =============================================================================

/**
 * Get all allergen information
 */
export async function getAllergens(): Promise<AllergenInfo[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('allergens')
      .select('*')
      .order('code');

    if (error) {
      console.error('Error fetching allergens:', error);
      return [];
    }

    return data as AllergenInfo[];
  } catch (error) {
    console.error('Error in getAllergens:', error);
    return [];
  }
}

/**
 * Map ingredient names to allergen codes
 */
export async function mapIngredientsToAllergens(
  ingredientNames: string[],
  language: SupportedLanguage = 'ro'
): Promise<string[]> {
  try {
    if (ingredientNames.length === 0) return [];

    const allergens = await getAllergens();
    const allergenCodes: Set<string> = new Set();

    // Simple keyword matching for now
    // In a production system, this could be more sophisticated
    for (const ingredient of ingredientNames) {
      const lowerIngredient = ingredient.toLowerCase();

      for (const allergen of allergens) {
        const allergenName = language === 'ro' ? allergen.name_ro : allergen.name_en;
        const allergenDesc = language === 'ro' ? allergen.description_ro : allergen.description_en;

        // Check if ingredient contains allergen keywords
        if (
          lowerIngredient.includes(allergenName.toLowerCase()) ||
          (allergenDesc && allergenDesc.toLowerCase().split(',').some(keyword => 
            lowerIngredient.includes(keyword.trim().toLowerCase())
          ))
        ) {
          allergenCodes.add(allergen.code);
        }
      }
    }

    return Array.from(allergenCodes);
  } catch (error) {
    console.error('Error in mapIngredientsToAllergens:', error);
    return [];
  }
}

// =============================================================================
// LOGGING
// =============================================================================

/**
 * Log GPT API call for monitoring
 */
export async function logGPTCall(
  requestType: string,
  inputData: Record<string, unknown>,
  responseData?: Record<string, unknown>,
  error?: string,
  usage?: GPTUsageStats,
  restaurantId?: string
): Promise<void> {
  try {
    const logEntry = {
      request_type: requestType,
      input_data: inputData,
      response_data: responseData,
      error_message: error,
      tokens_used: usage?.tokens_used,
      cost_estimate: usage?.estimated_cost_usd,
      processing_time_ms: usage?.processing_time_ms,
      model_used: 'gpt-4o-mini',
      restaurant_id: restaurantId,
    };

    const { error: logError } = await supabaseAdmin
      .from('gpt_logs')
      .insert(logEntry);

    if (logError) {
      console.error('Error logging GPT call:', logError);
    }
  } catch (error) {
    console.error('Error in logGPTCall:', error);
  }
}

/**
 * Get GPT usage statistics for a restaurant
 */
export async function getGPTUsageStats(
  restaurantId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  averageProcessingTime: number;
  errorRate: number;
}> {
  try {
    let query = supabaseAdmin
      .from('gpt_logs')
      .select('tokens_used, cost_estimate, processing_time_ms, error_message')
      .eq('restaurant_id', restaurantId);

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      query = query.lte('created_at', toDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching GPT usage stats:', error);
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        averageProcessingTime: 0,
        errorRate: 0,
      };
    }

    const stats = {
      totalCalls: data.length,
      totalTokens: data.reduce((sum, log) => sum + (log.tokens_used || 0), 0),
      totalCost: data.reduce((sum, log) => sum + (log.cost_estimate || 0), 0),
      averageProcessingTime: data.length > 0 
        ? data.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / data.length 
        : 0,
      errorRate: data.length > 0 
        ? data.filter(log => log.error_message).length / data.length 
        : 0,
    };

    return stats;
  } catch (error) {
    console.error('Error in getGPTUsageStats:', error);
    return {
      totalCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      averageProcessingTime: 0,
      errorRate: 0,
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a product name suggests it's a bottled drink
 */
export async function isBottledDrinkDB(productName: string): Promise<boolean> {
  try {
    // Use the database function if available
    const { data, error } = await supabaseAdmin
      .rpc('is_bottled_drink', { product_name: productName });

    if (error) {
      console.warn('Database function is_bottled_drink not available, using client-side check');
      // Fallback to client-side check
      const name = productName.toLowerCase();
      return /\b(pepsi|coca|cola|coke|fanta|sprite|beer|bere|water|apa|wine|vin|juice|suc|energy|red bull)\b/.test(name);
    }

    return data;
  } catch (error) {
    console.error('Error in isBottledDrinkDB:', error);
    return false;
  }
}
