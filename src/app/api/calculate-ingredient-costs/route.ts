import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { trackTokenConsumption } from '@/lib/api/token-tracker';
import { AI_CONFIG } from '@/lib/config';

interface IngredientCostRequest {
  ingredients: string[];
  language: 'ro' | 'en';
  restaurantId: string;
  userId: string;
}

interface IngredientCostResponse {
  ingredient: string;
  cost_per_unit: number;
  unit: string;
  currency: string;
  confidence_score: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a restaurant cost analysis expert. Your job is to estimate the cost of ingredients in Romanian restaurants.

For each ingredient, provide:
1. Cost per unit (in RON - Romanian Lei)
2. Appropriate unit of measurement (kg, liter, piece, etc.)
3. Confidence score (0.0 to 1.0) based on how certain you are
4. Brief reasoning for your estimate

Consider:
- Romanian market prices
- Restaurant wholesale prices (typically 20-30% lower than retail)
- Seasonal variations
- Quality levels (restaurant-grade ingredients)
- Bulk purchasing discounts

Return ONLY valid JSON in this exact format:
[
  {
    "ingredient": "exact ingredient name",
    "cost_per_unit": 15.50,
    "unit": "kg",
    "currency": "RON",
    "confidence_score": 0.85,
    "reasoning": "Restaurant wholesale price for fresh chicken breast"
  }
]`;

export async function POST(request: NextRequest) {
  try {
    const { ingredients, language, restaurantId, userId }: IngredientCostRequest = await request.json();

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ingredients array is required' },
        { status: 400 }
      );
    }

    if (!language || !['ro', 'en'].includes(language)) {
      return NextResponse.json(
        { success: false, error: 'Valid language (ro or en) is required' },
        { status: 400 }
      );
    }

    console.log(`Calculating costs for ${ingredients.length} ingredients in ${language}`);

    // Check which ingredients we already have costs for
    const supabase = supabaseAdmin;
    const { data: existingCosts, error: fetchError } = await supabase
      .from('ingredient_costs')
      .select('ingredient_name, cost_per_unit, unit, currency, confidence_score, reasoning')
      .in('ingredient_name', ingredients)
      .eq('language', language);

    if (fetchError) {
      console.error('Error fetching existing costs:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch existing costs' },
        { status: 500 }
      );
    }

    // Find ingredients that need cost calculation
    const existingIngredientNames = new Set(existingCosts?.map(c => c.ingredient_name) || []);
    const ingredientsToCalculate = ingredients.filter(ing => !existingIngredientNames.has(ing));

    console.log(`Found ${existingCosts?.length || 0} existing costs, need to calculate ${ingredientsToCalculate.length} new costs`);

    const allCosts = [...(existingCosts || [])];

    // Calculate costs for new ingredients
    if (ingredientsToCalculate.length > 0) {
      const userPrompt = `Please calculate the cost for these ingredients in Romanian restaurants:\n\n${ingredientsToCalculate.map(ing => `- ${ing}`).join('\n')}`;

      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent cost estimates
          max_tokens: 2000,
        }),
      });

      if (!gptResponse.ok) {
        const errorData = await gptResponse.json();
        console.error('GPT API Error:', errorData);
        return NextResponse.json(
          { success: false, error: 'Failed to calculate ingredient costs from AI' },
          { status: 500 }
        );
      }

      const gptData = await gptResponse.json();
      const content = gptData.choices[0]?.message?.content;

      if (!content) {
        return NextResponse.json(
          { success: false, error: 'No content received from AI' },
          { status: 500 }
        );
      }

      // Track token consumption
      try {
        const tokenUsage = {
          prompt_tokens: gptData.usage?.prompt_tokens || 0,
          completion_tokens: gptData.usage?.completion_tokens || 0,
          total_tokens: gptData.usage?.total_tokens || 0
        };
        
        await trackTokenConsumption({
          userId: userId,
          userEmail: 'system@smartmenu.app',
          apiEndpoint: '/api/calculate-ingredient-costs',
          requestId: gptData.id,
          usage: tokenUsage,
          model: 'gpt-4o-mini'
        });
      } catch (error) {
        console.error('Failed to track token consumption:', error);
        // Don't fail the main request if tracking fails
      }

      // Parse JSON response
      let newCosts: IngredientCostResponse[];
      try {
        newCosts = JSON.parse(content);
        if (!Array.isArray(newCosts)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Raw content:', content.substring(0, 500) + '...');
        return NextResponse.json(
          { success: false, error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }

      // Store new costs in database
      if (newCosts.length > 0) {
        const costRecords = newCosts.map(cost => ({
          ingredient_name: cost.ingredient,
          language: language,
          cost_per_unit: cost.cost_per_unit,
          unit: cost.unit,
          currency: cost.currency || 'RON',
          confidence_score: cost.confidence_score,
          reasoning: cost.reasoning,
          source: AI_CONFIG.MODEL
        }));

        const { error: insertError } = await supabase
          .from('ingredient_costs')
          .insert(costRecords);

        if (insertError) {
          console.error('Error inserting new costs:', insertError);
          return NextResponse.json(
            { success: false, error: 'Failed to store ingredient costs' },
            { status: 500 }
          );
        }

        // Add new costs to the response
        allCosts.push(...costRecords);
      }
    }

    console.log(`Successfully calculated costs for ${ingredients.length} ingredients`);

    return NextResponse.json({
      success: true,
      data: {
        total_ingredients: ingredients.length,
        existing_costs: existingCosts?.length || 0,
        new_costs: ingredientsToCalculate.length,
        costs: allCosts
      }
    });

  } catch (error) {
    console.error('Error calculating ingredient costs:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
