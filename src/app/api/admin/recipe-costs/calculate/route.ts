import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

interface RecipeIngredient {
  ingredient: string;
  quantity: number;
  unit: string;
}

interface CostCalculationRequest {
  recipe: RecipeIngredient[];
  servings: number;
  restaurant_id: string;
}

interface IngredientCost {
  ingredient: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
  confidence_score: number;
  source: string;
}

interface CostCalculationResponse {
  total_cost: number;
  cost_per_serving: number;
  ingredients: IngredientCost[];
  missing_ingredients: string[];
  confidence_warning: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { recipe, servings, restaurant_id }: CostCalculationRequest = await request.json();

    if (!recipe || !servings || !restaurant_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    // Get ingredient costs for all ingredients
    const ingredientNames = recipe.map(r => r.ingredient);
    const { data: ingredientCosts, error } = await supabase
      .from('ingredient_costs')
      .select('*')
      .in('ingredient_name', ingredientNames);

    if (error) {
      console.error('Error fetching ingredient costs:', error);
      return NextResponse.json({ error: 'Failed to fetch ingredient costs' }, { status: 500 });
    }

    // Calculate costs
    const ingredients: IngredientCost[] = [];
    const missing_ingredients: string[] = [];
    let total_cost = 0;
    let confidence_warning = false;

    for (const recipeIngredient of recipe) {
      const costData = ingredientCosts?.find(c => 
        c.ingredient_name.toLowerCase() === recipeIngredient.ingredient.toLowerCase()
      );

      if (!costData) {
        missing_ingredients.push(recipeIngredient.ingredient);
        continue;
      }

      // Convert units if needed (basic conversion logic)
      let quantityInCostUnit = recipeIngredient.quantity;
      if (recipeIngredient.unit !== costData.unit) {
        quantityInCostUnit = convertUnits(
          recipeIngredient.quantity, 
          recipeIngredient.unit, 
          costData.unit
        );
      }

      const ingredientCost = quantityInCostUnit * costData.cost_per_unit;
      total_cost += ingredientCost;

      if (costData.confidence_score < 0.7) {
        confidence_warning = true;
      }

      ingredients.push({
        ingredient: recipeIngredient.ingredient,
        quantity: recipeIngredient.quantity,
        unit: recipeIngredient.unit,
        cost_per_unit: costData.cost_per_unit,
        total_cost: ingredientCost,
        confidence_score: costData.confidence_score,
        source: costData.source
      });
    }

    const cost_per_serving = total_cost / servings;

    const response: CostCalculationResponse = {
      total_cost,
      cost_per_serving,
      ingredients,
      missing_ingredients,
      confidence_warning
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error calculating recipe costs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Basic unit conversion function
function convertUnits(quantity: number, fromUnit: string, toUnit: string): number {
  const conversions: { [key: string]: { [key: string]: number } } = {
    'g': { 'kg': 0.001, 'lb': 0.00220462 },
    'kg': { 'g': 1000, 'lb': 2.20462 },
    'ml': { 'l': 0.001, 'cup': 0.00422675 },
    'l': { 'ml': 1000, 'cup': 4.22675 },
    'cup': { 'ml': 236.588, 'l': 0.236588 }
  };

  if (conversions[fromUnit] && conversions[fromUnit][toUnit]) {
    return quantity * conversions[fromUnit][toUnit];
  }

  return quantity; // Return original if no conversion found
}

