/**
 * AI Product Data Generation API Route
 * POST /api/generate-product-data
 * 
 * Generates product descriptions, recipes, nutrition, and allergens using OpenAI GPT-4o-mini
 * with intelligent caching and batching for cost optimization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { 
  generateBatchProductData,
  validateBatchInput,
  type ProductGenerationInput 
} from '@/lib/ai/product-generator';
import { isOpenAIAvailable } from '@/lib/ai/openai-client';

// =============================================================================
// TYPES
// =============================================================================

interface RequestBody {
  products: Array<{
    id: string;
    name: string;
    manual_language_override?: 'ro' | 'en';
  }>;
}

interface ApiResponse {
  success: boolean;
  results?: Array<{
    id: string;
    language: 'ro' | 'en';
    generated_description: string;
    recipe: Array<{ ingredient: string; quantity: string }>;
    nutritional_values: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    allergens: string[];
    error?: string;
  }>;
  summary?: {
    total_products: number;
    cached_products: number;
    generated_products: number;
    failed_products: number;
    total_cost: number;
    total_processing_time: number;
  };
  error?: string;
  code?: string;
}

// =============================================================================
// AUTHENTICATION & AUTHORIZATION
// =============================================================================

/**
 * Get authenticated user and their restaurant
 */
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const supabase = createServerClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for read operations
          },
          remove() {
            // Not needed for read operations
          },
        },
      }
    );

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { error: 'Authentication required', status: 401 };
    }

    // Get user's restaurant
    const { data: userRestaurants, error: restaurantError } = await supabase
      .from('user_restaurants')
      .select(`
        restaurant_id,
        role,
        restaurants!inner (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (restaurantError || !userRestaurants) {
      return { error: 'No restaurant associated with user', status: 403 };
    }

    // Ensure restaurants is not an array
    const restaurant = Array.isArray(userRestaurants.restaurants) 
      ? userRestaurants.restaurants[0] 
      : userRestaurants.restaurants;

    return {
      user: session.user,
      restaurant,
      role: userRestaurants.role,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
}

/**
 * Validate that products belong to user's restaurant
 */
async function validateProductOwnership(
  productIds: string[], 
  restaurantId: string,
  request: NextRequest
): Promise<{ valid: boolean; error?: string }> {
  try {
    const supabase = createServerClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: products, error } = await supabase
      .from('products')
      .select('id, restaurant_id')
      .in('id', productIds);

    if (error) {
      console.error('Error validating product ownership:', error);
      return { valid: false, error: 'Failed to validate product ownership' };
    }

    // Check that all products belong to the user's restaurant
    const invalidProducts = products.filter(product => product.restaurant_id !== restaurantId);
    if (invalidProducts.length > 0) {
      return { 
        valid: false, 
        error: `Products ${invalidProducts.map(p => p.id).join(', ')} do not belong to your restaurant` 
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Product ownership validation error:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Validate and parse request body
 */
function validateRequestBody(body: unknown): { valid: boolean; data?: RequestBody; error?: string } {
  try {
    if (!body || typeof body !== 'object') {
      return { valid: false, error: 'Request body must be a JSON object' };
    }

    const bodyObj = body as Record<string, unknown>;
    
    if (!Array.isArray(bodyObj.products)) {
      return { valid: false, error: 'Products field must be an array' };
    }

    if (bodyObj.products.length === 0) {
      return { valid: false, error: 'At least one product is required' };
    }

    if (bodyObj.products.length > 10) {
      return { valid: false, error: 'Maximum 10 products allowed per request' };
    }

    // Validate each product
    for (let i = 0; i < bodyObj.products.length; i++) {
      const product = bodyObj.products[i] as Record<string, unknown>;
      
      if (!product.id || typeof product.id !== 'string') {
        return { valid: false, error: `Product at index ${i}: id is required and must be a string` };
      }

      if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
        return { valid: false, error: `Product at index ${i}: name is required and must be a non-empty string` };
      }

      if (product.name.length > 200) {
        return { valid: false, error: `Product at index ${i}: name must be less than 200 characters` };
      }

      if (product.manual_language_override && !['ro', 'en'].includes(product.manual_language_override as string)) {
        return { valid: false, error: `Product at index ${i}: manual_language_override must be "ro" or "en"` };
      }
    }

    return { valid: true, data: bodyObj as unknown as RequestBody };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

// =============================================================================
// MAIN API HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();

  try {
    // 1. Check if OpenAI is available
    if (!isOpenAIAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'AI service is not available. Please configure OpenAI API key.',
        code: 'AI_SERVICE_UNAVAILABLE'
      }, { status: 503 });
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      }, { status: 400 });
    }

    const { valid: bodyValid, data: requestData, error: bodyError } = validateRequestBody(body);
    if (!bodyValid) {
      return NextResponse.json({
        success: false,
        error: bodyError,
        code: 'INVALID_REQUEST'
      }, { status: 400 });
    }

    // 3. Authenticate user
    const authResult = await getAuthenticatedUser(request);
    if ('error' in authResult) {
      return NextResponse.json({
        success: false,
        error: authResult.error,
        code: 'AUTHENTICATION_FAILED'
      }, { status: authResult.status });
    }

    const { user, restaurant } = authResult;

    // 4. Validate product ownership
    const productIds = requestData!.products.map(p => p.id);
    const { valid: ownershipValid, error: ownershipError } = await validateProductOwnership(
      productIds,
      restaurant.id,
      request
    );

    if (!ownershipValid) {
      return NextResponse.json({
        success: false,
        error: ownershipError,
        code: 'UNAUTHORIZED_PRODUCTS'
      }, { status: 403 });
    }

    // 5. Convert request to internal format
    const generationInputs: ProductGenerationInput[] = requestData!.products.map(product => ({
      id: product.id,
      name: product.name,
      manual_language_override: product.manual_language_override,
      restaurant_id: restaurant.id,
    }));

    // 6. Validate generation inputs
    const inputValidationError = validateBatchInput(generationInputs);
    if (inputValidationError) {
      return NextResponse.json({
        success: false,
        error: inputValidationError,
        code: 'INVALID_INPUT'
      }, { status: 400 });
    }

    // 7. Generate product data
    const { results, summary } = await generateBatchProductData(generationInputs);

    // 8. Format response
    const responseResults = results.map(result => ({
      id: result.id,
      language: result.language,
      generated_description: result.generated_description,
      recipe: result.recipe,
      nutritional_values: result.nutritional_values,
      allergens: result.allergens,
      ...(result.error && { error: result.error })
    }));

    const responseSummary = {
      total_products: summary.total_products,
      cached_products: summary.cached_products,
      generated_products: summary.generated_products,
      failed_products: summary.failed_products,
      total_cost: Math.round(summary.total_cost * 10000) / 10000, // Round to 4 decimal places
      total_processing_time: Date.now() - startTime,
    };

    // 9. Return success response
    return NextResponse.json({
      success: true,
      results: responseResults,
      summary: responseSummary,
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in generate-product-data API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while generating product data',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// =============================================================================
// METHOD NOT ALLOWED
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to generate product data.',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to generate product data.',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to generate product data.',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}
