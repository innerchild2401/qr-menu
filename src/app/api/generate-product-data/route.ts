/**
 * AI Product Data Generation API Route
 * POST /api/generate-product-data
 * 
 * Generates product descriptions, recipes, nutrition, and allergens using OpenAI GPT-4o-mini
 * with intelligent caching and batching for cost optimization.
 * 
 * Version 2.0 - Cache bust fix
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { 
  generateBatchProductData,
  validateBatchInput,
  getProductsForGeneration,
  type ProductGenerationInput 
} from '@/lib/ai/product-generator';
import { isOpenAIAvailable } from '@/lib/ai/openai-client';
import { getGPTUsageStats } from '@/lib/ai/supabase-cache';

// =============================================================================
// CONSTANTS
// =============================================================================

const COST_THRESHOLD_PER_RESTAURANT_DAILY = 10.0; // $10 daily limit per restaurant

// =============================================================================
// TYPES
// =============================================================================

interface RequestBody {
  products: Array<{
    id: string;
    name: string;
    manual_language_override?: 'ro' | 'en';
  }>;
  scenario?: 'new' | 'regenerate_all' | 'recipe_edited' | 'force';
  respect_cost_limits?: boolean;
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
    skipped_products: number;
    bottled_drinks_skipped: number;
    total_cost: number;
    total_processing_time: number;
    scenario: string;
    cost_limit_exceeded?: boolean;
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
    // Check for Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Authentication required', status: 401 };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

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
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the token by getting the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
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
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !userRestaurants) {
      return { error: 'No restaurant associated with user', status: 403 };
    }

    // Ensure restaurants is not an array
    const restaurant = Array.isArray(userRestaurants.restaurants) 
      ? userRestaurants.restaurants[0] 
      : userRestaurants.restaurants;

    return {
      user,
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
    console.log('validateProductOwnership called with:', { productIds, restaurantId });
    
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

    console.log('Querying products table for IDs:', productIds);
    const { data: products, error } = await supabase
      .from('products')
      .select('id, restaurant_id')
      .in('id', productIds);

    console.log('Product ownership query result:', { products, error });

    if (error) {
      console.error('Error validating product ownership:', error);
      return { valid: false, error: 'Failed to validate product ownership' };
    }

    // Check that all products belong to the user's restaurant
    console.log('Checking product ownership for restaurant:', restaurantId);
    console.log('Found products:', products);
    
    const invalidProducts = products.filter(product => product.restaurant_id !== restaurantId);
    console.log('Invalid products (not owned by restaurant):', invalidProducts);
    
    if (invalidProducts.length > 0) {
      console.error('Product ownership validation failed - products not owned by restaurant');
      return { 
        valid: false, 
        error: `Products ${invalidProducts.map(p => p.id).join(', ')} do not belong to your restaurant` 
      };
    }

    console.log('Product ownership validation successful');
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
      
      console.log(`Product ${i} validation:`, {
        id: product.id,
        idType: typeof product.id,
        name: product.name,
        nameType: typeof product.name
      });
      
      if (!product.id || typeof product.id !== 'string' || product.id.trim().length === 0) {
        return { valid: false, error: `Product at index ${i}: id is required and must be a non-empty string` };
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
      console.log('Received request body:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('JSON parsing error:', error);
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
    console.log('Authenticating user...');
    const authResult = await getAuthenticatedUser(request);
    if ('error' in authResult) {
      console.error('Authentication failed:', authResult.error);
      return NextResponse.json({
        success: false,
        error: authResult.error,
        code: 'AUTHENTICATION_FAILED'
      }, { status: authResult.status });
    }
    console.log('Authentication successful for user:', authResult.user?.email);

    const { user, restaurant } = authResult;

    // 4. Validate product ownership
    const allProductIds = requestData!.products.map(p => p.id);
    console.log('Validating product ownership for products:', allProductIds);
    console.log('Restaurant ID:', restaurant.id);
    
    const { valid: ownershipValid, error: ownershipError } = await validateProductOwnership(
      allProductIds,
      restaurant.id,
      request
    );

    console.log('Product ownership validation result:', { ownershipValid, ownershipError });

    if (!ownershipValid) {
      console.error('Product ownership validation failed:', ownershipError);
      return NextResponse.json({
        success: false,
        error: ownershipError,
        code: 'UNAUTHORIZED_PRODUCTS'
      }, { status: 403 });
    }

    // 5. Determine generation scenario and filter products intelligently
    const scenario = requestData!.scenario || 'force';
    const respectCostLimits = requestData!.respect_cost_limits !== false; // Default to true
    
    console.log('Determining generation scenario:', { scenario, respectCostLimits });
    
    let productsToGenerate: Array<{ id: string; name: string; manual_language_override?: 'ro' | 'en'; reason: string }>;
    
    if (scenario === 'regenerate_all') {
      // Use intelligent filtering for "regenerate all"
      console.log('Using getProductsForGeneration for regenerate_all scenario');
      try {
        productsToGenerate = await getProductsForGeneration(allProductIds, scenario, restaurant.id);
        console.log('getProductsForGeneration result:', productsToGenerate);
        
        if (!productsToGenerate || productsToGenerate.length === 0) {
          console.log('No products to generate after filtering');
          return NextResponse.json({
            success: true,
            results: [],
            message: 'No products need AI generation after filtering'
          });
        }
      } catch (error) {
        console.error('Error in getProductsForGeneration:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({
          success: false,
          error: 'Failed to determine products for generation',
          code: 'GENERATION_FILTER_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 });
      }
    } else {
      // For other scenarios, process all requested products
      productsToGenerate = requestData!.products.map(product => ({
        id: product.id,
        name: product.name,
        manual_language_override: product.manual_language_override,
        reason: scenario === 'new' ? 'New product' : 'Manual request'
      }));
    }

    if (productsToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        summary: {
          total_products: requestData!.products.length,
          cached_products: 0,
          generated_products: 0,
          failed_products: 0,
          skipped_products: requestData!.products.length,
          bottled_drinks_skipped: 0,
          total_cost: 0,
          total_processing_time: Date.now() - startTime,
          scenario,
        }
      });
    }

    // 6. Convert to internal format
    console.log('Converting products to generation inputs:', productsToGenerate);
    const generationInputs: ProductGenerationInput[] = productsToGenerate.map(product => ({
      id: String(product.id), // Ensure ID is a string
      name: product.name,
      manual_language_override: product.manual_language_override,
      restaurant_id: restaurant.id,
    }));

    // 7. Validate generation inputs
    console.log('Validating generation inputs:', generationInputs);
    const inputValidationError = validateBatchInput(generationInputs);
    if (inputValidationError) {
      console.error('Generation input validation failed:', inputValidationError);
      return NextResponse.json({
        success: false,
        error: inputValidationError,
        code: 'INVALID_INPUT'
      }, { status: 400 });
    }
    console.log('Generation input validation passed');

    // 8. Check cost limits if enabled
    let costLimitExceeded = false;
    if (respectCostLimits) {
      try {
        const stats = await getGPTUsageStats(restaurant.id, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]);
        if (stats.totalCost >= COST_THRESHOLD_PER_RESTAURANT_DAILY) {
          costLimitExceeded = true;
        }
      } catch (error) {
        console.warn('Could not check cost limits:', error);
      }
    }

    if (costLimitExceeded) {
      return NextResponse.json({
        success: false,
        error: `Daily cost limit of $${COST_THRESHOLD_PER_RESTAURANT_DAILY} exceeded for restaurant`,
        code: 'COST_LIMIT_EXCEEDED',
        summary: {
          total_products: requestData!.products.length,
          cached_products: 0,
          generated_products: 0,
          failed_products: 0,
          skipped_products: requestData!.products.length,
          bottled_drinks_skipped: 0,
          total_cost: 0,
          total_processing_time: Date.now() - startTime,
          scenario,
          cost_limit_exceeded: true,
        }
      }, { status: 429 });
    }

    // 9. Generate product data with optimizations
    const { results, summary } = await generateBatchProductData(generationInputs);

    // 10. Format response
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
      skipped_products: requestData!.products.length - productsToGenerate.length,
      bottled_drinks_skipped: 0, // Will be calculated by the generator
      total_cost: Math.round(summary.total_cost * 10000) / 10000, // Round to 4 decimal places
      total_processing_time: Date.now() - startTime,
      scenario,
    };

    // 11. Return success response
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
