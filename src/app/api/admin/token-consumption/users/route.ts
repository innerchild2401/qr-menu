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

    // Get unique users from token consumption
    const { data: users, error: usersError } = await supabase
      .from('token_consumption')
      .select('user_id, user_email')
      .order('user_email');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get unique users
    const uniqueUsers = new Map();
    users?.forEach(item => {
      if (!uniqueUsers.has(item.user_id)) {
        uniqueUsers.set(item.user_id, {
          id: item.user_id,
          email: item.user_email
        });
      }
    });

    const usersList = Array.from(uniqueUsers.values());

    return NextResponse.json({
      success: true,
      data: usersList
    });

  } catch (error) {
    console.error('Token consumption users API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
