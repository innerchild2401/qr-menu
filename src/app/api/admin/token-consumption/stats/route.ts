import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Check authorization using header-based auth
    const authResult = await getAuthenticatedUser(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // Check if user is authorized
    const { isAdminEmail } = await import('@/lib/config');
    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get total tokens and cost
    const { data: totals, error: totalsError } = await supabase
      .from('token_consumption')
      .select('total_tokens, total_cost_usd');

    if (totalsError) {
      console.error('Error fetching totals:', totalsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch totals' },
        { status: 500 }
      );
    }

    const totalTokens = totals?.reduce((sum, item) => sum + item.total_tokens, 0) || 0;
    const totalCost = totals?.reduce((sum, item) => sum + parseFloat(item.total_cost_usd), 0) || 0;

    // Get top users by token usage
    const { data: topUsers, error: topUsersError } = await supabase
      .from('token_consumption')
      .select('user_email, total_tokens, total_cost_usd')
      .order('total_tokens', { ascending: false })
      .limit(5);

    if (topUsersError) {
      console.error('Error fetching top users:', topUsersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch top users' },
        { status: 500 }
      );
    }

    // Aggregate by user
    const userTotals = new Map();
    topUsers?.forEach(item => {
      const email = item.user_email;
      if (userTotals.has(email)) {
        userTotals.get(email).totalTokens += item.total_tokens;
        userTotals.get(email).totalCost += parseFloat(item.total_cost_usd);
      } else {
        userTotals.set(email, {
          userEmail: email,
          totalTokens: item.total_tokens,
          totalCost: parseFloat(item.total_cost_usd)
        });
      }
    });

    const topUsersList = Array.from(userTotals.values())
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        totalTokens,
        totalCost,
        topUsers: topUsersList
      }
    });

  } catch (error) {
    console.error('Token consumption stats API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
