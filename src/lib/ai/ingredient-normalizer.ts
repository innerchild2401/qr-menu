/**
 * Ingredient Normalization using GPT 4o-mini with Semantic Similarity
 * 
 * This utility normalizes ingredient names to ensure consistency in the database.
 * It uses semantic similarity to match against existing ingredients in the database.
 */

import { env } from '@/lib/env';
import { normalizeIngredientsSemantic } from './semantic-ingredient-normalizer';
import { trackTokenConsumption, extractTokenUsageFromResponse } from '@/lib/api/token-tracker';

interface RecipeIngredient {
  ingredient: string;
  quantity: string;
}

export interface NormalizedIngredient {
  original: string;
  normalized: string;
  quantity: string;
  category?: string;
  is_duplicate?: boolean;
  suggestion?: string;
}

interface IngredientNormalizationResponse {
  normalized_ingredients: NormalizedIngredient[];
  duplicates_found: string[];
  suggestions: string[];
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Normalize ingredients using semantic similarity with existing database ingredients
 * This is the main function that should be used for ingredient normalization
 */
export async function normalizeIngredients(
  ingredients: RecipeIngredient[],
  language: 'ro' | 'en',
  restaurantId?: string
): Promise<NormalizedIngredient[]> {
  // If restaurantId is provided, use semantic normalization
  if (restaurantId) {
    console.log('🔍 Using semantic ingredient normalization...');
    const semanticResults = await normalizeIngredientsSemantic(ingredients, language, restaurantId);
    
    // Convert semantic results to the expected format
    return semanticResults.map(result => ({
      original: result.original,
      normalized: result.normalized,
      quantity: result.quantity,
      category: undefined,
      is_duplicate: result.confidence === 'low',
      suggestion: result.confidence === 'low' ? 'No good match found' : undefined
    }));
  }

  // Fallback to original GPT-based normalization
  console.log('🔧 Using GPT-based ingredient normalization (fallback)...');
  return normalizeIngredientsGPT(ingredients, language);
}

/**
 * Original GPT-based ingredient normalization (fallback method)
 */
async function normalizeIngredientsGPT(
  ingredients: RecipeIngredient[],
  language: 'ro' | 'en'
): Promise<NormalizedIngredient[]> {
  try {
    const systemPrompt = `You are an expert ingredient normalizer for a restaurant management system.

Your task is to normalize ingredient names to ensure consistency in the database.

CRITICAL FILTERING RULES:
- EXCLUDE cooking mediums: oil for frying, water for boiling, cooking sprays, etc.
- EXCLUDE non-consumable items: toothpicks, skewers, decorative elements
- INCLUDE only ingredients that are actually consumed by the customer
- For fried items, estimate reasonable oil absorption (typically 10-20% of any frying oil)

Normalization rules:
1. Standardize ingredient names (e.g., "chifla burger" → "Chiflă")
2. Use consistent language (Romanian or English as requested)
3. Standardize quantities (e.g., "110 gr" → "110g")
4. Detect and flag duplicates
5. Categorize ingredients (meat, vegetable, dairy, etc.)

Language: ${language === 'ro' ? 'Romanian' : 'English'}

Return as JSON in this format:
{
  "normalized_ingredients": [
    {
      "original": "original ingredient name",
      "normalized": "standardized ingredient name", 
      "quantity": "standardized quantity",
      "category": "ingredient category",
      "isDuplicate": false,
      "duplicateOf": null
    }
  ],
  "duplicates_found": ["list of duplicate ingredient names"],
  "suggestions": ["suggestions for improvement"]
}`;

    const userPrompt = `Normalize these ingredients for a restaurant database:

${ingredients.map(ing => `- ${ing.ingredient} (${ing.quantity})`).join('\n')}

Language: ${language === 'ro' ? 'Romanian' : 'English'}

Return as JSON in this format:
{
  "normalized_ingredients": [
    {
      "original": "original ingredient name",
      "normalized": "standardized ingredient name", 
      "quantity": "standardized quantity",
      "category": "ingredient category",
      "isDuplicate": false,
      "duplicateOf": null
    }
  ],
  "duplicates_found": ["list of duplicate ingredient names"],
  "suggestions": ["suggestions for improvement"]
}`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent normalization
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Track token consumption
    try {
      const tokenUsage = extractTokenUsageFromResponse(data);
      await trackTokenConsumption({
        userId: 'unknown', // Ingredient normalization doesn't have user context
        userEmail: 'unknown@example.com',
        apiEndpoint: '/api/normalize-ingredients',
        requestId: data.id,
        usage: tokenUsage,
        model: 'gpt-4o-mini'
      });
    } catch (error) {
      console.error('Failed to track token consumption for ingredient normalization:', error);
      // Don't fail the main request if tracking fails
    }

    // Handle markdown-wrapped JSON responses
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsedResponse: IngredientNormalizationResponse = JSON.parse(jsonContent);
    return parsedResponse.normalized_ingredients;

  } catch (error) {
    console.error('Ingredient normalization error:', error);
    // Return original ingredients if normalization fails
    return ingredients.map(ing => ({
      original: ing.ingredient,
      normalized: ing.ingredient,
      quantity: ing.quantity
    }));
  }
}