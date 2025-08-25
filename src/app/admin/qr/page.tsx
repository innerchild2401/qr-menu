'use client';

import { supabase } from '@/lib/auth-supabase';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';

interface QRCodeInfo {
  qrCodeUrl?: string;
  menuUrl: string;
  hasQRCode: boolean;
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AdminQR() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // State management
  const [qrInfo, setQrInfo] = useState<QRCodeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  
  const loadQRCodeInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedApiCall('/api/admin/qr/info');
      
      if (response.ok) {
        const data = await response.json();
        setQrInfo(data);
        setHasRestaurant(true);
      } else if (response.status === 404) {
        // No restaurant found
        setHasRestaurant(false);
        setQrInfo(null);
      } else {
        throw new Error('Failed to load QR code information');
      }
    } catch (error) {
      console.error('Error loading QR code info:', error);
      showError('Failed to load QR code information');
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load user session and QR code info
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        loadQRCodeInfo();
      } else {
        setHasRestaurant(false);
        setIsLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadQRCodeInfo();
        } else {
          setHasRestaurant(false);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadQRCodeInfo]);

  const generateQRCode = async () => {
    try {
      setIsGenerating(true);
      const response = await authenticatedApiCall('/api/admin/qr/generate', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate QR code');
      }
      
      const data = await response.json();
      
      // Update QR info with new data
      setQrInfo(prev => prev ? {
        ...prev,
        qrCodeUrl: data.qrCodeUrl,
        hasQRCode: true
      } : null);
      
      showSuccess(data.message || 'QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
      showError(error instanceof Error ? error.message : 'Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateQRCode = async () => {
    try {
      setIsRegenerating(true);
      const response = await authenticatedApiCall('/api/admin/qr/regenerate', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate QR code');
      }
      
      const data = await response.json();
      
      // Update QR info with new data
      setQrInfo(prev => prev ? {
        ...prev,
        qrCodeUrl: data.qrCodeUrl,
        hasQRCode: true
      } : null);
      
      showSuccess(data.message || 'QR code regenerated successfully');
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      showError(error instanceof Error ? error.message : 'Failed to regenerate QR code');
    } finally {
      setIsRegenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrInfo?.qrCodeUrl) {
      showError('No QR code available to download');
      return;
    }

    try {
      // Create download link
      const link = document.createElement('a');
      link.download = `menu-qr-${qrInfo.restaurant.slug}.png`;
      link.href = qrInfo.qrCodeUrl;
      link.target = '_blank';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess('QR code download started');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      showError('Failed to download QR code');
    }
  };

  const copyUrlToClipboard = async () => {
    if (!qrInfo?.menuUrl) return;
    
    try {
      await navigator.clipboard.writeText(qrInfo.menuUrl);
      showSuccess('Menu URL copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showError('Failed to copy URL to clipboard');
    }
  };

  const openMenuInNewTab = () => {
    if (qrInfo?.menuUrl) {
      window.open(qrInfo.menuUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading QR code information...</p>
        </div>
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
            QR Code Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your restaurant&apos;s QR code for the digital menu
          </p>
        </div>

        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Restaurant Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to create a restaurant first before you can generate a QR code.
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
          QR Code Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your restaurant&apos;s QR code for the digital menu. Customers can scan this code to view your menu instantly.
        </p>
      </div>

      {qrInfo ? (
        <div className="space-y-6">
          {/* Restaurant Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Restaurant Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Restaurant Name
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {qrInfo.restaurant.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Menu URL
                </label>
                <div className="flex items-center space-x-2">
                  <p className="text-blue-600 dark:text-blue-400 font-mono text-sm truncate">
                    {qrInfo.menuUrl}
                  </p>
                  <button
                    onClick={copyUrlToClipboard}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Copy URL"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={openMenuInNewTab}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Open menu"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                QR Code
              </h2>
              <div className="flex space-x-3">
                {qrInfo.hasQRCode ? (
                  <>
                    <button
                      onClick={regenerateQRCode}
                      disabled={isRegenerating}
                      className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      {isRegenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Regenerating...
                        </>
                      ) : (
                        'Regenerate'
                      )}
                    </button>
                    <button
                      onClick={downloadQRCode}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </button>
                  </>
                ) : (
                  <button
                    onClick={generateQRCode}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      'Generate QR Code'
                    )}
                  </button>
                )}
              </div>
            </div>

            {qrInfo.hasQRCode && qrInfo.qrCodeUrl ? (
              <div className="text-center">
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img
                    src={qrInfo.qrCodeUrl}
                    alt="Menu QR Code"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                  Scan this QR code to access your digital menu
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No QR Code Generated
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Generate a QR code to allow customers to easily access your digital menu.
                </p>
                <button
                  onClick={generateQRCode}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate QR Code'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              How to Use Your QR Code
            </h3>
            <div className="space-y-3 text-blue-800 dark:text-blue-200">
              <div className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">1</span>
                <p>Download the QR code image and print it on your menu cards, tables, or promotional materials.</p>
              </div>
              <div className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">2</span>
                <p>Customers can scan the QR code with their smartphone camera to instantly access your digital menu.</p>
              </div>
              <div className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">3</span>
                <p>The QR code will always link to your current menu, so updates are automatically reflected.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading restaurant information...</p>
        </div>
      )}
    </div>
  );
}