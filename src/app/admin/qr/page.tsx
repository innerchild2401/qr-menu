'use client';

import { authenticatedApiCall } from '@/lib/api-helpers';
import { useState, useEffect, useCallback } from 'react';
import { typography, spacing, Card, Button } from '@/lib/design-system';

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
  
  // State management
  const [qrInfo, setQrInfo] = useState<QRCodeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  
  const loadQRCodeInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First, check if user has a restaurant
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (restaurantResponse.ok) {
        setHasRestaurant(true);
      } else if (restaurantResponse.status === 404) {
        // No restaurant found
        setHasRestaurant(false);
        setQrInfo(null);
        return;
      } else {
        console.error('Failed to load restaurant data');
        setHasRestaurant(false);
        return;
      }

      // Then load QR code info
      const qrResponse = await authenticatedApiCall('/api/admin/qr/info');
      if (qrResponse.ok) {
        const data = await qrResponse.json();
        setQrInfo(data);
      } else {
        throw new Error('Failed to load QR code information');
      }
    } catch (error) {
      console.error('Error loading QR code info:', error);
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load QR code info on mount
  useEffect(() => {
    loadQRCodeInfo();
  }, []);

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
      
      console.log(data.message || 'QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
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
      
      console.log(data.message || 'QR code regenerated successfully');
    } catch (error) {
      console.error('Error regenerating QR code:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrInfo?.qrCodeUrl) {
      console.error('No QR code available to download');
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

      console.log('QR code download started');
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  const copyUrlToClipboard = async () => {
    if (!qrInfo?.menuUrl) return;
    
    try {
      await navigator.clipboard.writeText(qrInfo.menuUrl);
      console.log('Menu URL copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
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
        <div className="mb-8">
          <h1 className={typography.h1}>
            QR Code Management
          </h1>
          <p className="text-muted-foreground">
            Manage your restaurant&apos;s QR code for the digital menu
          </p>
        </div>

        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-muted-foreground mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className={typography.h2}>
              No Restaurant Found
            </h2>
            <p className="text-muted-foreground mb-6">
              You need to create a restaurant first before you can generate a QR code.
            </p>
            <Button
              onClick={() => window.location.href = '/admin/settings'}
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className={typography.h1}>
          QR Code Management
        </h1>
        <p className="text-muted-foreground">
          Manage your restaurant&apos;s QR code for the digital menu. Customers can scan this code to view your menu instantly.
        </p>
      </div>

      {qrInfo ? (
        <div className="space-y-6">
          {/* Restaurant Info */}
          <Card className={spacing.md}>
            <h2 className={typography.h2}>
              Restaurant Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Restaurant Name
                </label>
                <p className="font-medium">
                  {qrInfo.restaurant.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Menu URL
                </label>
                <div className="flex items-center space-x-2">
                  <p className="text-primary font-mono text-sm truncate">
                    {qrInfo.menuUrl}
                  </p>
                  <button
                    onClick={copyUrlToClipboard}
                    className="text-muted-foreground hover:text-foreground"
                    title="Copy URL"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={openMenuInNewTab}
                    className="text-muted-foreground hover:text-foreground"
                    title="Open menu"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* QR Code Section */}
          <Card className={spacing.md}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={typography.h2}>
                QR Code
              </h2>
              <div className="flex space-x-3">
                {qrInfo.hasQRCode ? (
                  <>
                    <Button
                      onClick={regenerateQRCode}
                      disabled={isRegenerating}
                      variant="outline"
                      className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                    >
                      {isRegenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700 mr-2"></div>
                          Regenerating...
                        </>
                      ) : (
                        'Regenerate'
                      )}
                    </Button>
                    <Button
                      onClick={downloadQRCode}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={generateQRCode}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      'Generate QR Code'
                    )}
                  </Button>
                )}
              </div>
            </div>

            {qrInfo.hasQRCode && qrInfo.qrCodeUrl ? (
              <div className="text-center">
                <div className="inline-block p-4 bg-white border-2 border-border rounded-lg">
                  <img
                    src={qrInfo.qrCodeUrl}
                    alt="Menu QR Code"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Scan this QR code to access your digital menu
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className={typography.h3}>
                  No QR Code Generated
                </h3>
                <p className="text-muted-foreground mb-6">
                  Generate a QR code to allow customers to easily access your digital menu.
                </p>
                <Button
                  onClick={generateQRCode}
                  disabled={isGenerating}
                  className="mx-auto"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate QR Code'
                  )}
                </Button>
              </div>
            )}
          </Card>

          {/* Instructions */}
          <Card className={`${spacing.md} bg-blue-50 border-blue-200`}>
            <h3 className={`${typography.h3} text-blue-900 mb-3`}>
              How to Use Your QR Code
            </h3>
            <div className="space-y-3 text-blue-800">
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
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading restaurant information...</p>
        </div>
      )}
    </div>
  );
}