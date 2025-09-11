import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { trackTokenConsumption, extractTokenUsageFromResponse } from '@/lib/api/token-tracker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userId = request.headers.get('x-user-id');
    const authHeader = request.headers.get('authorization');
    
    if (!userId || !authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { systemPrompt, restaurantId, fixedCosts, userCountry } = await request.json();

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Verify the user has access to the restaurant
    const { data: userRestaurant, error: userRestaurantError } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (userRestaurantError || !userRestaurant) {
      return NextResponse.json(
        { success: false, error: 'Access denied to restaurant' },
        { status: 403 }
      );
    }

    // Get restaurant data
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get menu items and categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order');

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('available', true)
      .order('sort_order');

    // Prepare context for GPT
    const menuContext = {
      restaurant: {
        name: restaurant.name,
        cuisine: restaurant.cuisine_type,
        location: restaurant.location,
      },
      categories: categories || [],
      products: products || [],
      fixedCosts,
      userCountry: userCountry || 'US',
    };

    // Call GPT-4o mini API
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
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Please analyze this restaurant data and provide insights:\n\n${JSON.stringify(menuContext, null, 2)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!gptResponse.ok) {
      const errorData = await gptResponse.json();
      console.error('GPT API Error:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to generate insights from AI' },
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
      const tokenUsage = extractTokenUsageFromResponse(gptData);
      
      // Get user email from the authorization header
      const authHeader = request.headers.get('authorization');
      const userEmail = authHeader ? JSON.parse(authHeader).email : 'unknown@example.com';
      
      await trackTokenConsumption({
        userId: userId,
        userEmail: userEmail,
        apiEndpoint: '/api/generate-insights',
        requestId: gptData.id,
        usage: tokenUsage,
        model: 'gpt-4o-mini'
      });
    } catch (error) {
      console.error('Failed to track token consumption:', error);
      // Don't fail the main request if tracking fails
    }

    // Parse JSON response
    let insightData;
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insightData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      // Fallback: create a structured response with the raw content
      insightData = {
        normalizedIngredients: [],
        priceCheck: [],
        breakEvenAnalysis: [],
        profitabilitySuggestions: [],
        upsellIdeas: [],
        marketingPopups: [],
        categoryOptimization: {
          currentOrder: [],
          suggestedOrder: [],
          reasoning: 'Unable to parse AI response',
          expectedRevenueIncrease: 0,
        },
        unavailableItems: [],
        summary: content,
        generatedAt: new Date().toISOString(),
      };
    }

    // Ensure all required fields exist
    const structuredResponse = {
      normalizedIngredients: insightData.normalizedIngredients || [],
      priceCheck: insightData.priceCheck || [],
      breakEvenAnalysis: insightData.breakEvenAnalysis || [],
      profitabilitySuggestions: insightData.profitabilitySuggestions || [],
      upsellIdeas: insightData.upsellIdeas || [],
      marketingPopups: insightData.marketingPopups || [],
      categoryOptimization: insightData.categoryOptimization || {
        currentOrder: [],
        suggestedOrder: [],
        reasoning: 'No optimization suggestions available',
        expectedRevenueIncrease: 0,
      },
      unavailableItems: insightData.unavailableItems || [],
      summary: insightData.summary || content,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: structuredResponse,
    });

  } catch (error) {
    console.error('Generate insights error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
