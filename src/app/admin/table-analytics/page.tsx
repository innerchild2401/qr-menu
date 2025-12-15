'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { layout, typography } from '@/lib/design-system';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableMetric {
  table_id: string;
  table_number: string;
  table_name?: string | null;
  area_name?: string | null;
  orders_count: number;
  closed_count: number;
  total_revenue: number;
  avg_check: number;
}

export default function TableAnalyticsPage() {
  const [metrics, setMetrics] = useState<TableMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await authenticatedApiCall('/api/admin/table-analytics');
      const json = await res.json();
      if (res.ok) {
        setMetrics(json.metrics || []);
      }
    } catch (err) {
      console.error('Failed to load table analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const currency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className={cn('min-h-screen bg-background', layout.container, 'py-10')}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={typography.h2}>Table Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Revenue and order volume per table. Based on recorded table orders.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading analytics...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <Card key={m.table_id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    Table {m.table_number} {m.table_name ? `· ${m.table_name}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.area_name || 'Unassigned area'}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Orders: {m.orders_count}
                  <br />
                  Closed: {m.closed_count}
                </div>
              </div>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total revenue</span>
                  <span className="font-semibold">{currency(m.total_revenue)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avg check</span>
                  <span>{currency(m.avg_check)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

