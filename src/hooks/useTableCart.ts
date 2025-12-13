'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrCreateClientToken } from '@/lib/crm/client-tracking';

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
  customer_tokens: string[];
}

interface Product {
  id: string;
  name: string;
  price: number;
}

export function useTableCart(tableId: string | null, restaurantId: string | null) {
  const [tableOrder, setTableOrder] = useState<TableOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableClosed, setTableClosed] = useState(false);
  const [tableClosedMessage, setTableClosedMessage] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientToken(getOrCreateClientToken());
    }
  }, []);

  // Load table order from server
  const loadTableOrder = useCallback(async () => {
    if (!tableId || !restaurantId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/table-orders/${tableId}`);
      const json = await res.json();
      if (res.ok) {
        if (json.tableClosed) {
          // Table is closed - clear order
          setTableOrder(null);
          setTableClosed(true);
          setTableClosedMessage(json.message || 'This table order has been closed.');
          setRestaurantName(json.restaurantName || null);
          return { tableClosed: true, message: json.message };
        }
        setTableClosed(false);
        setTableClosedMessage(null);
        setRestaurantName(null);
        if (json.order) {
          setTableOrder(json.order);
        } else {
          setTableOrder(null);
        }
      } else {
        setTableOrder(null);
        // Check if it's a 403 (table closed) error
        if (res.status === 403) {
          setTableClosed(true);
          setTableClosedMessage(json.message || json.error || 'This table order has been closed.');
          setRestaurantName(json.restaurantName || null);
          return { tableClosed: true, message: json.message || json.error };
        }
        setTableClosed(false);
        setTableClosedMessage(null);
        setRestaurantName(null);
      }
    } catch (error) {
      console.error('Failed to load table order:', error);
    } finally {
      setLoading(false);
    }
  }, [tableId, restaurantId]);

  // Load order on mount and when tableId changes
  useEffect(() => {
    loadTableOrder();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadTableOrder, 5000);
    return () => clearInterval(interval);
  }, [loadTableOrder]);

  // Get customer's items from table order
  const getCustomerItems = useCallback((): Array<{ product: Product; quantity: number; isProcessed: boolean }> => {
    if (!tableOrder || !clientToken) return [];

    return tableOrder.order_items
      .filter((item) => item.customer_token === clientToken)
      .map((item) => ({
        product: {
          id: item.product_id,
          name: item.name,
          price: item.price,
        },
        quantity: item.quantity,
        isProcessed: item.processed === true, // Use item-level processed flag
      }));
  }, [tableOrder, clientToken]);

  // Get all table items (for showing table total)
  const getTableItems = useCallback((): Array<{ product: Product; quantity: number; customer_token?: string; isProcessed: boolean }> => {
    if (!tableOrder) return [];

    return tableOrder.order_items.map((item) => ({
      product: {
        id: item.product_id,
        name: item.name,
        price: item.price,
      },
      quantity: item.quantity,
      customer_token: item.customer_token,
      isProcessed: item.processed === true, // Use item-level processed flag
    }));
  }, [tableOrder]);

  // Add item to table cart
  const addItem = useCallback(async (product: Product) => {
    if (!tableId || !restaurantId || !clientToken) return;

    const customerItems = getCustomerItems();
    const existingItem = customerItems.find((item) => item.product.id === product.id);
    const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

    await updateCart([...customerItems.filter((item) => item.product.id !== product.id), {
      product,
      quantity: newQuantity,
      isProcessed: false,
    }]);
  }, [tableId, restaurantId, clientToken, getCustomerItems]);

  // Update quantity
  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (!tableId || !restaurantId || !clientToken) return;

    const customerItems = getCustomerItems();
    if (quantity <= 0) {
      await updateCart(customerItems.filter((item) => item.product.id !== productId));
    } else {
      await updateCart(
        customerItems.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  }, [tableId, restaurantId, clientToken, getCustomerItems]);

  // Remove item
  const removeItem = useCallback(async (productId: string) => {
    await updateQuantity(productId, 0);
  }, [updateQuantity]);

  // Update cart on server
  const updateCart = useCallback(async (items: Array<{ product: Product; quantity: number }>) => {
    if (!tableId || !restaurantId || !clientToken) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/table-orders/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          items: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            name: item.product.name,
          })),
          customerToken: clientToken,
        }),
      });

      if (res.ok) {
        await loadTableOrder();
      } else {
        const json = await res.json();
        if (res.status === 403) {
          setTableClosed(true);
          setTableClosedMessage(json.message || json.error || 'This table order has been closed.');
          setRestaurantName(json.restaurantName || null);
          throw new Error(json.message || json.error || 'Table has been closed');
        }
        throw new Error(json.error || 'Failed to update cart');
      }
    } catch (error) {
      console.error('Failed to update cart:', error);
      throw error; // Re-throw to let caller handle
    } finally {
      setLoading(false);
    }
  }, [tableId, restaurantId, clientToken, loadTableOrder]);

  // Place order
  const placeOrder = useCallback(async (): Promise<boolean> => {
    if (!tableId) return false;

    setLoading(true);
    try {
      const res = await fetch(`/api/table-orders/${tableId}/place`, {
        method: 'POST',
      });

      if (res.ok) {
        await loadTableOrder();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to place order:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [tableId, loadTableOrder]);

  // Calculate customer total
  const getCustomerTotal = useCallback((): number => {
    return getCustomerItems().reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  }, [getCustomerItems]);

  // Calculate table total
  const getTableTotal = useCallback((): number => {
    return tableOrder?.total || 0;
  }, [tableOrder]);

  return {
    tableOrder,
    customerItems: getCustomerItems(),
    tableItems: getTableItems(),
    loading,
    tableClosed,
    tableClosedMessage,
    restaurantName,
    addItem,
    updateQuantity,
    removeItem,
    placeOrder,
    getCustomerTotal,
    getTableTotal,
    refresh: async () => {
      return await loadTableOrder();
    },
  };
}

