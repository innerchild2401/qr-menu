'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  nutrition?: {
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  category_id?: string;
  available?: boolean;
  sort_order?: number;
  created_at?: string;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

interface OrderContextType {
  order: OrderItem[];
  setOrder: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  showOrderSummary: boolean;
  setShowOrderSummary: (show: boolean) => void;
  totalItems: number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  
  const totalItems = order.reduce((total, item) => total + item.quantity, 0);

  return (
    <OrderContext.Provider value={{
      order,
      setOrder,
      showOrderSummary,
      setShowOrderSummary,
      totalItems
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
