import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET(): Promise<NextResponse> {
  try {
    // Simple test - just try to get one product
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .limit(1);

    if (error) {
      return NextResponse.json({
        error: 'Database error',
        message: error.message,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Error in test-schema:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
