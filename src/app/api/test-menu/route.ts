import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnvironment } from '../../../lib/env-validation';

export async function GET() {
  try {
    // Validate environment variables
    let envConfig;
    try {
      envConfig = validateEnvironment();
    } catch (error) {
      console.error('Environment validation failed:', error);
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Just get the first restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(1)
      .single();

    if (restaurantError) {
      return NextResponse.json({ 
        error: 'Failed to get restaurant', 
        details: restaurantError.message,
        code: restaurantError.code
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      restaurant
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
