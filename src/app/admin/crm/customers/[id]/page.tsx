'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { layout, typography, gaps } from '@/lib/design-system';
import { Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authenticatedApiCall } from '@/lib/api-helpers';

interface Customer {
  id: string;
  name?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  total_visits: number;
  total_spent: number;
  last_seen_at?: string;
  status?: string;
  phone_shared_with_restaurant: boolean;
}

export default function CustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone_number: '',
    email: '',
    address: '',
    notes: '',
    tags: '',
    phone_shared_with_restaurant: false,
  });

  useEffect(() => {
    (async () => {
      const { id } = await params;
      await loadCustomer(id);
    })();
  }, [params]);

  const loadCustomer = async (id: string) => {
    setLoading(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/crm/customers/${id}`);
      const json = await res.json();
      if (res.ok && json.customer) {
        setCustomer(json.customer);
        setForm({
          name: json.customer.name || '',
          phone_number: json.customer.phone_number || '',
          email: json.customer.email || '',
          address: json.customer.address || '',
          notes: json.customer.notes || '',
          tags: (json.customer.tags || []).join(', '),
          phone_shared_with_restaurant: !!json.customer.phone_shared_with_restaurant,
        });
      }
    } catch (error) {
      console.error('Failed to load customer', error);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/crm/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        await loadCustomer(customer.id);
      } else {
        console.error('Save failed', await res.text());
      }
    } catch (error) {
      console.error('Save failed', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <div className={cn('min-h-screen bg-background', layout.container, 'py-10')}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className={typography.h2}>Customer Profile</h1>
            <p className="text-sm text-muted-foreground">
              Readable forms with explicit text colors for modals and cards.
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={saving || loading}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save
        </Button>
      </div>

      {loading || !customer ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading customer...
        </div>
      ) : (
        <div className={cn('grid', gaps.sm, 'lg:grid-cols-3')}>
          <Card className="p-4 bg-card text-card-foreground lg:col-span-2">
            <div className="grid gap-4">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder="Phone number"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <Textarea
                placeholder="Notes (visible to staff)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <Input
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.phone_shared_with_restaurant}
                  onChange={(e) =>
                    setForm({ ...form, phone_shared_with_restaurant: e.target.checked })
                  }
                />
                Phone can be shared with restaurant
              </label>
            </div>
          </Card>

          <Card className="p-4 bg-card text-card-foreground space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Visits</span>
              <span className="text-lg font-semibold text-foreground">{customer.total_visits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total spent</span>
              <span className="text-lg font-semibold text-foreground">
                {customer.total_spent?.toFixed ? customer.total_spent.toFixed(2) : customer.total_spent || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last seen</span>
              <span className="text-sm text-foreground">{formatDate(customer.last_seen_at)}</span>
            </div>
            <Badge variant="secondary" className="capitalize">
              {customer.status || 'active'}
            </Badge>
          </Card>
        </div>
      )}
    </div>
  );
}

