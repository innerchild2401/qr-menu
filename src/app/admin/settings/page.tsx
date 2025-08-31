'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';
import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';
import { typography, spacing } from '@/lib/design-system';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PDFMenuGenerator from '../../../components/admin/PDFMenuGenerator';
import { CURRENCIES, NUTRITION_LANGUAGES, type Currency, type NutritionLanguage } from '@/lib/currency-utils';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  schedule: Record<string, string>;
  logo_url?: string;
  cover_url?: string;
  currency?: Currency;
  nutrition_language?: NutritionLanguage;
  // Google Business Profile integration
  google_business_location_id?: string;
  google_business_access_token?: string;
  google_business_refresh_token?: string;
  google_business_token_expires_at?: string;
  google_business_place_id?: string;
  google_business_rating?: number;
  google_business_review_count?: number;
  google_business_last_sync?: string;
}

interface CreateRestaurantForm {
  name: string;
  address: string;
}

export default function AdminSettings() {
  
  // Toast notifications
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // Form state
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  
  // Create restaurant form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRestaurantForm>({
    name: '',
    address: ''
  });
  
  // PDF Menu Generator state
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);
  
  // Google Business integration state
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  
  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load restaurant data on mount
  useEffect(() => {
    loadRestaurantData();
  }, []);

  // Handle URL parameters for OAuth success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    const location = urlParams.get('location');

    if (success === 'google_connected') {
      showSuccess(`Successfully connected to Google Business Profile${location ? ` (${location})` : ''}`);
      // Reload restaurant data to show updated connection status
      loadRestaurantData();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      let errorMessage = 'Google Business Profile connection failed';
      if (error === 'google_oauth_failed') {
        errorMessage = 'Google OAuth authentication failed';
      } else if (error === 'no_locations_found') {
        errorMessage = 'No Google Business Profile locations found';
      } else if (error === 'setup_failed') {
        errorMessage = `Setup failed: ${message || 'Unknown error'}`;
      } else if (error === 'callback_failed') {
        errorMessage = 'OAuth callback processing failed';
      } else if (error === 'missing_parameters') {
        errorMessage = 'Missing OAuth parameters';
      }
      showError(errorMessage);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showSuccess, showError]);

  const loadRestaurantData = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedApiCall('/api/admin/me/restaurant');
      
      if (response.ok) {
        const data = await response.json();
        if (data.restaurant) {
          setRestaurant(data.restaurant);
          setLogoPreview(data.restaurant.logo_url || '');
          setCoverPreview(data.restaurant.cover_url || '');
          setHasRestaurant(true);
        } else {
          setHasRestaurant(false);
          setRestaurant(null);
        }
      } else if (response.status === 404) {
        // No restaurant found
        setHasRestaurant(false);
        setRestaurant(null);
      } else {
        console.error('Failed to load restaurant data');
        setHasRestaurant(false);
      }
    } catch (error) {
      console.error('Error loading restaurant data:', error);
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRestaurant = async () => {
    if (!createForm.name.trim() || !createForm.address.trim()) {
      console.error('Restaurant name and address are required');
      return;
    }

    try {
      setIsCreating(true);
      
      const response = await authenticatedApiCallWithBody('/api/admin/restaurant', {
          name: createForm.name.trim(),
          address: createForm.address.trim(),
          schedule: {
            monday: '9:00 AM - 10:00 PM',
            tuesday: '9:00 AM - 10:00 PM',
            wednesday: '9:00 AM - 10:00 PM',
            thursday: '9:00 AM - 10:00 PM',
            friday: '9:00 AM - 11:00 PM',
            saturday: '9:00 AM - 11:00 PM',
            sunday: '10:00 AM - 9:00 PM'
          }
        });

      if (response.ok) {
        const data = await response.json();
        console.log('Restaurant created successfully!');
        setShowCreateForm(false);
        setCreateForm({ name: '', address: '' });
        // Reload restaurant data
        await loadRestaurantData();
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to create restaurant');
      }
    } catch (error) {
      console.error('Error creating restaurant:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (restaurant) {
      setRestaurant({
        ...restaurant,
        [field]: value
      });
    }
  };

  const handleScheduleChange = (day: string, value: string) => {
    if (restaurant) {
      setRestaurant({
        ...restaurant,
        schedule: {
          ...(restaurant.schedule || {}),
          [day.toLowerCase()]: value
        }
      });
    }
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'cover') => {
    if (!restaurant?.slug) return;

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingCover;
    const setPreview = type === 'logo' ? setLogoPreview : setCoverPreview;
    
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/upload/${type}/${restaurant.slug}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setPreview(result.url);
        
        // Update restaurant state
        if (restaurant) {
          const updatedRestaurant = {
            ...restaurant,
            [type === 'logo' ? 'logo_url' : 'cover_url']: result.url
          };
          setRestaurant(updatedRestaurant);
          
          // Automatically save the updated restaurant data to database
          try {
            const saveResponse = await authenticatedApiCallWithBody('/api/admin/restaurant', updatedRestaurant, {
              method: 'PUT',
            });
            
            if (saveResponse.ok) {
              console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded and saved successfully`);
              showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded and saved successfully`);
            } else {
              console.error(`Failed to save ${type} URL to database`);
              showError(`Failed to save ${type} URL to database`);
            }
          } catch (saveError) {
            console.error(`Error saving ${type} URL:`, saveError);
            showError(`Error saving ${type} URL`);
          }
        }
        
        console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
      } else {
        const error = await response.json();
        console.error(error.error || `Failed to upload ${type}`);
      }
    } catch (error) {
      console.error(`Error uploading ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant) return;
    
    try {
      setIsSaving(true);
      
      const response = await authenticatedApiCallWithBody('/api/admin/restaurant', restaurant, {
        method: 'PUT',
      });
      
      if (response.ok) {
        console.log('Restaurant settings saved successfully');
        showSuccess('Restaurant settings saved successfully');
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to save settings');
        showError(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings');
      showError('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoogleBusinessConnect = async () => {
    try {
      setIsConnectingGoogle(true);
      
      const response = await authenticatedApiCall('/api/auth/google');
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        const error = await response.json();
        console.error(error.error || 'Failed to start Google Business connection');
        showError(error.error || 'Failed to start Google Business connection');
      }
    } catch (error) {
      console.error('Error connecting to Google Business:', error);
      showError('Error connecting to Google Business');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show create restaurant form if no restaurant exists
  if (hasRestaurant === false) {
    return (
      <div>
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className={`${typography.h2} mb-2 break-words`}>
                Restaurant Settings
              </h1>
              <p className={`${typography.bodySmall} break-words`}>
                Create your first restaurant to get started
              </p>
            </div>
          </div>
        </div>

        {!showCreateForm ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-muted-foreground mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className={`${typography.h4} mb-2 break-words`}>
                No Restaurant Found
              </h2>
              <p className={`${typography.bodySmall} mb-6 break-words`}>
                You don&apos;t have a restaurant set up yet. Create your first restaurant to get started.
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="min-h-[44px] w-full sm:w-auto"
              >
                Create Restaurant
              </Button>
            </div>
          </div>
        ) : (
          <Card className={spacing.md}>
            <h2 className={`${typography.h4} mb-4 break-words`}>
              Create Your Restaurant
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground min-h-[44px]"
                  placeholder="Enter restaurant name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground min-h-[44px]"
                  placeholder="Enter restaurant address"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={handleCreateRestaurant}
                  disabled={isCreating}
                  className="flex items-center min-h-[44px] w-full sm:w-auto"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Restaurant'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load restaurant data</p>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer 
        toasts={toasts.map(toast => ({
          id: toast.id,
          type: toast.type,
          title: toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Info',
          message: toast.message,
          duration: toast.duration,
          onClose: removeToast
        }))} 
        onClose={removeToast} 
      />
      
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className={`${typography.h2} mb-2 break-words`}>
              Restaurant Settings
            </h1>
            <p className={`${typography.bodySmall} break-words`}>
              Manage your restaurant information and settings
            </p>
          </div>
        </div>
      </div>

      {/* Restaurant Info Card */}
      <Card className={`${spacing.md} mb-6`}>
        <h2 className={`${typography.h4} mb-4`}>
          Restaurant Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Restaurant Name
            </label>
            <input
              type="text"
              value={restaurant.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              placeholder="Enter restaurant name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Restaurant Slug
            </label>
            <input
              type="text"
              value={restaurant.slug}
              disabled
              className="w-full px-3 py-2 border border-input rounded-lg bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Slug cannot be changed
            </p>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Address
            </label>
            <input
              type="text"
              value={restaurant.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              placeholder="Enter restaurant address"
            />
          </div>
        </div>
      </Card>

      {/* Menu Settings Card */}
      <Card className={`${spacing.md} mb-6`}>
        <h2 className={`${typography.h4} mb-4`}>
          Menu Settings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Currency
            </label>
            <select
              value={restaurant.currency || 'RON'}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label} ({currency.symbol})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Currency used for menu prices
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nutrition Language
            </label>
            <select
              value={restaurant.nutrition_language || 'EN'}
              onChange={(e) => handleInputChange('nutrition_language', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
            >
              {NUTRITION_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Language for nutritional value labels
            </p>
          </div>
        </div>
      </Card>

      {/* Google Business Integration Card */}
      <Card className={`${spacing.md} mb-6`}>
        <h2 className={`${typography.h4} mb-4 break-words`}>
          Google Business Integration
        </h2>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-border rounded-lg">
            <div className="min-w-0">
              <h3 className="font-medium text-foreground break-words">Google Reviews</h3>
              <p className="text-sm text-muted-foreground break-words">
                Connect your Google Business account to display real ratings and reviews on your menu
              </p>
            </div>
            <Button
              onClick={handleGoogleBusinessConnect}
              disabled={isConnectingGoogle}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {isConnectingGoogle ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : restaurant?.google_business_location_id ? (
                'Reconnect Google Business'
              ) : (
                'Connect Google Business'
              )}
            </Button>
          </div>
          
          {restaurant?.google_business_location_id && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Connected to Google Business Profile</span>
              </div>
              {restaurant.google_business_rating && restaurant.google_business_review_count && (
                <div className="text-sm text-green-700 dark:text-green-300">
                  Current rating: ⭐ {restaurant.google_business_rating} ({restaurant.google_business_review_count} reviews)
                </div>
              )}
              {restaurant.google_business_last_sync && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Last synced: {new Date(restaurant.google_business_last_sync).toLocaleString()}
                </div>
              )}
            </div>
          )}
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="break-words">• Display real Google ratings on menu items</p>
            <p className="break-words">• Show actual review counts</p>
            <p className="break-words">• Automatically sync with your Google Business profile</p>
            <p className="break-words">• Fallback to sample rating (4.8 ⭐) when not connected</p>
          </div>
        </div>
      </Card>

      {/* Schedule Card */}
      <Card className={`${spacing.md} mb-6`}>
        <h2 className={`${typography.h4} mb-4 break-words`}>
          Operating Hours
        </h2>
        
        <div className="space-y-4">
          {[
            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
            'Friday', 'Saturday', 'Sunday'
          ].map((day) => (
            <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-foreground min-w-0 sm:w-20 flex-shrink-0">
                {day}
              </label>
              <input
                type="text"
                value={restaurant.schedule?.[day.toLowerCase()] || ''}
                onChange={(e) => handleScheduleChange(day, e.target.value)}
                className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground min-h-[44px]"
                placeholder="e.g., 11:00 AM - 10:00 PM"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Images Card */}
      <Card className={`${spacing.md} mb-6`}>
        <h2 className={`${typography.h4} mb-4 break-words`}>
          Restaurant Images
        </h2>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Logo
            </label>
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Restaurant logo"
                  className="w-full h-32 object-cover rounded-lg border-2 border-border"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="absolute inset-0 bg-black bg-opacity-50 text-white rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity min-h-[44px]"
                >
                  {isUploadingLogo ? 'Uploading...' : 'Change Logo'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors min-h-[44px]"
              >
                {isUploadingLogo ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm break-words">Click to upload logo</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'logo');
              }}
              className="hidden"
            />
          </div>
          
          {/* Cover Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Cover Image
            </label>
            {coverPreview ? (
              <div className="relative">
                <img
                  src={coverPreview}
                  alt="Restaurant cover"
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                />
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="absolute inset-0 bg-black bg-opacity-50 text-white rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity min-h-[44px]"
                >
                  {isUploadingCover ? 'Uploading...' : 'Change Cover'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors min-h-[44px]"
              >
                {isUploadingCover ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm break-words">Click to upload cover</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'cover');
              }}
              className="hidden"
            />
          </div>
        </div>
      </Card>

      {/* PDF Menu Generator */}
      <Card className={spacing.md}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`${typography.h4} mb-2`}>Menu Tools</h3>
            <p className={typography.bodySmall}>
              Generate beautiful PDF menus for your restaurant
            </p>
          </div>
          <Button
            onClick={() => setShowPDFGenerator(!showPDFGenerator)}
            variant="outline"
          >
            {showPDFGenerator ? 'Hide' : 'Show'} PDF Generator
          </Button>
        </div>
        
        {showPDFGenerator && (
          <PDFMenuGenerator 
            showSuccess={showSuccess}
            showError={showError}
          />
        )}
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-4 bg-background rounded-xl shadow-lg p-4 border">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Changes will be saved to your restaurant profile
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save All Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
