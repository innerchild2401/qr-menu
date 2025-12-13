'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { formatCurrency } from '@/lib/currency-utils';
import Toast from '@/components/Toast';

interface TableOrderItem {
  product_id: string;
  quantity: number;
  price: number;
  name: string;
  customer_token?: string;
  processed?: boolean;
}

interface TableOrder {
  id: string;
  table_id: string;
  restaurant_id: string;
  order_status: 'pending' | 'processed' | 'closed';
  order_items: TableOrderItem[];
  subtotal: number;
  total: number;
  placed_at: string;
  table?: {
    id: string;
    table_number: string;
    table_name?: string;
  };
}

interface TableOrderModalProps {
  tableId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TableOrderModal({ tableId, onClose, onUpdate }: TableOrderModalProps) {
  const [order, setOrder] = useState<TableOrder | null>(null);
  const [tableStatus, setTableStatus] = useState<'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service' | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const processedItemIdsRef = useRef<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'info'; title: string; message?: string; duration?: number }>>([]);
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  const showInfo = (title: string, message?: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type: 'info', title, message, duration }]);
  };

  useEffect(() => {
    if (tableId) {
      loadOrder();
    }
  }, [tableId]);

  const loadOrder = async () => {
    if (!tableId) return;
    setLoading(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/table-orders/${tableId}`);
      const json = await res.json();
      if (res.ok) {
        // Store table status
        if (json.tableStatus) {
          setTableStatus(json.tableStatus);
        }
        
        if (json.order) {
          const newOrder = json.order;
          
          // Detect new unprocessed items
          if (order) {
            const newUnprocessedItems = newOrder.order_items.filter(
              (item: TableOrderItem) => !item.processed && !processedItemIdsRef.current.has(`${item.product_id}-${item.customer_token}`)
            );
            
            if (newUnprocessedItems.length > 0) {
              const itemNames = newUnprocessedItems.map((item: TableOrderItem) => item.name).join(', ');
              showInfo(
                'New items added',
                itemNames.length > 100 ? `${itemNames.substring(0, 100)}...` : itemNames,
                5000
              );
              
              // Mark these items as seen
              newUnprocessedItems.forEach((item: TableOrderItem) => {
                processedItemIdsRef.current.add(`${item.product_id}-${item.customer_token}`);
              });
            }
          }
          
          setOrder(newOrder);
        } else {
          setOrder(null);
        }
      }
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!tableId || order?.order_status === 'processed') return;
    
    setProcessing(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/table-orders/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_item', itemId }),
      });
      if (res.ok) {
        await loadOrder();
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!tableId) return;
    
    setProcessing(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/table-orders/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' }),
      });
      if (res.ok) {
        await loadOrder();
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to process order:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessNewItems = async () => {
    if (!tableId) return;
    
    setProcessing(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/table-orders/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_new_items' }),
      });
      if (res.ok) {
        await loadOrder();
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to process new items:', error);
    } finally {
      setProcessing(false);
    }
  };

  const hasUnprocessedItems = order?.order_items.some((item) => !item.processed) || false;
  const hasProcessedItems = order?.order_items.some((item) => item.processed) || false;

  const handleClose = async () => {
    if (!tableId) return;
    
    setProcessing(true);
    try {
      const res = await authenticatedApiCall(`/api/admin/table-orders/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      if (res.ok) {
        onClose();
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to close table:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (!tableId) return null;

  return (
    <>
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[60] space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <Toast key={toast.id} id={toast.id} type={toast.type} title={toast.title} message={toast.message} duration={toast.duration} onClose={removeToast} />
          ))}
        </div>
      )}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {order?.table ? `Table ${order.table.table_number}` : 'Table Order'}
            </h2>
            {order && (
              <Badge
                variant={
                  order.order_status === 'processed'
                    ? 'default'
                    : order.order_status === 'closed'
                    ? 'secondary'
                    : 'outline'
                }
                className="mt-1"
              >
                {order.order_status}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !order ? (
            <p className="text-center text-muted-foreground py-8">No active order for this table</p>
          ) : (
            <div className="space-y-4">
              {/* Unprocessed items */}
              {order.order_items.filter((item) => !item.processed).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">New Items</h3>
                  {order.order_items
                    .filter((item) => !item.processed)
                    .map((item, idx) => (
                      <div
                        key={`${item.product_id}-${idx}`}
                        className="flex items-center justify-between p-3 border-2 border-blue-200 rounded-lg bg-blue-50"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.product_id)}
                          disabled={processing}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}

              {/* Processed items */}
              {order.order_items.filter((item) => item.processed).length > 0 && (
                <div className="space-y-2">
                  {order.order_items.filter((item) => !item.processed).length > 0 && (
                    <h3 className="text-sm font-semibold text-foreground mt-4">Processed Items</h3>
                  )}
                  {order.order_items
                    .filter((item) => item.processed)
                    .map((item, idx) => (
                      <div
                        key={`${item.product_id}-${idx}`}
                        className="flex items-center justify-between p-3 border rounded-lg opacity-50 bg-gray-50"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium line-through text-foreground">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">Processed</Badge>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {(order || (tableStatus === 'occupied')) && (
          <div className="p-4 border-t bg-gray-50 space-y-3">
            {order && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Total:</span>
                <span className="font-bold text-lg text-foreground">{formatCurrency(order.total)}</span>
              </div>
            )}
            <div className="flex flex-col space-y-2">
              {order && hasUnprocessedItems && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleProcessNewItems}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Process New Items
                </Button>
              )}
              <div className="flex space-x-2">
                {order && order.order_status === 'pending' && !hasProcessedItems && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleProcess}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Process All
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={handleClose}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Close Table
                    </Button>
                  </>
                )}
                {(order && (order.order_status === 'processed' || hasProcessedItems)) && (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleClose}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Close Table
                  </Button>
                )}
                {!order && tableStatus === 'occupied' && (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleClose}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Close Table
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
    </>
  );
}

