import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';

interface RequestBody {
  productIds: string[];
  has_recipe: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body: RequestBody = await request.json();
    const { productIds, has_recipe } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Product IDs array is required and must not be empty'
      }, { status: 400 });
    }

    if (typeof has_recipe !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'has_recipe must be a boolean value'
      }, { status: 400 });
    }

    // Create Supabase client
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

    // Update products
    const { data, error } = await supabase
      .from('products')
      .update({ has_recipe })
      .in('id', productIds)
      .select('id, name, has_recipe');

    if (error) {
      console.error('Error updating recipe tags:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update recipe tags'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: data.length,
      products: data
    });

  } catch (error) {
    console.error('Error in bulk update recipe tags:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
