'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrCreateClientToken, generateClientFingerprint } from '@/lib/crm/client-tracking';

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

export function useTableCart(
  tableId: string | null, 
  restaurantId: string | null,
  initialSessionId: string | null = null
) {
  const [tableOrder, setTableOrder] = useState<TableOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableClosed, setTableClosed] = useState(false);
  const [tableClosedMessage, setTableClosedMessage] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [approvalRequest, setApprovalRequest] = useState<{
    requestId: string;
    timeLeft: number;
    status: 'pending' | 'approved' | 'denied' | 'expired';
  } | null>(null);
  const [pendingApprovalRequests, setPendingApprovalRequests] = useState<Array<{
    id: string;
    requesterToken: string;
    timeLeft: number;
  }>>([]);
  const [isParticipant, setIsParticipant] = useState(false);

  // Request approval to add items
  const requestApproval = useCallback(async (): Promise<{ approved: boolean; requestId?: string; timeLeft?: number }> => {
    if (!tableId || !clientToken) {
      return { approved: false };
    }

    try {
      const fingerprint = generateClientFingerprint();
      const res = await fetch(`/api/table-orders/${tableId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerToken: clientToken,
          customerFingerprint: fingerprint,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        if (json.approved) {
          setIsParticipant(true);
          return { approved: true };
        } else if (json.requestId) {
          setApprovalRequest({
            requestId: json.requestId,
            timeLeft: json.timeLeft || 20,
            status: 'pending',
          });
          return { approved: false, requestId: json.requestId, timeLeft: json.timeLeft || 20 };
        }
      }
      return { approved: false };
    } catch (error) {
      console.error('Failed to request approval:', error);
      return { approved: false };
    }
  }, [tableId, clientToken]);

  // Poll for approval status
  useEffect(() => {
    if (!approvalRequest || approvalRequest.status !== 'pending') return;

    const interval = setInterval(async () => {
      if (!tableId || !clientToken) return;

      // Check if we're now a participant (approved)
      // Try to add a dummy item to check if we're approved
      const testRes = await fetch(`/api/table-orders/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          items: [],
          customerToken: clientToken,
          sessionId,
        }),
      });

      if (testRes.ok) {
        setIsParticipant(true);
        setApprovalRequest(prev => prev ? { ...prev, status: 'approved' } : null);
        clearInterval(interval);
      } else {
        const testJson = await testRes.json();
        if (testJson.requiresApproval && !testJson.approvalPending) {
          // Request expired or denied
          setApprovalRequest(prev => prev ? { ...prev, status: 'expired' } : null);
          clearInterval(interval);
        }
      }

      // Update timer
      setApprovalRequest(prev => {
        if (!prev) return null;
        const newTimeLeft = Math.max(0, prev.timeLeft - 1);
        if (newTimeLeft === 0) {
          clearInterval(interval);
          return { ...prev, status: 'expired', timeLeft: 0 };
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [approvalRequest, tableId, clientToken, restaurantId, sessionId]);

  // Poll for pending approval requests (for existing participants)
  useEffect(() => {
    if (!tableId || !clientToken || !isParticipant) return;

    const loadPendingRequests = async () => {
      try {
        const res = await fetch(`/api/table-orders/${tableId}/approval?customerToken=${clientToken}`);
        if (res.ok) {
          const json = await res.json();
          const requestsWithTimeLeft = (json.requests || []).map((req: { id: string; requesterToken: string; timeLeft: number }) => ({
            id: req.id,
            requesterToken: req.requesterToken,
            timeLeft: req.timeLeft,
          }));
          setPendingApprovalRequests(requestsWithTimeLeft);
        }
      } catch (error) {
        console.error('Failed to load pending requests:', error);
      }
    };

    loadPendingRequests();
    const interval = setInterval(loadPendingRequests, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [tableId, clientToken, isParticipant]);

  // Approve or deny a request
  const handleApprovalRequest = useCallback(async (requestId: string, action: 'approve' | 'deny'): Promise<boolean> => {
    if (!tableId || !clientToken) return false;

    try {
      const res = await fetch(`/api/table-orders/${tableId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          approverToken: clientToken,
        }),
      });

      if (res.ok) {
        // Remove from pending requests
        setPendingApprovalRequests(prev => prev.filter(req => req.id !== requestId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to handle approval request:', error);
      return false;
    }
  }, [tableId, clientToken]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientToken(getOrCreateClientToken());
    }
  }, []);

  // Reset state when tableId changes (new QR scan)
  // Also update sessionId if initialSessionId changes (from URL)
  useEffect(() => {
    if (tableId) {
      // Clear any previous state when switching to a new table
      setTableOrder(null);
      setTableClosed(false);
      setTableClosedMessage(null);
      setRestaurantName(null);
      // Use initialSessionId from URL if provided, otherwise reset
      if (initialSessionId) {
        console.log('✅ [CLIENT] Setting sessionId from URL:', initialSessionId);
        setSessionId(initialSessionId);
      } else {
        setSessionId(null); // Reset session_id on new table
      }
    }
  }, [tableId, initialSessionId]);

  // Check if user is a participant
  const checkParticipantStatus = useCallback(async () => {
    if (!tableId || !clientToken) return;

    try {
      // Try a test POST with empty items to check participant status
      const testRes = await fetch(`/api/table-orders/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          items: [],
          customerToken: clientToken,
          sessionId,
        }),
      });

      if (testRes.ok) {
        setIsParticipant(true);
      } else {
        const testJson = await testRes.json();
        if (testJson.requiresApproval) {
          setIsParticipant(false);
        }
      }
    } catch (error) {
      console.error('Failed to check participant status:', error);
    }
  }, [tableId, clientToken, restaurantId, sessionId]);

  // Load table order from server
  const loadTableOrder = useCallback(async () => {
    if (!tableId || !restaurantId) return;

    setLoading(true);
    try {
      // Include sessionId in request if we have it (from URL or previous response)
      const url = sessionId 
        ? `/api/table-orders/${tableId}?session=${sessionId}`
        : `/api/table-orders/${tableId}`;
      
      const res = await fetch(url);
      const json = await res.json();
      
      // Check participant status after loading order
      if (clientToken) {
        await checkParticipantStatus();
      }
      if (res.ok) {
        // Store session_id from response - CRITICAL for security
        if (json.sessionId) {
          console.log('✅ [CLIENT] Received sessionId from GET:', json.sessionId);
          setSessionId(json.sessionId);
        } else {
          console.warn('⚠️ [CLIENT] GET response missing sessionId:', json);
        }
        
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
    // Reset state when tableId changes (e.g., new QR scan)
    if (tableId) {
      setTableOrder(null);
      setTableClosed(false);
      setTableClosedMessage(null);
      setRestaurantName(null);
      setLoading(true);
    }
    
    loadTableOrder();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadTableOrder, 5000);
    return () => clearInterval(interval);
  }, [loadTableOrder, tableId]);

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

  // Update cart on server (defined before addItem so it can be used in dependencies)
  const updateCart = useCallback(async (items: Array<{ product: Product; quantity: number; isProcessed?: boolean }>) => {
    if (!tableId || !restaurantId || !clientToken) {
      return;
    }

    // Note: sessionId should be set from GET response before POST
    // If it's null, log a warning but still attempt the request
    if (!sessionId) {
      console.warn('⚠️ [CLIENT] POST request with null sessionId - this should not happen if GET completed first');
    }

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
          sessionId, // Include session_id for verification
        }),
      });

      const json = await res.json();

      if (res.ok) {
        // Store session_id from response if provided
        if (json.sessionId) {
          console.log('✅ [CLIENT] Received sessionId from POST:', json.sessionId);
          setSessionId(json.sessionId);
        } else {
          console.warn('⚠️ [CLIENT] POST response missing sessionId:', json);
        }

        // Use returned order to avoid an extra GET round-trip (reduces perceived delay)
        if (json.order) {
          setTableOrder(json.order);
        } else {
          // Fallback to loading if server returned no order
          await loadTableOrder();
        }
      } else {
        if (res.status === 403) {
          // Check if it's an approval issue
          if (json.requiresApproval) {
            if (json.approvalPending) {
              // Approval is pending - set up polling
              setApprovalRequest({
                requestId: json.requestId,
                timeLeft: json.timeLeft || 20,
                status: 'pending',
              });
              throw new Error('APPROVAL_PENDING');
            } else {
              // Need to request approval
              throw new Error('APPROVAL_REQUIRED');
            }
          }
          
          // Table closed error
          setTableClosed(true);
          setTableClosedMessage(json.message || json.error || 'This table order has been closed.');
          setRestaurantName(json.restaurantName || null);
          throw new Error(json.message || json.error || 'Table has been closed');
        }
        throw new Error(json.error || 'Failed to update cart');
      }
    } catch (error: unknown) {
      console.error('Failed to update cart:', error);
      throw error; // Re-throw to let caller handle
    } finally {
      setLoading(false);
    }
  }, [tableId, restaurantId, clientToken, sessionId, loadTableOrder]);

  // Add item to table cart
  const addItem = useCallback(async (product: Product) => {
    if (!tableId || !restaurantId || !clientToken) return;

    // Check if we need approval first
    if (!isParticipant) {
      const approvalResult = await requestApproval();
      if (!approvalResult.approved) {
        // Approval required or pending - throw special error
        throw new Error(approvalResult.requestId ? 'APPROVAL_PENDING' : 'APPROVAL_REQUIRED');
      }
    }

    const customerItems = getCustomerItems();
    const existingItem = customerItems.find((item) => item.product.id === product.id);
    const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

    try {
      await updateCart([...customerItems.filter((item) => item.product.id !== product.id), {
        product,
        quantity: newQuantity,
        isProcessed: false,
      }]);
    } catch (error: unknown) {
      // Handle approval errors
      if (error instanceof Error && (error.message === 'APPROVAL_REQUIRED' || error.message === 'APPROVAL_PENDING')) {
        throw error;
      }
      // Re-throw other errors
      throw error;
    }
  }, [tableId, restaurantId, clientToken, getCustomerItems, isParticipant, requestApproval, updateCart]);

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
  }, [tableId, restaurantId, clientToken, getCustomerItems, updateCart]);

  // Remove item
  const removeItem = useCallback(async (productId: string) => {
    await updateQuantity(productId, 0);
  }, [updateQuantity]);

  // Place order
  const placeOrder = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!tableId) {
      console.error('❌ [CLIENT] placeOrder: No tableId');
      return { success: false, error: 'No table ID found. Please scan the QR code.' };
    }

    if (!sessionId) {
      console.error('❌ [CLIENT] placeOrder: No sessionId');
      return { success: false, error: 'Invalid session. Please scan the QR code again.' };
    }

    console.log('🔵 [CLIENT] placeOrder: Attempting to place order for tableId:', tableId);
    setLoading(true);
    try {
      const res = await fetch(`/api/table-orders/${tableId}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }), // Include session_id for verification
      });

      const json = await res.json();
      console.log('📦 [CLIENT] placeOrder response:', {
        status: res.status,
        ok: res.ok,
        error: json.error,
        message: json.message,
      });

      if (res.ok) {
        console.log('✅ [CLIENT] placeOrder: Success');
        await loadTableOrder();
        return { success: true };
      }

      // Handle specific error cases
      if (res.status === 403) {
        setTableClosed(true);
        setTableClosedMessage(json.message || json.error || 'This table order has been closed.');
        setRestaurantName(json.restaurantName || null);
        return { success: false, error: json.message || json.error || 'Table has been closed' };
      }

      if (res.status === 404) {
        return { success: false, error: json.error || 'No active order found. Please add items to your cart first.' };
      }

      return { success: false, error: json.error || 'Failed to place order' };
    } catch (error) {
      console.error('❌ [CLIENT] placeOrder error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, [tableId, sessionId, loadTableOrder]);

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
    approvalRequest,
    pendingApprovalRequests,
    isParticipant,
    requestApproval,
    handleApprovalRequest,
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

