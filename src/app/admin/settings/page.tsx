'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';
import { supabase } from '@/lib/auth-supabase';

interface Restaurant {
  name: string;
  slug: string;
  address: string;
  schedule: Record<string, string>;
  logo_url?: string; // Actual column name
  cover_url?: string; // Actual column name
  // Note: qr_code_url column doesn't exist in actual schema
}

export default function AdminSettings() {
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
  
  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load user session and restaurant data
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        loadRestaurantData();
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadRestaurantData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadRestaurantData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/restaurant');
      
      if (response.ok) {
        const data = await response.json();
        setRestaurant(data.restaurant);
        setLogoPreview(data.restaurant.logo_url || '');
        setCoverPreview(data.restaurant.cover_url || '');
      } else {
        showError('Failed to load restaurant data');
      }
    } catch (error) {
      showError('Error loading restaurant data');
    } finally {
      setIsLoading(false);
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
          ...restaurant.schedule,
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
          setRestaurant({
            ...restaurant,
            [type === 'logo' ? 'logo_url' : 'cover_url']: result.url
          });
        }
        
        showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
      } else {
        const error = await response.json();
        showError(error.error || `Failed to upload ${type}`);
      }
    } catch (error) {
      showError(`Error uploading ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant) return;
    
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/admin/restaurant', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restaurant),
      });
      
      if (response.ok) {
        showSuccess('Restaurant settings saved successfully');
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to save settings');
      }
    } catch (error) {
      showError('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Failed to load restaurant data</p>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Restaurant Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your restaurant information and settings
        </p>
      </div>

      {/* Restaurant Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Restaurant Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Restaurant Name
            </label>
            <input
              type="text"
              value={restaurant.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter restaurant name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Restaurant Slug
            </label>
            <input
              type="text"
              value={restaurant.slug}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-gray-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Slug cannot be changed
            </p>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={restaurant.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter restaurant address"
            />
          </div>
        </div>
      </div>

      {/* Schedule Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Operating Hours
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
            'Friday', 'Saturday', 'Sunday'
          ].map((day) => (
            <div key={day} className="flex items-center space-x-4">
              <label className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">
                {day}
              </label>
              <input
                type="text"
                value={restaurant.schedule[day.toLowerCase()] || ''}
                onChange={(e) => handleScheduleChange(day, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="e.g., 11:00 AM - 10:00 PM"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Images Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Restaurant Images
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo
            </label>
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Restaurant logo"
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="absolute inset-0 bg-black bg-opacity-50 text-white rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  {isUploadingLogo ? 'Uploading...' : 'Change Logo'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
              >
                {isUploadingLogo ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm">Click to upload logo</span>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="absolute inset-0 bg-black bg-opacity-50 text-white rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  {isUploadingCover ? 'Uploading...' : 'Change Cover'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
              >
                {isUploadingCover ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm">Click to upload cover</span>
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
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Changes will be saved to your restaurant profile
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save All Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
