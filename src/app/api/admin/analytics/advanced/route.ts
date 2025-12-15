import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';

type RfmCustomer = {
  customer_id: string;
  last_order_at: string | null;
  frequency: number;
  monetary: number;
};

const median = (arr: number[]) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

export async function GET(request: NextRequest) {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    if (error || !user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Customer order data for RFM
    const { data: customerOrders, error: customerOrdersError } = await supabaseAdmin
      .from('customer_orders')
      .select('customer_id, total, placed_at')
      .eq('restaurant_id', restaurant.id);

    if (customerOrdersError) {
      console.error('Error fetching customer_orders for analytics:', customerOrdersError);
      return NextResponse.json({ error: 'Failed to fetch customer analytics' }, { status: 500 });
    }

    // Table orders for turn time
    const { data: tableOrders, error: tableOrdersError } = await supabaseAdmin
      .from('table_orders')
      .select('placed_at, closed_at, total')
      .eq('restaurant_id', restaurant.id);

    if (tableOrdersError) {
      console.error('Error fetching table_orders for analytics:', tableOrdersError);
      return NextResponse.json({ error: 'Failed to fetch table analytics' }, { status: 500 });
    }

    // RFM aggregation
    const rfmMap = new Map<string, RfmCustomer>();
    customerOrders?.forEach((order) => {
      if (!order.customer_id) return;
      const entry = rfmMap.get(order.customer_id) || {
        customer_id: order.customer_id,
        last_order_at: null,
        frequency: 0,
        monetary: 0,
      };
      entry.frequency += 1;
      entry.monetary += Number(order.total || 0);
      if (!entry.last_order_at || (order.placed_at && new Date(order.placed_at) > new Date(entry.last_order_at))) {
        entry.last_order_at = order.placed_at;
      }
      rfmMap.set(order.customer_id, entry);
    });

    const now = Date.now();
    const rfm = Array.from(rfmMap.values()).map((c) => {
      const recencyDays = c.last_order_at ? (now - new Date(c.last_order_at).getTime()) / (1000 * 60 * 60 * 24) : Infinity;
      return { ...c, recency_days: recencyDays };
    });

    const churnThresholdDays = 30;
    const churnAtRiskCount = rfm.filter((c) => c.recency_days > churnThresholdDays).length;
    const repeatCustomers = rfm.filter((c) => c.frequency > 1).length;
    const totalCustomers = rfm.length;
    const repeatRate = totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;

    // CLV simple estimate: avg monetary * frequency / (recency factor)
    const clv = rfm.map((c) => ({
      customer_id: c.customer_id,
      clv: c.monetary * Math.max(1, c.frequency) * (c.recency_days ? Math.min(180 / c.recency_days, 5) : 5),
      total: c.monetary,
      frequency: c.frequency,
      recency_days: c.recency_days,
    }));

    const topCustomers = clv
      .sort((a, b) => b.clv - a.clv)
      .slice(0, 10);

    // Turn time calculations
    const turnTimes: number[] = [];
    tableOrders?.forEach((o) => {
      if (o.placed_at && o.closed_at) {
        const minutes = (new Date(o.closed_at).getTime() - new Date(o.placed_at).getTime()) / (1000 * 60);
        if (minutes > 0) turnTimes.push(minutes);
      }
    });
    const avgTurn = turnTimes.length ? turnTimes.reduce((a, b) => a + b, 0) / turnTimes.length : 0;
    const medianTurn = median(turnTimes);

    // AOV
    const totals = tableOrders?.map((o) => Number(o.total || 0)) || [];
    const avgOrderValue = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;

    return NextResponse.json({
      customers: {
        total: totalCustomers,
        repeat_rate: repeatRate,
        churn_at_risk: churnAtRiskCount,
        top_customers: topCustomers,
      },
      tables: {
        avg_turn_minutes: avgTurn,
        median_turn_minutes: medianTurn,
      },
      orders: {
        avg_order_value: avgOrderValue,
      },
    });
  } catch (err) {
    console.error('Error in advanced analytics GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

