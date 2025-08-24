import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserAndRestaurant } from '../../../../../../lib/currentRestaurant';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error) {
      if (error === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      user: { id: user.id, email: user.email },
      restaurant 
    });

  } catch (error) {
    console.error('Error in /api/admin/me/restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
