/**
 * Ingredient Normalization using GPT 4o-mini
 * 
 * This utility normalizes ingredient names to ensure consistency in the database.
 * It uses GPT to standardize ingredient names, quantities, and detect duplicates.
 */

import { env } from '@/lib/env';


interface NormalizedIngredient {
  original: string;
  normalized: string;
  quantity: string;
  category?: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
}

interface IngredientNormalizationResponse {
  normalized_ingredients: NormalizedIngredient[];
  duplicates_found: string[];
  suggestions: string[];
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Normalize ingredients using GPT 4o-mini
 */
export async function normalizeIngredients(
  ingredients: Array<{ ingredient: string; quantity: string }>,
  language: 'ro' | 'en' = 'en'
): Promise<NormalizedIngredient[]> {
  if (!env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, returning original ingredients');
    return ingredients.map(ing => ({
      original: ing.ingredient,
      normalized: ing.ingredient,
      quantity: ing.quantity
    }));
  }

  if (ingredients.length === 0) {
    return [];
  }

  try {
    const systemPrompt = `You are an expert food ingredient normalizer. Your task is to:

1. Normalize ingredient names to their most common, standardized form
2. Detect and identify duplicate ingredients (even with different spellings/variations)
3. Standardize quantity formats
4. Categorize ingredients by type (meat, vegetable, spice, etc.)
5. Suggest corrections for typos or unclear ingredient names

Rules:
- Use the most common, professional name for each ingredient
- Group similar ingredients together (e.g., "tomato" and "tomatoes" should be normalized to the same name)
- Standardize quantity formats (e.g., "1 cup" instead of "1c" or "one cup")
- Be consistent with language: ${language === 'ro' ? 'Romanian' : 'English'}
- Preserve the original ingredient name for reference
- Mark duplicates clearly

Return a JSON array with normalized ingredients.`;

    const userPrompt = `Please normalize these ingredients:

${ingredients.map((ing, index) => `${index + 1}. ${ing.ingredient} (${ing.quantity})`).join('\n')}

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

    const parsedResponse: IngredientNormalizationResponse = JSON.parse(content);
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

/**
 * Check if two ingredient names are likely the same
 */
export function areIngredientsSimilar(ingredient1: string, ingredient2: string): boolean {
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const norm1 = normalize(ingredient1);
  const norm2 = normalize(ingredient2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (for plurals, etc.)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Check for common variations
  const variations = [
    ['tomato', 'tomatoes'],
    ['onion', 'onions'],
    ['garlic', 'garlic clove', 'garlic cloves'],
    ['cheese', 'cheeses'],
    ['pepper', 'peppers'],
    ['salt', 'sea salt', 'table salt'],
    ['oil', 'olive oil', 'vegetable oil'],
    ['flour', 'all-purpose flour', 'plain flour'],
    ['sugar', 'white sugar', 'granulated sugar']
  ];
  
  for (const variation of variations) {
    if (variation.includes(norm1) && variation.includes(norm2)) return true;
  }
  
  return false;
}

/**
 * Get ingredient suggestions for a given ingredient name
 */
export function getIngredientSuggestions(ingredient: string): string[] {
  const suggestions: Record<string, string[]> = {
    'tomato': ['tomatoes', 'cherry tomatoes', 'roma tomatoes'],
    'onion': ['onions', 'red onion', 'yellow onion', 'white onion'],
    'garlic': ['garlic clove', 'garlic cloves', 'minced garlic'],
    'cheese': ['cheddar cheese', 'mozzarella', 'parmesan', 'swiss cheese'],
    'pepper': ['bell pepper', 'red pepper', 'green pepper', 'black pepper'],
    'salt': ['sea salt', 'table salt', 'kosher salt'],
    'oil': ['olive oil', 'vegetable oil', 'coconut oil', 'canola oil'],
    'flour': ['all-purpose flour', 'plain flour', 'bread flour', 'cake flour'],
    'sugar': ['white sugar', 'granulated sugar', 'brown sugar', 'powdered sugar']
  };
  
  const normalized = ingredient.toLowerCase().trim();
  return suggestions[normalized] || [];
}
