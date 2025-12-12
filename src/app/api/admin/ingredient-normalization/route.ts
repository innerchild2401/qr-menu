import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error) {
      return NextResponse.json({ error }, { status: error === 'Missing user ID in headers' ? 401 : 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all cached ingredients for similarity checking
    const { data: cachedIngredients, error: cacheError } = await supabaseAdmin
      .from('ingredients_cache')
      .select('name, language')
      .eq('language', 'ro')
      .order('name');

    if (cacheError) {
      console.error('Error fetching cached ingredients:', cacheError);
      return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 });
    }

    return NextResponse.json(cachedIngredients || []);

  } catch (error) {
    console.error('Error in ingredient normalization GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error) {
      return NextResponse.json({ error }, { status: error === 'Missing user ID in headers' ? 401 : 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ingredients } = await request.json();

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'Ingredients array is required' }, { status: 400 });
    }

    // Get all cached ingredients for similarity checking
    const { data: cachedIngredients, error: cacheError } = await supabaseAdmin
      .from('ingredients_cache')
      .select('name, language')
      .eq('language', 'ro');

    if (cacheError) {
      console.error('Error fetching cached ingredients:', cacheError);
      return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 });
    }

    const existingIngredients = cachedIngredients?.map(ing => ing.name.toLowerCase()) || [];

    // Process each ingredient for potential duplicates
    const processedIngredients = await Promise.all(
      ingredients.map(async (ingredient: string) => {
        const normalizedIngredient = ingredient.trim().toLowerCase();
        
        // Check for exact matches
        const exactMatch = existingIngredients.find(existing => 
          existing === normalizedIngredient
        );

        if (exactMatch) {
          return {
            original: ingredient,
            normalized: exactMatch,
            status: 'exact_match',
            confidence: 1.0
          };
        }

        // Check for similar ingredients using GPT
        const similarIngredients = await findSimilarIngredients(
          ingredient, 
          existingIngredients
        );

        return {
          original: ingredient,
          normalized: similarIngredients.length > 0 ? similarIngredients[0].name : null,
          status: similarIngredients.length > 0 ? 'similar_found' : 'new_ingredient',
          confidence: similarIngredients.length > 0 ? similarIngredients[0].confidence : 0,
          suggestions: similarIngredients
        };
      })
    );

    return NextResponse.json(processedIngredients);

  } catch (error) {
    console.error('Error in ingredient normalization POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to find similar ingredients using GPT
async function findSimilarIngredients(
  ingredient: string, 
  existingIngredients: string[]
): Promise<Array<{name: string; confidence: number}>> {
  try {
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: (await import('@/lib/config')).AI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an ingredient similarity expert. Given a new ingredient and a list of existing ingredients, find the most similar ones.

Return ONLY a JSON array with this structure:
[
  {
    "name": "string",
    "confidence": number (0.0 to 1.0)
  }
]

Guidelines:
- Only return ingredients with confidence >= 0.7
- Consider Romanian cooking terms and synonyms
- Examples: "pesmet" and "panko" are similar (breadcrumbs)
- "sare" and "sare de mare" are similar
- "ulei" and "ulei de floarea-soarelui" are similar
- Be conservative - only suggest if you're confident they're the same ingredient`
          },
          {
            role: 'user',
            content: `Find similar ingredients for "${ingredient}" from this list: ${existingIngredients.join(', ')}`
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!gptResponse.ok) {
      console.error('GPT API Error for ingredient similarity:', await gptResponse.text());
      return [];
    }

    const gptData = await gptResponse.json();
    const content = gptData.choices[0]?.message?.content;
    
    if (!content) return [];

    const similarIngredients = JSON.parse(content);
    return Array.isArray(similarIngredients) ? similarIngredients : [];
  } catch (error) {
    console.error('Error finding similar ingredients:', error);
    return [];
  }
}
