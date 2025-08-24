'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';

interface Popup {
  id: string;
  title: string;
  message: string;
  image?: string;
  ctaText?: string;
  ctaUrl?: string;
  active: boolean;
  startAt?: string;
  endAt?: string;
  frequency: "once-per-session" | "every-visit";
}

interface PopupFormData {
  title: string;
  message: string;
  ctaText: string;
  ctaUrl: string;
  active: boolean;
  startAt: string;
  endAt: string;
  frequency: "once-per-session" | "every-visit";
}

export default function AdminPopups() {
  const { data: session } = useSession();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // State management
  const [popups, setPopups] = useState<Popup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<PopupFormData>({
    title: '',
    message: '',
    ctaText: '',
    ctaUrl: '',
    active: true,
    startAt: '',
    endAt: '',
    frequency: 'once-per-session'
  });

  // File input ref
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadPopups = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/popups');
      
      if (response.ok) {
        const data = await response.json();
        setPopups(data.popups || []);
      } else {
        showError('Failed to load popups');
      }
    } catch {
      showError('Error loading popups');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load popups on mount
  useEffect(() => {
    if (session?.restaurantSlug) {
      loadPopups();
    }
  }, [session, loadPopups]);

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      ctaText: '',
      ctaUrl: '',
      active: true,
      startAt: '',
      endAt: '',
      frequency: 'once-per-session'
    });
    setImagePreview('');
    setShowForm(false);
    setEditingPopup(null);
  };

  const handleImageUpload = async (file: File) => {
    if (!session?.restaurantSlug) return '';

    try {
      setIsUploadingImage(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/upload/productImage/${session.restaurantSlug}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setImagePreview(result.url);
        showSuccess('Image uploaded successfully');
        return result.url;
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to upload image');
        return '';
      }
    } catch {
      showError('Error uploading image');
      return '';
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showError('Popup title is required');
      return;
    }

    if (!formData.message.trim()) {
      showError('Popup message is required');
      return;
    }

    // Validate dates
    if (formData.startAt && formData.endAt) {
      const startDate = new Date(formData.startAt);
      const endDate = new Date(formData.endAt);
      if (endDate <= startDate) {
        showError('End date must be after start date');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const popupData = {
        title: formData.title,
        message: formData.message,
        image: imagePreview || (editingPopup?.image || undefined),
        ctaText: formData.ctaText || undefined,
        ctaUrl: formData.ctaUrl || undefined,
        active: formData.active,
        startAt: formData.startAt || undefined,
        endAt: formData.endAt || undefined,
        frequency: formData.frequency
      };

      const url = editingPopup 
        ? `/api/admin/popups/${editingPopup.id}`
        : '/api/admin/popups';
      
      const method = editingPopup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(popupData),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        resetForm();
        loadPopups(); // Reload popups
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to save popup');
      }
    } catch {
      showError('Error saving popup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (popup: Popup) => {
    setEditingPopup(popup);
    setFormData({
      title: popup.title,
      message: popup.message,
      ctaText: popup.ctaText || '',
      ctaUrl: popup.ctaUrl || '',
      active: popup.active,
      startAt: popup.startAt ? popup.startAt.slice(0, 16) : '', // Format for datetime-local input
      endAt: popup.endAt ? popup.endAt.slice(0, 16) : '',
      frequency: popup.frequency
    });
    setImagePreview(popup.image || '');
    setShowForm(true);
  };

  const handleDelete = async (popup: Popup) => {
    if (!confirm(`Are you sure you want to delete "${popup.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/popups/${popup.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        loadPopups(); // Reload popups
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to delete popup');
      }
    } catch {
      showError('Error deleting popup');
    }
  };

  const toggleActive = async (popup: Popup) => {
    try {
      const response = await fetch(`/api/admin/popups/${popup.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...popup,
          active: !popup.active
        }),
      });

      if (response.ok) {
        showSuccess(`Popup ${!popup.active ? 'activated' : 'deactivated'}`);
        loadPopups(); // Reload popups
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to update popup');
      }
    } catch {
      showError('Error updating popup');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const isPopupActive = (popup: Popup) => {
    if (!popup.active) return false;
    
    const now = new Date();
    const startDate = popup.startAt ? new Date(popup.startAt) : null;
    const endDate = popup.endAt ? new Date(popup.endAt) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Popup Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage promotional popups and announcements
        </p>
      </div>

      {/* Add New Popup Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Popup
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingPopup ? 'Edit Popup' : 'Create New Popup'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter popup title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter popup message"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Learn More, Order Now"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CTA URL
                  </label>
                  <input
                    type="url"
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Popup Image
                  </label>
                  {imagePreview ? (
                    <div className="relative">
                      <Image
                        src={imagePreview}
                        alt="Popup preview"
                        width={400}
                        height={128}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="absolute inset-0 bg-black bg-opacity-50 text-white rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        {isUploadingImage ? 'Uploading...' : 'Change Image'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                    >
                      {isUploadingImage ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                      ) : (
                        <>
                          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-sm">Click to upload image</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleImageUpload(file);
                    }}
                    className="hidden"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endAt}
                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as "once-per-session" | "every-visit" })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="once-per-session">Once per session</option>
                    <option value="every-visit">Every visit</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Active (popup will be shown to users)
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingPopup ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingPopup ? 'Update Popup' : 'Create Popup'
                )}
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Popups List */}
      {popups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No popups found. Create your first popup to get started.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Create First Popup
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {popups.map((popup) => (
            <div key={popup.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                      {popup.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        popup.active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {popup.active ? 'Active' : 'Inactive'}
                      </span>
                      {isPopupActive(popup) && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Currently Showing
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {popup.message}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Frequency: {popup.frequency}</span>
                    <span>ID: {popup.id}</span>
                    {popup.ctaText && <span>CTA: {popup.ctaText}</span>}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => toggleActive(popup)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      popup.active
                        ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                        : 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                    }`}
                  >
                    {popup.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleEdit(popup)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(popup)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Start:</span>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(popup.startAt)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">End:</span>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(popup.endAt)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Frequency:</span>
                  <p className="text-gray-600 dark:text-gray-400">{popup.frequency}</p>
                </div>
              </div>

              {popup.image && (
                <div className="mt-4">
                  <Image
                    src={popup.image}
                    alt={popup.title}
                    width={128}
                    height={80}
                    className="w-32 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {popups.length > 0 && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Popup Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Popups:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{popups.length}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Active:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {popups.filter(popup => popup.active).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Currently Showing:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {popups.filter(popup => isPopupActive(popup)).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">With Images:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {popups.filter(popup => popup.image).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
