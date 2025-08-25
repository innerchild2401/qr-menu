'use client';

import { supabase } from '@/lib/auth-supabase';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';

interface Category {
  id: string;
  name: string;
  restaurant_id: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  nutrition?: Record<string, unknown>;
  category_id?: string;
  restaurant_id: string;
  created_at: string;
  categories?: {
    name: string;
  };
}

export default function AdminMenu() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Feature flag for advanced menu management
  const enableMenuAdmin = process.env.NEXT_PUBLIC_ENABLE_MENU_ADMIN === 'true';

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First, check if user has a restaurant
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (restaurantResponse.ok) {
        setHasRestaurant(true);
      } else if (restaurantResponse.status === 404) {
        // No restaurant found
        setHasRestaurant(false);
        setCategories([]);
        setProducts([]);
        return;
      } else {
        showError('Failed to load restaurant data');
        setHasRestaurant(false);
        return;
      }

      // Load categories
      const categoriesResponse = await authenticatedApiCall('/api/admin/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      } else {
        showError('Failed to load categories');
      }

      // Load products
      const productsResponse = await authenticatedApiCall('/api/admin/products');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      } else {
        showError('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error loading data');
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load user session and data
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        loadData();
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadData]);

  // Filter products by selected category
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category_id === selectedCategory);

  // Get category name by ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'No category';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown category';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show message if no restaurant exists
  if (hasRestaurant === false) {
    return (
      <div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Menu Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your restaurant menu items and categories
          </p>
        </div>

        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Restaurant Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to create a restaurant first before you can manage your menu.
            </p>
            <button
              onClick={() => window.location.href = '/admin/settings'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Menu Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your restaurant menu items and categories
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => window.location.href = '/admin/categories'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Manage Categories
        </button>
        <button
          onClick={() => window.location.href = '/admin/products'}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Manage Products
        </button>
        {enableMenuAdmin && (
          <button
            onClick={() => window.location.href = '/admin/menu/advanced'}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Advanced Menu Settings
          </button>
        )}
      </div>

      {/* Menu Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Menu Status</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">Active</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Categories Overview
        </h2>
        
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No categories found. Create your first category to get started.
            </p>
            <button
              onClick={() => window.location.href = '/admin/categories'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Create Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => {
              const categoryProducts = products.filter(product => product.category_id === category.id);
              return (
                <div key={category.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {categoryProducts.length} items
                  </p>
                  <button 
                    onClick={() => setSelectedCategory(category.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                  >
                    View Items →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Menu Items
          </h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => window.location.href = '/admin/products'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Product
            </button>
          </div>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {selectedCategory === 'all' 
                ? 'No products found. Create your first product to get started.'
                : 'No products in this category.'
              }
            </p>
            <button
              onClick={() => window.location.href = '/admin/products'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Price</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                      {product.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {getCategoryName(product.category_id)}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full text-xs">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => window.location.href = `/admin/products?edit=${product.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => window.location.href = `/admin/products`}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature Flag Notice */}
      {!enableMenuAdmin && (
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Advanced Menu Management
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  Advanced menu management features (ordering, visibility controls, daily specials) are currently disabled. 
                  Set <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">NEXT_PUBLIC_ENABLE_MENU_ADMIN=true</code> to enable these features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
