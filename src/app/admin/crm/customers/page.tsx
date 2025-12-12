'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { layout, typography, gaps } from '@/lib/design-system';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authenticatedApiCall } from '@/lib/api-helpers';

interface Customer {
  id: string;
  name?: string;
  phone_number?: string;
  total_visits: number;
  total_spent: number;
  last_seen_at?: string;
  status?: string;
  phone_shared_with_restaurant: boolean;
  tags?: string[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await authenticatedApiCall(`/api/admin/crm/customers${qs}`);
      const json = await res.json();
      if (res.ok) {
        setCustomers(json.customers || []);
      }
    } catch (error) {
      console.error('Failed to load customers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <div className={cn('min-h-screen bg-background', layout.container, 'py-10')}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={typography.h2}>Customers</h1>
          <p className="text-sm text-muted-foreground">
            Anonymous-first, enrichable profiles. Phone/name are optional and readable in all dialogs.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, phone, or anonymous id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <Button onClick={load} disabled={loading}>
          Search
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading customers...
        </div>
      ) : (
        <div className={cn('grid', gaps.sm, 'md:grid-cols-2 xl:grid-cols-3')}>
          {customers.map((c) => (
            <Link key={c.id} href={`/admin/crm/customers/${c.id}`}>
              <Card className="p-4 bg-card text-card-foreground hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {c.name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {c.phone_number || 'No phone'}
                    </p>
                  </div>
                  <Badge variant={c.phone_shared_with_restaurant ? 'secondary' : 'outline'}>
                    {c.phone_shared_with_restaurant ? 'Phone shared' : 'Masked'}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-foreground/60">Visits</p>
                    <p className="text-base font-semibold text-foreground">{c.total_visits}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-foreground/60">Total</p>
                    <p className="text-base font-semibold text-foreground">
                      {c.total_spent?.toFixed ? c.total_spent.toFixed(2) : c.total_spent || 0}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Last seen: {formatDate(c.last_seen_at)}
                </p>
                {c.tags && c.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

