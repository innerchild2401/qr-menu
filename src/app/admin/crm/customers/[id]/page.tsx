'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { layout, typography, gaps } from '@/lib/design-system';
import { Loader2, ArrowLeft, Calendar, ShoppingBag, History } from 'lucide-react';
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
  customer_segment?: string;
  phone_shared_with_restaurant: boolean;
}

interface Visit {
  id: string;
  visit_timestamp: string;
  table_id?: string;
  area_id?: string;
  qr_code_type?: string;
  order_placed: boolean;
  order_value?: number;
  table?: { id: string; table_number: string; table_name?: string };
  area?: { id: string; name: string };
  device_info?: Record<string, unknown>;
}

interface Order {
  id: string;
  placed_at: string;
  completed_at?: string;
  order_status: string;
  order_type: string;
  subtotal: number;
  total: number;
  payment_method?: string;
  table_id?: string;
  area_id?: string;
  order_items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  table?: { id: string; table_number: string; table_name?: string };
  area?: { id: string; name: string };
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
  const [visits, setVisits] = useState<Visit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
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
      if (id) {
        await loadVisits(id);
        await loadOrders(id);
      }
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

  const loadVisits = async (customerId: string) => {
    setLoadingVisits(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/crm/customers/${customerId}/visits`);
      const json = await res.json();
      if (res.ok && json.visits) {
        setVisits(json.visits);
      }
    } catch (error) {
      console.error('Failed to load visits', error);
    } finally {
      setLoadingVisits(false);
    }
  };

  const loadOrders = async (customerId: string) => {
    setLoadingOrders(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/crm/customers/${customerId}/orders`);
      const json = await res.json();
      if (res.ok && json.orders) {
        setOrders(json.orders);
      }
    } catch (error) {
      console.error('Failed to load orders', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

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
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="visits">
              <History className="h-4 w-4 mr-2" />
              Visits ({visits.length})
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Orders ({orders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
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
                {customer.customer_segment && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Segment</span>
                    <Badge variant="outline" className="capitalize">
                      {customer.customer_segment}
                    </Badge>
                  </div>
                )}
                <Badge variant="secondary" className="capitalize w-full justify-center">
                  {customer.status || 'active'}
                </Badge>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="visits" className="space-y-4">
            <Card className="p-4 bg-card text-card-foreground">
              <h2 className="text-lg font-semibold text-foreground mb-4">Visit History</h2>
              {loadingVisits ? (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading visits...
                </div>
              ) : visits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {visits.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {formatDate(visit.visit_timestamp)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {visit.table && (
                              <Badge variant="outline" className="text-xs">
                                Table {visit.table.table_number}
                              </Badge>
                            )}
                            {visit.area && (
                              <Badge variant="outline" className="text-xs">
                                {visit.area.name}
                              </Badge>
                            )}
                            {visit.qr_code_type && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {visit.qr_code_type}
                              </Badge>
                            )}
                            {visit.order_placed && (
                              <Badge variant="default" className="text-xs">
                                Order placed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {visit.order_value && (
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(visit.order_value)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card className="p-4 bg-card text-card-foreground">
              <h2 className="text-lg font-semibold text-foreground mb-4">Order History</h2>
              {loadingOrders ? (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-lg border border-border bg-background"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {formatDate(order.placed_at)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                order.order_status === 'completed'
                                  ? 'default'
                                  : order.order_status === 'cancelled'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs capitalize"
                            >
                              {order.order_status}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {order.order_type}
                            </Badge>
                            {order.table && (
                              <Badge variant="outline" className="text-xs">
                                Table {order.table.table_number}
                              </Badge>
                            )}
                            {order.area && (
                              <Badge variant="outline" className="text-xs">
                                {order.area.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-foreground">
                            {formatCurrency(order.total)}
                          </p>
                          {order.payment_method && (
                            <p className="text-xs text-muted-foreground capitalize">
                              {order.payment_method}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Items:</p>
                        <div className="space-y-1">
                          {order.order_items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-foreground">
                                {item.quantity}x {item.name}
                              </span>
                              <span className="text-muted-foreground">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

