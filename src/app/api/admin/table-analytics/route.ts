import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../lib/supabase-server';

interface TableMetrics {
  table_id: string;
  table_number: string;
  table_name?: string | null;
  area_name?: string | null;
  orders_count: number;
  closed_count: number;
  total_revenue: number;
  avg_check: number;
}

export async function GET(request: NextRequest) {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error || !user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch tables for label data
    type TableRow = {
      id: string;
      table_number: string;
      table_name?: string | null;
      area?: { name?: string | null } | { name?: string | null }[] | null;
    };

    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('tables')
      .select('id, table_number, table_name, area:areas(name)')
      .eq('restaurant_id', restaurant.id);

    if (tablesError) {
      console.error('Error fetching tables for analytics:', tablesError);
      return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
    }

    // Fetch orders for this restaurant
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('table_orders')
      .select('table_id, total, order_status')
      .eq('restaurant_id', restaurant.id);

    if (ordersError) {
      console.error('Error fetching table orders for analytics:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Aggregate metrics by table
    const metricsMap = new Map<string, TableMetrics>();

    const normalizeAreaName = (area: TableRow['area']): string | null => {
      if (!area) return null;
      if (Array.isArray(area)) return area[0]?.name ?? null;
      return area.name ?? null;
    };

    (tables as TableRow[] | null | undefined)?.forEach((t) => {
      const areaName = normalizeAreaName(t.area);
      metricsMap.set(t.id, {
        table_id: t.id,
        table_number: t.table_number,
        table_name: t.table_name,
        area_name: areaName,
        orders_count: 0,
        closed_count: 0,
        total_revenue: 0,
        avg_check: 0,
      });
    });

    orders?.forEach((order) => {
      const entry = metricsMap.get(order.table_id);
      if (!entry) return;
      entry.orders_count += 1;
      if (order.order_status === 'closed') {
        entry.closed_count += 1;
      }
      entry.total_revenue += Number(order.total || 0);
    });

    // Compute avg check
    metricsMap.forEach((entry) => {
      entry.avg_check = entry.orders_count > 0 ? entry.total_revenue / entry.orders_count : 0;
    });

    const metrics = Array.from(metricsMap.values()).sort((a, b) =>
      a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
    );

    return NextResponse.json({ metrics });
  } catch (err) {
    console.error('Error in admin table analytics GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

