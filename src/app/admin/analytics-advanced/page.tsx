'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { layout, typography } from '@/lib/design-system';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { Loader2, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopCustomer {
  customer_id: string;
  clv: number;
  total: number;
  frequency: number;
  recency_days: number;
}

interface AdvancedAnalytics {
  customers: {
    total: number;
    repeat_rate: number;
    churn_at_risk: number;
    top_customers: TopCustomer[];
  };
  tables: {
    avg_turn_minutes: number;
    median_turn_minutes: number;
  };
  orders: {
    avg_order_value: number;
  };
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authenticatedApiCall('/api/admin/analytics/advanced');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={cn('min-h-screen bg-background', layout.container, 'py-10')}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={typography.h2}>Advanced Analytics</h1>
          <p className="text-muted-foreground text-sm">RFM-inspired metrics, churn risk, and table turn time.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading analytics...
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Repeat rate</p>
              <p className="text-2xl font-semibold">
                {(data.customers.repeat_rate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Customers with {'>'}1 order</p>
            </Card>
            <Card className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Churn risk</p>
              <p className="text-2xl font-semibold">{data.customers.churn_at_risk}</p>
              <p className="text-xs text-muted-foreground">Last order {'>'} 30 days</p>
            </Card>
            <Card className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Avg order value</p>
              <p className="text-2xl font-semibold">{currency(data.orders.avg_order_value)}</p>
              <p className="text-xs text-muted-foreground">Across table orders</p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Avg table turn</p>
              <p className="text-2xl font-semibold">{data.tables.avg_turn_minutes.toFixed(1)} min</p>
              <p className="text-xs text-muted-foreground">Median: {data.tables.median_turn_minutes.toFixed(1)} min</p>
            </Card>
            <Card className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Total customers</p>
              <p className="text-2xl font-semibold">{data.customers.total}</p>
              <p className="text-xs text-muted-foreground">Tracked with orders</p>
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Top customers (CLV-ish)</p>
                <p className="text-base font-semibold">Highest projected value</p>
              </div>
            </div>
            <div className="divide-y">
              {data.customers.top_customers.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No customer data yet.</p>
              )}
              {data.customers.top_customers.map((c) => (
                <div key={c.customer_id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{c.customer_id.slice(0, 8)}…</p>
                    <p className="text-xs text-muted-foreground">
                      Orders: {c.frequency} · Last {c.recency_days === Infinity ? '—' : `${c.recency_days.toFixed(0)}d ago`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{currency(c.clv)}</p>
                    <p className="text-xs text-muted-foreground">Spent {currency(c.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <p className="text-muted-foreground">No analytics available.</p>
      )}
    </div>
  );
}

