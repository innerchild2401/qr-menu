import { supabaseAdmin } from './supabase-server';
import { DEFAULT_CONFIG } from '@/lib/config';

export interface IngredientCost {
  id: string;
  ingredient_name: string;
  language: string;
  cost_per_unit: number;
  unit: string;
  currency: string;
  confidence_score: number;
  reasoning: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  ingredient: string;
  quantity: string;
}

export interface CalculatedRecipeCost {
  total_cost: number;
  cost_breakdown: Array<{
    ingredient: string;
    quantity: string;
    unit: string;
    cost_per_unit: number;
    total_cost: number;
    confidence_score: number;
  }>;
  confidence_score: number;
  currency: string;
}

/**
 * Get ingredient costs from the database
 */
import { getDefaultLanguage } from '@/lib/config';

export async function getIngredientCosts(
  ingredients: string[],
  language: 'ro' | 'en' = getDefaultLanguage()
): Promise<IngredientCost[]> {
  const supabase = supabaseAdmin;
  
  const { data, error } = await supabase
    .from('ingredient_costs')
    .select('*')
    .in('ingredient_name', ingredients)
    .eq('language', language);

  if (error) {
    console.error('Error fetching ingredient costs:', error);
    return [];
  }

  return data || [];
}

/**
 * Calculate the total cost of a recipe using ingredient costs
 */
export function calculateRecipeCost(
  recipe: RecipeIngredient[],
  ingredientCosts: IngredientCost[]
): CalculatedRecipeCost {
  const costMap = new Map(
    ingredientCosts.map(cost => [cost.ingredient_name.toLowerCase(), cost])
  );

  let totalCost = 0;
  let totalConfidence = 0;
  let validIngredients = 0;
  const costBreakdown: CalculatedRecipeCost['cost_breakdown'] = [];

  for (const recipeIngredient of recipe) {
    const ingredientName = recipeIngredient.ingredient.toLowerCase();
    const cost = costMap.get(ingredientName);

    if (cost) {
      // Parse quantity (simple parsing - could be enhanced)
      const quantity = parseQuantity(recipeIngredient.quantity);
      const ingredientTotalCost = quantity * cost.cost_per_unit;
      
      totalCost += ingredientTotalCost;
      totalConfidence += cost.confidence_score;
      validIngredients++;

      costBreakdown.push({
        ingredient: recipeIngredient.ingredient,
        quantity: recipeIngredient.quantity,
        unit: cost.unit,
        cost_per_unit: cost.cost_per_unit,
        total_cost: ingredientTotalCost,
        confidence_score: cost.confidence_score
      });
    } else {
      // Missing cost data - add to breakdown with 0 cost
      costBreakdown.push({
        ingredient: recipeIngredient.ingredient,
        quantity: recipeIngredient.quantity,
        unit: 'unknown',
        cost_per_unit: 0,
        total_cost: 0,
        confidence_score: 0
      });
    }
  }

  const averageConfidence = validIngredients > 0 ? totalConfidence / validIngredients : 0;

  return {
    total_cost: totalCost,
    cost_breakdown: costBreakdown,
    confidence_score: averageConfidence,
    currency: ingredientCosts[0]?.currency || DEFAULT_CONFIG.CURRENCY
  };
}

/**
 * Parse quantity string to number (simple implementation)
 * This could be enhanced to handle more complex quantity formats
 */
function parseQuantity(quantityStr: string): number {
  // Remove common units and extract number
  const cleaned = quantityStr
    .toLowerCase()
    .replace(/[^\d.,]/g, '') // Keep only digits, dots, and commas
    .replace(',', '.'); // Convert comma to dot for decimal

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 1 : parsed; // Default to 1 if parsing fails
}

/**
 * Check if all ingredients in a recipe have cost data
 */
export function hasCompleteCostData(
  recipe: RecipeIngredient[],
  ingredientCosts: IngredientCost[]
): boolean {
  const costMap = new Set(
    ingredientCosts.map(cost => cost.ingredient_name.toLowerCase())
  );

  return recipe.every(ingredient => 
    costMap.has(ingredient.ingredient.toLowerCase())
  );
}

/**
 * Get missing ingredients that need cost calculation
 */
export function getMissingIngredients(
  recipe: RecipeIngredient[],
  ingredientCosts: IngredientCost[]
): string[] {
  const costMap = new Set(
    ingredientCosts.map(cost => cost.ingredient_name.toLowerCase())
  );

  return recipe
    .map(ingredient => ingredient.ingredient)
    .filter(ingredient => !costMap.has(ingredient.toLowerCase()));
}
