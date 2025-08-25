import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🚀 API Route: /api/admin/me/restaurant called');
    
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error) {
      console.log('❌ Error:', error);
      if (error === 'Missing user ID in headers') {
        return NextResponse.json(
          { error: 'Unauthorized - Missing user ID' },
          { status: 401 }
        );
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json(
          { error: 'No restaurant found for this user' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (!user || !restaurant) {
      console.log('❌ No user or restaurant found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ Successfully returning restaurant data');
    return NextResponse.json({ 
      user: { id: user.id },
      restaurant 
    });

  } catch (error) {
    console.error('❌ Error in /api/admin/me/restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
