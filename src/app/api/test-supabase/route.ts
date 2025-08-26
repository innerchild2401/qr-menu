import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'supabaseAdmin not configured' }, { status: 500 });
    }

    // Test a simple query
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase test error:', error);
      return NextResponse.json({ 
        error: 'Supabase connection failed', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection working',
      data: data
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
