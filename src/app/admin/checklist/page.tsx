'use client';

import { supabase } from '@/lib/auth-supabase';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { useState, useEffect, useCallback } from 'react';


interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;
  action?: () => Promise<string>;
}

export default function AdminChecklist() {
  
  // State management
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);

  const initializeChecklist = useCallback(() => {
    setChecklist([
      {
        id: 'restaurant-data',
        title: 'Restaurant Data',
        description: 'Verify restaurant data exists and is accessible',
        status: 'pending',
        action: async () => {
          const response = await fetch('/api/admin/me/restaurant');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          if (!data.restaurant) {
            throw new Error('Restaurant data not found');
          }
          return `Restaurant: ${data.restaurant.name}`;
        }
      },
      {
        id: 'categories-data',
        title: 'Categories Data',
        description: 'Verify categories data exists and is accessible',
        status: 'pending',
        action: async () => {
          const response = await authenticatedApiCall('/api/admin/categories');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          return `Found ${data.categories?.length || 0} categories`;
        }
      },
      {
        id: 'products-data',
        title: 'Products Data',
        description: 'Verify products data exists and is accessible',
        status: 'pending',
        action: async () => {
          const response = await authenticatedApiCall('/api/admin/products');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          return `Found ${data.products?.length || 0} products`;
        }
      },
      {
        id: 'popups-data',
        title: 'Popups Data',
        description: 'Verify popups data exists and is accessible',
        status: 'pending',
        action: async () => {
          const response = await authenticatedApiCall('/api/admin/popups');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          return `Found ${data.popups?.length || 0} popups`;
        }
      },
      {
        id: 'uploads-test',
        title: 'Uploads Directory',
        description: 'Verify uploads directory is writable by testing file upload',
        status: 'pending',
        action: async () => {
          // Create a small test file
          const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
          const formData = new FormData();
          formData.append('file', testFile);
          
          const response = await fetch(`/api/upload/productImage/test-slug`, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Upload test failed: HTTP ${response.status}`);
          }
          
          const data = await response.json();
          return `Upload successful: ${data.url}`;
        }
      },
      {
        id: 'menu-api',
        title: 'Menu API Endpoint',
        description: 'Test menu API returns valid menu data',
        status: 'pending',
        action: async () => {
          const response = await fetch(`/api/menu/test-slug`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          if (!data.restaurant || !data.categories || !data.products) {
            throw new Error('Invalid menu response structure');
          }
          return `Menu API: ${data.products.length} products in ${data.categories.length} categories`;
        }
      },
      {
        id: 'popups-api',
        title: 'Popups API Endpoint',
        description: 'Test popups API returns popup data',
        status: 'pending',
        action: async () => {
          const response = await fetch(`/api/popups/test-slug`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          if (!data.popups) {
            throw new Error('Invalid popups response structure');
          }
          return `Popups API: ${data.popups.length} active popups`;
        }
      },
      {
        id: 'auth-session',
        title: 'Authentication Session',
        description: 'Verify Supabase authentication session is working correctly',
        status: 'pending',
        action: async () => {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            throw new Error('No valid session found');
          }
          return `Authenticated as: ${session.user.email}`;
        }
      }
    ]);
  }, []);

  // Initialize checklist on mount
  useEffect(() => {
    setHasRestaurant(true);
    initializeChecklist();
    setIsLoading(false);
  }, [initializeChecklist]);

  const runSingleCheck = async (itemId: string) => {
    const item = checklist.find(item => item.id === itemId);
    if (!item || !item.action) return;

    // Update status to running
    setChecklist(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status: 'running', result: undefined, error: undefined }
        : item
    ));

    try {
      const result = await item.action();
      
      // Update status to success
      setChecklist(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, status: 'success', result, error: undefined }
          : item
      ));
    } catch (error) {
      console.error(`Check ${itemId} failed:`, error);
      
      // Update status to error
      setChecklist(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status: 'error', 
              result: undefined,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          : item
      ));
    }
  };

  const runAllChecks = async () => {
    setIsRunningAll(true);
    
    for (const item of checklist) {
      if (item.action) {
        await runSingleCheck(item.id);
      }
    }
    
    setIsRunningAll(false);
  };

  const resetAllChecks = () => {
    setChecklist(prev => prev.map(item => ({
      ...item,
      status: 'pending' as const,
      result: undefined,
      error: undefined
    })));
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
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            System Checklist
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verify your restaurant system is properly configured
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
              You need to create a restaurant first before you can run system checks.
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
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          System Checklist
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Verify your restaurant system is properly configured
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={runAllChecks}
          disabled={isRunningAll}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
        >
          {isRunningAll ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Running Checks...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run All Checks
            </>
          )}
        </button>
        <button
          onClick={resetAllChecks}
          disabled={isRunningAll}
          className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        {checklist.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                    {item.title}
                  </h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {item.description}
                </p>
                
                {item.status === 'success' && item.result && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      ✅ {item.result}
                    </p>
                  </div>
                )}
                
                {item.status === 'error' && item.error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
                    <p className="text-red-800 dark:text-red-200 text-sm">
                      ❌ {item.error}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="ml-4">
                <button
                  onClick={() => runSingleCheck(item.id)}
                  disabled={item.status === 'running' || isRunningAll}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {item.status === 'running' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    'Run Check'
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {checklist.length > 0 && (
        <div className="mt-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {checklist.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Checks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {checklist.filter(item => item.status === 'success').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {checklist.filter(item => item.status === 'error').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {checklist.filter(item => item.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ChecklistItem['status'] }) {
  const statusConfig = {
    pending: {
      label: 'Pending',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    },
    running: {
      label: 'Running',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    },
    success: {
      label: 'Success',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    },
    error: {
      label: 'Error',
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
