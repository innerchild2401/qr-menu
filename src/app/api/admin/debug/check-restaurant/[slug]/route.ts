import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    
    // Query using supabaseAdmin to bypass any RLS restrictions
    const { data, error, count } = await supabaseAdmin
      .from('restaurants')
      .select('*', { count: 'exact' })
      .eq('slug', slug)
      .limit(1);

    return NextResponse.json({
      ok: true,
      slug,
      found: data && data.length > 0,
      rowCount: count || 0,
      restaurant: data?.[0] || null,
      error: error?.message || null
    });

  } catch (exception) {
    // Get slug from params even in catch block
    let slug = 'unknown';
    try {
      const { slug: slugParam } = await params;
      slug = slugParam;
    } catch {
      // If we can't get slug, use 'unknown'
    }

    return NextResponse.json({
      ok: false,
      slug,
      found: false,
      rowCount: 0,
      restaurant: null,
      error: exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : null
    }, { status: 500 });
  }
}
