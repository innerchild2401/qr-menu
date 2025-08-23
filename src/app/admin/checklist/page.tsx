'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';

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
  const { data: session } = useSession();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // State management
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Initialize checklist
  useEffect(() => {
    if (session?.restaurantSlug) {
      setChecklist([
        {
          id: 'json-restaurant',
          title: 'Restaurant JSON File',
          description: `Verify /data/restaurants/${session.restaurantSlug}.json exists and parses correctly`,
          status: 'pending',
          action: async () => {
            const response = await fetch(`/api/admin/restaurant`);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (!data.restaurant) {
              throw new Error('Restaurant data not found in response');
            }
            return `Restaurant: ${data.restaurant.name}`;
          }
        },
        {
          id: 'json-categories',
          title: 'Categories JSON File',
          description: `Verify /data/categories/${session.restaurantSlug}.json exists and parses correctly`,
          status: 'pending',
          action: async () => {
            const response = await fetch(`/api/admin/categories`);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return `Found ${data.categories?.length || 0} categories`;
          }
        },
        {
          id: 'json-products',
          title: 'Products JSON File',
          description: `Verify /data/products/${session.restaurantSlug}.json exists and parses correctly`,
          status: 'pending',
          action: async () => {
            const response = await fetch(`/api/admin/products`);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return `Found ${data.products?.length || 0} products`;
          }
        },
        {
          id: 'json-popups',
          title: 'Popups JSON File',
          description: `Verify /data/popups/${session.restaurantSlug}.json exists and parses correctly`,
          status: 'pending',
          action: async () => {
            const response = await fetch(`/api/admin/popups`);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return `Found ${data.popups?.length || 0} popups`;
          }
        },
        {
          id: 'uploads-dir',
          title: 'Uploads Directory',
          description: 'Verify uploads directory is writable by testing file upload',
          status: 'pending',
          action: async () => {
            // Create a small test file
            const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
            const formData = new FormData();
            formData.append('file', testFile);
            
            const response = await fetch(`/api/upload/productImage/${session.restaurantSlug}`, {
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
          id: 'api-menu',
          title: 'Menu API Endpoint',
          description: `Test /api/menu/${session.restaurantSlug} returns valid menu data`,
          status: 'pending',
          action: async () => {
            const response = await fetch(`/api/menu/${session.restaurantSlug}`);
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
          id: 'api-popups',
          title: 'Popups API Endpoint',
          description: `Test /api/popups/${session.restaurantSlug} returns popup data`,
          status: 'pending',
          action: async () => {
            const response = await fetch(`/api/popups/${session.restaurantSlug}`);
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
          description: 'Verify NextAuth session is working correctly',
          status: 'pending',
          action: async () => {
            const response = await fetch('/api/auth/session');
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (!data.user) {
              throw new Error('No user in session');
            }
            return `Authenticated as: ${data.user.email}`;
          }
        }
      ]);
    }
  }, [session]);

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
    
    // Reset all statuses
    setChecklist(prev => prev.map(item => ({ 
      ...item, 
      status: 'pending' as const, 
      result: undefined, 
      error: undefined 
    })));

    // Run checks sequentially to avoid overwhelming the server
    for (const item of checklist) {
      if (item.action) {
        await runSingleCheck(item.id);
        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsRunningAll(false);
    
    // Check results
    const results = checklist.map(item => {
      const currentItem = checklist.find(c => c.id === item.id);
      return currentItem?.status || 'pending';
    });
    
    const successCount = results.filter(status => status === 'success').length;
    const errorCount = results.filter(status => status === 'error').length;
    
    if (errorCount === 0) {
      showSuccess(`All ${successCount} checks passed successfully!`);
    } else {
      showError(`${errorCount} checks failed, ${successCount} passed`);
    }
  };

  const getStatusIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'pending':
        return (
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-xs">?</span>
          </div>
        );
      case 'running':
        return (
          <div className="w-6 h-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        );
      case 'success':
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'pending':
        return 'border-gray-200 dark:border-gray-600';
      case 'running':
        return 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'success':
        return 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20';
    }
  };

  const openMenuInNewTab = () => {
    if (session?.restaurantSlug) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const url = `${protocol}//${hostname}${port ? `:${port}` : ''}/menu/${session.restaurantSlug}`;
      window.open(url, '_blank');
    }
  };

  if (!session?.restaurantSlug) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const completedChecks = checklist.filter(item => item.status === 'success').length;
  const failedChecks = checklist.filter(item => item.status === 'error').length;
  const totalChecks = checklist.length;

  return (
    <div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Local E2E Test Checklist
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Verify all systems are working correctly in your development environment
        </p>
      </div>

      {/* Progress Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Test Progress
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {completedChecks}/{totalChecks} checks passed
            {failedChecks > 0 && `, ${failedChecks} failed`}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div 
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${(completedChecks / totalChecks) * 100}%` }}
          ></div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={runAllChecks}
            disabled={isRunningAll}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            {isRunningAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Running Tests...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run All Tests
              </>
            )}
          </button>
          
          <button
            onClick={openMenuInNewTab}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Menu
          </button>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        {checklist.map((item) => (
          <div 
            key={item.id} 
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-2 transition-all ${getStatusColor(item.status)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {getStatusIcon(item.status)}
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {item.description}
                  </p>
                  
                  {/* Result/Error Display */}
                  {item.result && (
                    <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-lg p-3 mb-2">
                      <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                        ✓ {item.result}
                      </p>
                    </div>
                  )}
                  
                  {item.error && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg p-3 mb-2">
                      <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                        ✗ {item.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Individual Run Button */}
              <button
                onClick={() => runSingleCheck(item.id)}
                disabled={item.status === 'running' || isRunningAll}
                className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {item.status === 'running' ? 'Running...' : 'Test'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
          🔗 Quick Test Links
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Public Pages:</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={`/menu/${session.restaurantSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Restaurant Menu
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">API Endpoints:</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={`/api/menu/${session.restaurantSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Menu API JSON
                </a>
              </li>
              <li>
                <a
                  href={`/api/popups/${session.restaurantSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Popups API JSON
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Development Info */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          📋 Development Environment Info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Restaurant Slug:</span>
            <p className="text-gray-600 dark:text-gray-400">{session.restaurantSlug}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Current URL:</span>
            <p className="text-gray-600 dark:text-gray-400 break-all">{typeof window !== 'undefined' ? window.location.origin : 'Loading...'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">User Email:</span>
            <p className="text-gray-600 dark:text-gray-400">{session.user?.email}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Tests Status:</span>
            <p className="text-gray-600 dark:text-gray-400">
              {completedChecks === totalChecks ? '✅ All passing' : 
               failedChecks > 0 ? '❌ Some failing' : '⏳ Not run'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
