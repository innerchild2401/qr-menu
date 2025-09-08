/**
 * AI Usage Statistics API
 * Provides comprehensive usage tracking and cost monitoring
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { getGPTUsageStats } from '@/lib/ai/supabase-cache';
import { supabaseAdmin } from '@/lib/supabase-server';

// =============================================================================
// TYPES
// =============================================================================

interface UsageStatsResponse {
  success: boolean;
  data?: {
    daily_stats: {
      total_calls: number;
      total_tokens: number;
      total_cost: number;
      average_processing_time: number;
      error_rate: number;
    };
    weekly_stats: {
      total_calls: number;
      total_tokens: number;
      total_cost: number;
      average_processing_time: number;
      error_rate: number;
    };
    monthly_stats: {
      total_calls: number;
      total_tokens: number;
      total_cost: number;
      average_processing_time: number;
      error_rate: number;
    };
    cost_limit_info: {
      daily_limit: number;
      current_daily_usage: number;
      remaining_budget: number;
      limit_reached: boolean;
    };
    recent_activity: Array<{
      timestamp: string;
      request_type: string;
      cost: number;
      success: boolean;
      processing_time: number;
    }>;
  };
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get authenticated user and their restaurant
 */
async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {
            // Not needed for this endpoint
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Authentication required', status: 401 };
    }

    // Get user's restaurant
    const { data: userRestaurants, error: restaurantError } = await supabase
      .from('user_restaurants')
      .select(`
        restaurants (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !userRestaurants) {
      return { error: 'No restaurant found for user', status: 403 };
    }

    const restaurant = Array.isArray(userRestaurants.restaurants)
      ? userRestaurants.restaurants[0]
      : userRestaurants.restaurants;

    return { user, restaurant };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
}

/**
 * Get date ranges for different periods
 */
function getDateRanges() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthAgoStr = monthAgo.toISOString().split('T')[0];

  return {
    today,
    weekAgo: weekAgoStr,
    monthAgo: monthAgoStr
  };
}

// =============================================================================
// MAIN API HANDLER
// =============================================================================

export async function GET(): Promise<NextResponse<UsageStatsResponse>> {
  try {
    // 1. Authenticate user
    const authResult = await getAuthenticatedUser();
    if ('error' in authResult) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.status });
    }

    const { restaurant } = authResult;
    const { today, weekAgo, monthAgo } = getDateRanges();

    // 2. Get usage statistics for different periods
    const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      getGPTUsageStats(restaurant.id, today, today),
      getGPTUsageStats(restaurant.id, weekAgo, today),
      getGPTUsageStats(restaurant.id, monthAgo, today)
    ]);

    // 3. Calculate cost limit information
    const dailyLimit = 10.0; // $10 daily limit
    const currentDailyUsage = dailyStats.totalCost;
    const remainingBudget = Math.max(0, dailyLimit - currentDailyUsage);
    const limitReached = currentDailyUsage >= dailyLimit;

    // 4. Get recent activity (last 20 calls)
    const { data: recentActivity } = await supabaseAdmin
      .from('gpt_logs')
      .select('created_at, request_type, cost_estimate, error_message, processing_time_ms')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const formattedActivity = (recentActivity || []).map(log => ({
      timestamp: log.created_at,
      request_type: log.request_type,
      cost: log.cost_estimate || 0,
      success: !log.error_message,
      processing_time: log.processing_time_ms || 0
    }));

    // 5. Return comprehensive statistics
    return NextResponse.json({
      success: true,
      data: {
        daily_stats: {
          total_calls: dailyStats.totalCalls,
          total_tokens: dailyStats.totalTokens,
          total_cost: dailyStats.totalCost,
          average_processing_time: dailyStats.averageProcessingTime,
          error_rate: dailyStats.errorRate,
        },
        weekly_stats: {
          total_calls: weeklyStats.totalCalls,
          total_tokens: weeklyStats.totalTokens,
          total_cost: weeklyStats.totalCost,
          average_processing_time: weeklyStats.averageProcessingTime,
          error_rate: weeklyStats.errorRate,
        },
        monthly_stats: {
          total_calls: monthlyStats.totalCalls,
          total_tokens: monthlyStats.totalTokens,
          total_cost: monthlyStats.totalCost,
          average_processing_time: monthlyStats.averageProcessingTime,
          error_rate: monthlyStats.errorRate,
        },
        cost_limit_info: {
          daily_limit: dailyLimit,
          current_daily_usage: currentDailyUsage,
          remaining_budget: remainingBudget,
          limit_reached: limitReached
        },
        recent_activity: formattedActivity
      }
    });

  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch usage statistics'
    }, { status: 500 });
  }
}
