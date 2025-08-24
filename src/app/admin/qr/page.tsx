'use client';

import { supabase } from '@/lib/auth-supabase';
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
  
  // Load user session
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
  
  const loadQRCodeInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/qr/info');
      
      if (!response.ok) {
        throw new Error('Failed to load QR code information');
      }
      
      const data = await response.json();
      setQrInfo(data);
    } catch (error) {
      console.error('Error loading QR code info:', error);
      showError('Failed to load QR code information');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load QR code info when component mounts
  useEffect(() => {
    if (user) {
      loadQRCodeInfo();
    }
  }, [user, loadQRCodeInfo]);

  const generateQRCode = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch('/api/admin/qr/generate', {
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
      const response = await fetch('/api/admin/qr/regenerate', {
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

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading QR code information...</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Information & Actions */}
        <div className="space-y-6">
          {/* Restaurant Info */}
          {qrInfo && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Restaurant Information
              </h2>
              
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                  <p className="text-gray-600 dark:text-gray-400">{qrInfo.restaurant.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Slug:</span>
                  <p className="text-gray-600 dark:text-gray-400">{qrInfo.restaurant.slug}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Menu URL:</span>
                  <div className="flex mt-1">
                    <input
                      type="text"
                      value={qrInfo.menuUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <button
                      onClick={copyUrlToClipboard}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg transition-colors text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              QR Code Actions
            </h2>
            
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${qrInfo?.hasQRCode ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {qrInfo?.hasQRCode ? 'QR Code Generated' : 'No QR Code'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!qrInfo?.hasQRCode ? (
                  <button
                    onClick={generateQRCode}
                    disabled={isGenerating}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating QR Code...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Generate QR Code
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={regenerateQRCode}
                      disabled={isRegenerating}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      {isRegenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate QR Code
                        </>
                      )}
                    </button>

                    <button
                      onClick={downloadQRCode}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PNG
                    </button>
                  </div>
                )}
                
                <button
                  onClick={openMenuInNewTab}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Preview Menu
                </button>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              📱 How Customers Use QR Codes
            </h3>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p><strong>Simple 3-Step Process:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Customer opens camera app on their phone</li>
                <li>Points camera at QR code</li>
                <li>Taps the notification that appears to open menu</li>
              </ol>
              
              <p className="pt-3"><strong>Compatible with:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>iPhone (iOS 11+)</li>
                <li>Android phones (most recent versions)</li>
                <li>Any QR code scanner app</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column - QR Code Display */}
        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              QR Code Preview
            </h2>
            
            <div className="text-center">
              {qrInfo?.qrCodeUrl ? (
                <div className="inline-block p-6 bg-white rounded-lg shadow-sm">
                  <img
                    src={qrInfo.qrCodeUrl}
                    alt={`QR Code for ${qrInfo.restaurant.name} menu`}
                    className="max-w-full h-auto mx-auto"
                    style={{ maxWidth: '300px', imageRendering: 'pixelated' }}
                  />
                </div>
              ) : (
                <div className="w-64 h-64 mx-auto bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400">No QR code generated yet</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Click &quot;Generate QR Code&quot; to create one</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Technical Info */}
          {qrInfo?.qrCodeUrl && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                QR Code Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Size:</span>
                  <p className="text-gray-600 dark:text-gray-400">512×512 pixels</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Format:</span>
                  <p className="text-gray-600 dark:text-gray-400">PNG</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Error Correction:</span>
                  <p className="text-gray-600 dark:text-gray-400">Medium (M)</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Quiet Zone:</span>
                  <p className="text-gray-600 dark:text-gray-400">2 modules</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <span className="font-medium text-gray-700 dark:text-gray-300">Storage:</span>
                <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Stored securely in Supabase cloud storage</p>
              </div>
            </div>
          )}

          {/* Best Practices */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
              💡 Best Practices
            </h3>
            <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
              <p><strong>Printing:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Print at least 2×2 cm (0.8×0.8 inch)</li>
                <li>Use high contrast (black on white)</li>
                <li>Avoid reflective surfaces</li>
              </ul>
              
              <p><strong>Placement Ideas:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Table tents and placemats</li>
                <li>Window stickers</li>
                <li>Business cards</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}