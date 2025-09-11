import { createClient } from '@supabase/supabase-js';
import { trackTokenConsumption, extractTokenUsageFromResponse } from '@/lib/api/token-tracker';

// Create Supabase client only when needed (server-side)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface RecipeIngredient {
  ingredient: string;
  quantity: string;
}

export interface SemanticNormalizedIngredient {
  original: string;
  normalized: string;
  quantity: string;
  similarity_score: number;
  confidence: 'high' | 'medium' | 'low';
}


/**
 * Semantic ingredient normalizer using GPT-4o-mini for similarity matching
 * Fetches existing ingredients from database and finds best semantic matches
 */
export async function normalizeIngredientsSemantic(
  ingredients: RecipeIngredient[],
  language: 'ro' | 'en',
  restaurantId: string
): Promise<SemanticNormalizedIngredient[]> {
  try {
    console.log('🔍 Fetching existing ingredients from database...');
    
    // Fetch all existing ingredients from the restaurant's products
    const supabase = getSupabaseClient();
    const { data: products, error } = await supabase
      .from('products')
      .select('recipe')
      .eq('restaurant_id', restaurantId)
      .not('recipe', 'is', null);

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    // Extract all unique ingredients from existing recipes
    const existingIngredients = new Set<string>();
    products?.forEach(product => {
      if (product.recipe && Array.isArray(product.recipe)) {
        product.recipe.forEach((item: { ingredient?: string }) => {
          if (item.ingredient) {
            existingIngredients.add(item.ingredient);
          }
        });
      }
    });

    const existingIngredientsList = Array.from(existingIngredients);
    console.log(`🔍 Found ${existingIngredientsList.length} existing ingredients`);

    if (existingIngredientsList.length === 0) {
      console.log('⚠️ No existing ingredients found, using GPT-based normalization for new ingredients');
      return await normalizeNewIngredients(ingredients, language);
    }

    // Use GPT to find semantic matches
    const systemPrompt = `You are an expert ingredient normalizer for a restaurant management system.

Your task is to find the BEST semantic match for each ingredient from the existing ingredients list.

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown formatting
2. For each ingredient, find the most similar existing ingredient
3. Use semantic similarity, not just string matching
4. Consider variations, synonyms, and different forms of the same ingredient
5. If no good match exists (similarity < 0.7), normalize the ingredient using standard naming conventions
6. Provide a similarity score (0-1) and confidence level

Examples of good matches:
- "chifla burger" → "Chiflă" (bread category)
- "piept pui" → "Piept de pui" (chicken category)
- "tomato" → "Tomate" (vegetable category)
- "cheese" → "Branză" (dairy category)

For new ingredients with no good match:
- Use proper capitalization and language conventions
- Remove unnecessary descriptors (e.g., "burger" from bread names)
- Use standard quantity formats

Language: ${language === 'ro' ? 'Romanian' : 'English'}

Return as JSON:
{
  "matches": [
    {
      "original": "original ingredient name",
      "normalized": "best matching existing ingredient OR normalized new ingredient",
      "quantity": "standardized quantity",
      "similarity_score": 0.95,
      "confidence": "high|medium|low"
    }
  ]
}`;

    const userPrompt = `Find the best semantic matches for these ingredients:

Ingredients to normalize:
${ingredients.map(ing => `- ${ing.ingredient} (${ing.quantity})`).join('\n')}

Existing ingredients in database:
${existingIngredientsList.map(ing => `- ${ing}`).join('\n')}

For each ingredient:
1. If there's a good semantic match (similarity > 0.7), use the existing ingredient
2. If no good match exists, normalize the ingredient using proper naming conventions
3. Always standardize quantities (e.g., "110 gr" → "110g")`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent matching
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
        userId: '00000000-0000-0000-0000-000000000000', // Use a valid UUID for system operations
        userEmail: 'system@smartmenu.app',
        apiEndpoint: '/api/normalize-ingredients-semantic',
        requestId: data.id,
        usage: tokenUsage,
        model: 'gpt-4o-mini'
      });
    } catch (error) {
      console.error('Failed to track token consumption for semantic ingredient normalization:', error);
      // Don't fail the main request if tracking fails
    }

    // Handle markdown-wrapped JSON responses
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedResponse = JSON.parse(jsonContent);
    console.log('🔍 Semantic normalization results:', parsedResponse.matches);
    
    return parsedResponse.matches || [];

  } catch (error) {
    console.error('Semantic ingredient normalization error:', error);
    // Return original ingredients if normalization fails
    return ingredients.map(ing => ({
      original: ing.ingredient,
      normalized: ing.ingredient,
      quantity: ing.quantity,
      similarity_score: 0,
      confidence: 'low' as const
    }));
  }
}

/**
 * Normalize new ingredients when no existing ingredients are found in the database
 * Uses GPT to standardize ingredient names and quantities
 */
async function normalizeNewIngredients(
  ingredients: RecipeIngredient[],
  language: 'ro' | 'en'
): Promise<SemanticNormalizedIngredient[]> {
  try {
    console.log('🆕 Normalizing new ingredients with GPT...');
    
    const systemPrompt = `You are an expert ingredient normalizer for a restaurant management system.

Your task is to normalize ingredient names for a restaurant database when no existing ingredients are available.

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown formatting
2. Use proper capitalization and language conventions
3. Remove unnecessary descriptors (e.g., "burger" from bread names)
4. Standardize quantities (e.g., "110 gr" → "110g")
5. Use consistent naming patterns
6. Provide high confidence for new ingredients

Examples of good normalization:
- "chifla burger" → "Chiflă" (remove "burger" descriptor)
- "piept pui" → "Piept de pui" (proper Romanian grammar)
- "tomato" → "Tomate" (Romanian translation)
- "cheese" → "Branză" (Romanian translation)
- "110 gr" → "110g" (standardize quantity)

Language: ${language === 'ro' ? 'Romanian' : 'English'}

Return as JSON:
{
  "matches": [
    {
      "original": "original ingredient name",
      "normalized": "normalized ingredient name",
      "quantity": "standardized quantity",
      "similarity_score": 1.0,
      "confidence": "high"
    }
  ]
}`;

    const userPrompt = `Normalize these new ingredients for a restaurant database:

${ingredients.map(ing => `- ${ing.ingredient} (${ing.quantity})`).join('\n')}

Language: ${language === 'ro' ? 'Romanian' : 'English'}

Normalize each ingredient using proper naming conventions and standardize quantities.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
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
        userId: '00000000-0000-0000-0000-000000000000', // Use a valid UUID for system operations
        userEmail: 'system@smartmenu.app',
        apiEndpoint: '/api/normalize-ingredients-semantic',
        requestId: data.id,
        usage: tokenUsage,
        model: 'gpt-4o-mini'
      });
    } catch (error) {
      console.error('Failed to track token consumption for semantic ingredient normalization:', error);
      // Don't fail the main request if tracking fails
    }

    // Handle markdown-wrapped JSON responses
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedResponse = JSON.parse(jsonContent);
    console.log('🆕 New ingredient normalization results:', parsedResponse.matches);
    
    return parsedResponse.matches || [];

  } catch (error) {
    console.error('New ingredient normalization error:', error);
    // Return original ingredients if normalization fails
    return ingredients.map(ing => ({
      original: ing.ingredient,
      normalized: ing.ingredient,
      quantity: ing.quantity,
      similarity_score: 1.0,
      confidence: 'high' as const
    }));
  }
}
