'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';

export default function AdminQR() {
  const { data: session } = useSession();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // State management
  const [menuUrl, setMenuUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [useLocalhost, setUseLocalhost] = useState(true);
  const [customDomain, setCustomDomain] = useState('');
  
  // Canvas ref for QR code
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get current domain/IP
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port;
      setCustomDomain(`${hostname}${port ? `:${port}` : ''}`);
    }
  }, []);

  // Generate menu URL
  useEffect(() => {
    if (session?.restaurantSlug) {
      const domain = useLocalhost ? 'localhost:3001' : customDomain;
      const protocol = window.location.protocol;
      const url = `${protocol}//${domain}/menu/${session.restaurantSlug}`;
      setMenuUrl(url);
    }
  }, [session, useLocalhost, customDomain]);

  // Generate QR code when URL changes
  useEffect(() => {
    if (menuUrl && canvasRef.current) {
      generateQRCode();
    }
  }, [menuUrl]);

  const generateQRCode = async () => {
    if (!menuUrl || !canvasRef.current) return;

    try {
      setIsGenerating(true);

      // QR code options with white border (quiet zone)
      const options = {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
        margin: 4, // White border (quiet zone) - 4 modules wide
        color: {
          dark: '#000000', // Black modules
          light: '#FFFFFF' // White background
        },
        width: 256, // Size in pixels
      };

      // Generate QR code on canvas
      await QRCode.toCanvas(canvasRef.current, menuUrl, options);

      // Also generate data URL for download
      const dataUrl = await QRCode.toDataURL(menuUrl, options);
      setQrDataUrl(dataUrl);

      showSuccess('QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
      showError('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrDataUrl) {
      showError('No QR code to download');
      return;
    }

    try {
      // Create download link
      const link = document.createElement('a');
      link.download = `menu-qr-${session?.restaurantSlug || 'restaurant'}.png`;
      link.href = qrDataUrl;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess('QR code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      showError('Failed to download QR code');
    }
  };

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      showSuccess('Menu URL copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showError('Failed to copy URL to clipboard');
    }
  };

  const openMenuInNewTab = () => {
    window.open(menuUrl, '_blank');
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

  return (
    <div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          QR Code Generator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate a QR code for your restaurant menu that customers can scan with their phones
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Settings & URL */}
        <div className="space-y-6">
          {/* URL Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Menu URL Configuration
            </h2>
            
            <div className="space-y-4">
              {/* Domain Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Domain/IP Address
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="domain"
                      checked={useLocalhost}
                      onChange={() => setUseLocalhost(true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Localhost (localhost:3001) - Development only
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="domain"
                      checked={!useLocalhost}
                      onChange={() => setUseLocalhost(false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Network IP ({customDomain}) - Mobile testing
                    </span>
                  </label>
                </div>
              </div>

              {/* Custom Domain Input */}
              {!useLocalhost && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Domain/IP
                  </label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="192.168.1.100:3001"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your computer's IP address for mobile testing
                  </p>
                </div>
              )}

              {/* Generated URL Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Generated Menu URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={menuUrl}
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

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={generateQRCode}
                  disabled={isGenerating}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate QR
                    </>
                  )}
                </button>
                
                <button
                  onClick={openMenuInNewTab}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Test Menu
                </button>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              📱 How to Use QR Codes
            </h3>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p><strong>For Customers:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Open camera app on phone</li>
                <li>Point camera at QR code</li>
                <li>Tap the notification that appears</li>
                <li>Menu opens in browser automatically</li>
              </ul>
              
              <p className="pt-3"><strong>For Mobile Testing:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Switch to "Network IP" option above</li>
                <li>Generate new QR code</li>
                <li>Scan with phone to test on same network</li>
                <li>Make sure phone and computer are on same WiFi</li>
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
              {isGenerating ? (
                <div className="w-64 h-64 mx-auto bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Generating QR code...</p>
                  </div>
                </div>
              ) : (
                <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              )}
              
              {qrDataUrl && (
                <div className="mt-4 space-y-3">
                  <button
                    onClick={downloadQRCode}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PNG
                  </button>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    High-quality PNG with white border for optimal scanning
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              QR Code Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Size:</span>
                <p className="text-gray-600 dark:text-gray-400">256×256 pixels</p>
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
                <p className="text-gray-600 dark:text-gray-400">4 modules</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <span className="font-medium text-gray-700 dark:text-gray-300">Target URL:</span>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1 break-all">{menuUrl}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
          💡 QR Code Best Practices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800 dark:text-yellow-200">
          <div>
            <h4 className="font-medium mb-2">Printing & Display:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Print at least 2×2 cm (0.8×0.8 inch) for reliable scanning</li>
              <li>Ensure good contrast (black on white background)</li>
              <li>Place at eye level for easy scanning</li>
              <li>Avoid reflective surfaces or poor lighting</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Placement Ideas:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Table tents or placemats</li>
              <li>Window stickers or door displays</li>
              <li>Business cards or flyers</li>
              <li>Social media posts and websites</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
