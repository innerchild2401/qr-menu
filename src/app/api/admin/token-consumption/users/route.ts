import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Check authorization
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user session
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user is authorized (afilip.mme@gmail.com)
    if (user.email !== 'afilip.mme@gmail.com') {
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
