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

    // Create a condensed product summary to stay within token limits
    // while still giving AI the full menu context
    const productSummary = (products || []).map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category_name,
      available: product.available,
      // Only include essential fields to reduce token usage
      description: product.description?.substring(0, 100) || '', // Truncate long descriptions
      cost: product.cost || 0,
      preparation_time: product.preparation_time || 0,
    }));

    console.log(`Processing ${(products || []).length} products with condensed summary approach`);

    // Prepare full menu context with condensed product data
    const menuContext = {
      restaurant: {
        name: restaurant.name,
        cuisine: restaurant.cuisine_type,
        location: restaurant.location,
      },
      categories: categories || [],
      products: productSummary, // Use condensed product data
      fixedCosts,
      userCountry: userCountry || 'US',
      totalProducts: (products || []).length,
      note: "Product data has been condensed to fit within token limits while preserving essential information for comprehensive menu analysis."
    };

    // Call GPT-4o mini API with full menu context
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
            content: `Please analyze this restaurant data and provide comprehensive insights for the entire menu:\n\n${JSON.stringify(menuContext, null, 2)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 16000,
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
      
      // Get user email from the authorization header (it's a Bearer token, not JSON)
      const authHeader = request.headers.get('authorization');
      let userEmail = 'unknown@example.com';
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // For now, use admin email from config since we can't extract it from the Bearer token
        // In a real implementation, you'd decode the JWT token
        const { ADMIN_CONFIG } = await import('@/lib/config');
        userEmail = ADMIN_CONFIG.ADMIN_EMAIL;
      }
      
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
      // Try to parse the content directly first
      insightData = JSON.parse(content);
    } catch (firstError) {
      try {
        // If that fails, try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          insightData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (secondError) {
        console.error('JSON Parse Error (first attempt):', firstError);
        console.error('JSON Parse Error (second attempt):', secondError);
        console.error('Raw content:', content.substring(0, 500) + '...');
        
        // Fallback: create a structured response with the raw content
        insightData = {
          normalizedIngredients: [],
          priceCheck: [],
          breakEvenAnalysis: [],
          profitabilitySuggestions: [],
          upsellIdeas: [],
          marketingPopups: [],
          strategicRecommendations: [],
          categoryOptimization: {
            currentOrder: categories?.map(c => c.name) || [],
            suggestedOrder: [],
            reasoning: 'Unable to parse AI response',
            expectedRevenueIncrease: 0,
          },
          unavailableItems: [],
          summary: content,
          generatedAt: new Date().toISOString(),
        };
      }
    }
    const structuredResponse = {
      normalizedIngredients: Array.isArray(insightData.normalizedIngredients) 
        ? insightData.normalizedIngredients.map((ing: string | object) => typeof ing === 'string' ? { ingredient: ing, normalized: ing, quantity: '1', category: 'unknown' } : ing)
        : [],
      priceCheck: insightData.priceCheck || [],
      breakEvenAnalysis: Array.isArray(insightData.breakEvenAnalysis)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? insightData.breakEvenAnalysis.map((item: any) => ({
            menuItem: item.menuItem || 'Unknown Item',
            monthlyBreakEvenUnits: item.monthlyBreakEvenUnits || 0,
            cogs: item.cogs || 0,
            price: item.price || 0,
            contributionMargin: item.contributionMargin || 0,
            reasoning: item.reasoning || 'No reasoning provided'
          }))
        : [],
      profitabilitySuggestions: Array.isArray(insightData.profitabilitySuggestions)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? insightData.profitabilitySuggestions.map((suggestion: any) => ({
            menuItem: suggestion.menuItem || suggestion.item || 'Unknown Item',
            action: suggestion.action || 'ANALYZE',
            suggestedCombo: suggestion.suggestedCombo || [],
            expectedProfitIncrease: suggestion.expectedProfitIncrease || 0,
            reasoning: suggestion.reasoning || 'No reasoning provided',
            implementation: suggestion.implementation || 'No implementation details'
          }))
        : [],
      upsellIdeas: Array.isArray(insightData.upsellIdeas)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? insightData.upsellIdeas.map((idea: any) => ({
            menuItem: idea.menuItem || idea.item || 'Unknown Item',
            upsellItem: idea.upsellItem || idea.upsell || 'Unknown Upsell',
            additionalRevenue: idea.additionalRevenue || 0,
            reasoning: idea.reasoning || 'No reasoning provided',
            implementation: idea.implementation || 'No implementation details',
            timing: idea.timing || 'Anytime',
            targetCustomer: idea.targetCustomer || 'All customers'
          }))
        : [],
      marketingPopups: Array.isArray(insightData.marketingPopups)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? insightData.marketingPopups.map((popup: any) => ({
            title: popup.title || 'Marketing Campaign',
            message: popup.message || popup.popup || 'No message provided',
            targetItems: popup.targetItems || [],
            timing: popup.timing || 'Anytime',
            expectedImpact: popup.expectedImpact || 'No impact data',
            implementation: popup.implementation || 'No implementation details'
          }))
        : [],
      strategicRecommendations: Array.isArray(insightData.strategicRecommendations)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? insightData.strategicRecommendations.map((rec: any) => ({
            priority: rec.priority || 'MEDIUM',
            action: rec.action || 'No action specified',
            targetItems: rec.targetItems || [],
            expectedImpact: rec.expectedImpact || 'No impact data',
            timeline: rec.timeline || 'ASAP',
            resources: rec.resources || 'No resources specified'
          }))
        : [],
      categoryOptimization: {
        currentOrder: insightData.categoryOptimization?.currentOrder || [],
        suggestedOrder: insightData.categoryOptimization?.suggestedOrder || [],
        reasoning: insightData.categoryOptimization?.reasoning || 'No optimization suggestions available',
        expectedRevenueIncrease: insightData.categoryOptimization?.expectedRevenueIncrease || 0,
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
