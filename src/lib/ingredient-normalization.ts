import { supabaseAdmin } from './supabase-server';

export interface IngredientMatch {
  original: string;
  normalized: string;
  status: 'exact_match' | 'similar_found' | 'new_ingredient' | 'needs_review';
  confidence: number;
  suggestions?: Array<{name: string; confidence: number}>;
}

export interface NormalizedIngredient {
  original_name: string;
  normalized_name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

/**
 * Enhanced ingredient normalization with duplicate detection
 */
export async function normalizeAndStoreIngredients(
  recipe: Array<{ingredient: string; quantity: number; unit: string}>, 
  restaurantId: string
): Promise<{processed: number; duplicates: number; new: number}> {
  if (!recipe || recipe.length === 0) {
    return { processed: 0, duplicates: 0, new: 0 };
  }

  try {
    // Get all existing ingredients from both restaurant products and global cache
    const [restaurantIngredients, globalIngredients] = await Promise.all([
      getRestaurantIngredients(restaurantId),
      getGlobalIngredients()
    ]);

    const allExistingIngredients = new Set([
      ...restaurantIngredients,
      ...globalIngredients
    ]);

    // Process each ingredient
    const ingredientNames = recipe.map(item => item.ingredient?.trim()).filter(Boolean);
    const matches = await findIngredientMatches(ingredientNames, Array.from(allExistingIngredients));
    
    // Separate new ingredients from duplicates
    const newIngredients = matches.filter(match => match.status === 'new_ingredient');
    const duplicateIngredients = matches.filter(match => 
      match.status === 'exact_match' || match.status === 'similar_found'
    );

    // Normalize and store only new ingredients
    if (newIngredients.length > 0) {
      console.log(`Found ${newIngredients.length} new ingredients to normalize`);
      
      const normalizedIngredients = await normalizeIngredientsWithGPT(
        newIngredients.map(ing => ing.original)
      );
      
      // Store normalized ingredients in ingredients_cache table
      for (const ingredient of normalizedIngredients) {
        await supabaseAdmin
          .from('ingredients_cache')
          .upsert({
            name: ingredient.normalized_name,
            language: 'ro',
            calories_per_100g: ingredient.calories_per_100g,
            protein_per_100g: ingredient.protein_per_100g,
            carbs_per_100g: ingredient.carbs_per_100g,
            fat_per_100g: ingredient.fat_per_100g
          }, {
            onConflict: 'name,language'
          });
      }
    }

    return {
      processed: matches.length,
      duplicates: duplicateIngredients.length,
      new: newIngredients.length
    };

  } catch (error) {
    console.error('Error normalizing ingredients:', error);
    return { processed: 0, duplicates: 0, new: 0 };
  }
}

/**
 * Get ingredients from restaurant products
 */
async function getRestaurantIngredients(restaurantId: string): Promise<string[]> {
  try {
    const { data: existingProducts } = await supabaseAdmin
      .from('products')
      .select('recipe')
      .eq('restaurant_id', restaurantId)
      .not('recipe', 'is', null);

    const ingredients = new Set<string>();
    existingProducts?.forEach(product => {
      if (product.recipe && Array.isArray(product.recipe)) {
        product.recipe.forEach((item: { ingredient?: string }) => {
          if (item.ingredient) {
            ingredients.add(item.ingredient.toLowerCase().trim());
          }
        });
      }
    });

    return Array.from(ingredients);
  } catch (error) {
    console.error('Error getting restaurant ingredients:', error);
    return [];
  }
}

/**
 * Get ingredients from global cache
 */
async function getGlobalIngredients(): Promise<string[]> {
  try {
    const { data: cachedIngredients } = await supabaseAdmin
      .from('ingredients_cache')
      .select('name')
      .eq('language', 'ro');

    return cachedIngredients?.map(ing => ing.name.toLowerCase().trim()) || [];
  } catch (error) {
    console.error('Error getting global ingredients:', error);
    return [];
  }
}

/**
 * Find matches for ingredients using fuzzy matching
 */
async function findIngredientMatches(
  ingredients: string[], 
  existingIngredients: string[]
): Promise<IngredientMatch[]> {
  const matches: IngredientMatch[] = [];

  for (const ingredient of ingredients) {
    const normalizedIngredient = ingredient.toLowerCase().trim();
    
    // Check for exact matches
    const exactMatch = existingIngredients.find(existing => 
      existing === normalizedIngredient
    );

    if (exactMatch) {
      matches.push({
        original: ingredient,
        normalized: exactMatch,
        status: 'exact_match',
        confidence: 1.0
      });
      continue;
    }

    // Check for similar ingredients using fuzzy matching
    const similarIngredients = findSimilarIngredientsFuzzy(
      normalizedIngredient, 
      existingIngredients
    );

    if (similarIngredients.length > 0) {
      const bestMatch = similarIngredients[0];
      matches.push({
        original: ingredient,
        normalized: bestMatch.name,
        status: 'similar_found',
        confidence: bestMatch.confidence,
        suggestions: similarIngredients
      });
    } else {
      matches.push({
        original: ingredient,
        normalized: ingredient,
        status: 'new_ingredient',
        confidence: 0
      });
    }
  }

  return matches;
}

/**
 * Find similar ingredients using fuzzy matching
 */
function findSimilarIngredientsFuzzy(
  ingredient: string, 
  existingIngredients: string[]
): Array<{name: string; confidence: number}> {
  const similar: Array<{name: string; confidence: number}> = [];

  for (const existing of existingIngredients) {
    const similarity = calculateSimilarity(ingredient, existing);
    
    if (similarity >= 0.7) {
      similar.push({
        name: existing,
        confidence: similarity
      });
    }
  }

  // Sort by confidence (highest first)
  return similar.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Normalize ingredients using GPT-4o mini
 */
async function normalizeIngredientsWithGPT(ingredients: string[]): Promise<NormalizedIngredient[]> {
  try {
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an ingredient normalizer for a restaurant management system. Normalize ingredient names to standard forms and provide nutritional estimates.

Return ONLY a JSON array with this structure:
[
  {
    "original_name": "string",
    "normalized_name": "string", 
    "calories_per_100g": number,
    "protein_per_100g": number,
    "carbs_per_100g": number,
    "fat_per_100g": number
  }
]

Guidelines:
- Use proper capitalization and Romanian names
- Remove unnecessary descriptors
- Provide realistic nutritional estimates
- Be consistent with naming conventions
- Examples: "pesmet" -> "Pesmet", "panko" -> "Pesmet" (same ingredient)`
          },
          {
            role: 'user',
            content: `Normalize these ingredients: ${ingredients.join(', ')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!gptResponse.ok) {
      console.error('GPT API Error for ingredient normalization:', await gptResponse.text());
      return [];
    }

    const gptData = await gptResponse.json();
    const content = gptData.choices[0]?.message?.content;
    
    if (!content) return [];

    const normalizedIngredients = JSON.parse(content);
    return Array.isArray(normalizedIngredients) ? normalizedIngredients : [];
  } catch (error) {
    console.error('Error normalizing ingredients with GPT:', error);
    return [];
  }
}
