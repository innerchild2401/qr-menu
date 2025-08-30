'use client';

import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';
import { useState, useEffect, useRef, useCallback } from 'react';
import { typography, spacing, gaps } from '@/lib/design-system';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Upload, 
  Calendar,
  Clock,
  MessageSquare,
  Link,
  Image as ImageIcon,
  Lightbulb,
  Ruler,
  Type,
  ShoppingCart,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Zap,
  Star,
  AlertTriangle
} from 'lucide-react';

interface Popup {
  id: string;
  title: string;
  message: string;
  image_url?: string;
  cta_text?: string;
  cta_url?: string;
  active: boolean;
  start_at?: string;
  end_at?: string;
  frequency: "once-per-session" | "every-visit";
  restaurant_id: string;
  created_at: string;
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
  
  // State management
  const [popups, setPopups] = useState<Popup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  
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
      
      // First, check if user has a restaurant
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (restaurantResponse.ok) {
        setHasRestaurant(true);
      } else if (restaurantResponse.status === 404) {
        // No restaurant found
        setHasRestaurant(false);
        setPopups([]);
        return;
      } else {
        console.error('Failed to load restaurant data');
        setHasRestaurant(false);
        return;
      }

      // Then load popups
      const popupsResponse = await authenticatedApiCall('/api/admin/popups');
      if (popupsResponse.ok) {
        const data = await popupsResponse.json();
        setPopups(data.popups || []);
      } else {
        console.error('Failed to load popups');
      }
    } catch (error) {
      console.error('Error loading popups:', error);
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load popups on mount
  useEffect(() => {
    loadPopups();
  }, [loadPopups]);

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
    try {
      setIsUploadingImage(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Get restaurant slug for upload path
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (!restaurantResponse.ok) {
        console.error('Failed to get restaurant information');
        return '';
      }
      
      const restaurantData = await restaurantResponse.json();
      const restaurantSlug = restaurantData.restaurant?.slug || 'default';
      
      const response = await fetch(`/api/upload/productImage/${restaurantSlug}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setImagePreview(result.url);
        console.log('Image uploaded successfully');
        return result.url;
      } else {
        const errorData = await response.json();
        console.error(errorData.error || 'Failed to upload image');
        return '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      console.error('Error uploading image');
      return '';
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      console.error('Popup title is required');
      return;
    }

    if (!formData.message.trim()) {
      console.error('Popup message is required');
      return;
    }

    // Validate dates
    if (formData.startAt && formData.endAt) {
      const startDate = new Date(formData.startAt);
      const endDate = new Date(formData.endAt);
      if (endDate <= startDate) {
        console.error('End date must be after start date');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const popupData = {
        title: formData.title,
        message: formData.message,
        image_url: imagePreview || (editingPopup?.image_url || undefined),
        cta_text: formData.ctaText || undefined,
        cta_url: formData.ctaUrl || undefined,
        active: formData.active,
        start_at: formData.startAt || undefined,
        end_at: formData.endAt || undefined,
        frequency: formData.frequency
      };

      const url = editingPopup 
        ? `/api/admin/popups/${editingPopup.id}`
        : '/api/admin/popups';
      
      const method = editingPopup ? 'PUT' : 'POST';

      const response = await authenticatedApiCallWithBody(url, popupData, {
        method,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        resetForm();
        loadPopups(); // Reload popups
      } else {
        const errorData = await response.json();
        console.error(errorData.error || 'Failed to save popup');
      }
    } catch (error) {
      console.error('Error saving popup:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (popup: Popup) => {
    setEditingPopup(popup);
    setFormData({
      title: popup.title,
      message: popup.message,
      ctaText: popup.cta_text || '',
      ctaUrl: popup.cta_url || '',
      active: popup.active,
      startAt: popup.start_at ? new Date(popup.start_at).toISOString().slice(0, 16) : '',
      endAt: popup.end_at ? new Date(popup.end_at).toISOString().slice(0, 16) : '',
      frequency: popup.frequency
    });
    setImagePreview(popup.image_url || '');
    setShowForm(true);
  };

  const handleDelete = async (popup: Popup) => {
    if (!confirm(`Are you sure you want to delete "${popup.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await authenticatedApiCall(`/api/admin/popups/${popup.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        loadPopups(); // Reload popups
      } else {
        const errorData = await response.json();
        console.error(errorData.error || 'Failed to delete popup');
      }
    } catch (error) {
      console.error('Error deleting popup:', error);
    }
  };

  const toggleActive = async (popup: Popup) => {
    try {
      const response = await authenticatedApiCallWithBody(`/api/admin/popups/${popup.id}`, {
        ...popup,
        active: !popup.active
      }, {
        method: 'PUT',
      });

      if (response.ok) {
        console.log(`Popup ${!popup.active ? 'activated' : 'deactivated'} successfully`);
        loadPopups(); // Reload popups
      } else {
        const errorData = await response.json();
        console.error(errorData.error || 'Failed to update popup');
      }
    } catch (error) {
      console.error('Error updating popup:', error);
    }
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
        <div className="mb-6">
          <h1 className={`${typography.h2} mb-2`}>
            Popup Management
          </h1>
          <p className={typography.bodySmall}>
            Manage promotional popups for your restaurant
          </p>
        </div>

        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-muted-foreground mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className={`${typography.h4} mb-2`}>
              No Restaurant Found
            </h2>
            <p className={`${typography.bodySmall} mb-6`}>
              You need to create a restaurant first before you can manage popups.
            </p>
            <Button onClick={() => window.location.href = '/admin/settings'}>
              Go to Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${typography.h2} mb-2`}>
              Popup Management
            </h1>
            <p className={typography.bodySmall}>
              Manage promotional popups for your restaurant
            </p>
          </div>
          
          {/* Tips Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                💡 Tips to Boost Sales
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center text-2xl font-bold text-blue-700">
                  <Lightbulb className="w-6 h-6 mr-2" />
                  Popup Best Practices to Boost Sales
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-8">
                {/* Best Image Dimensions */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <Ruler className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-blue-800">Best Image Dimensions 📐</h3>
                  </div>
                  <p className="text-blue-700 mb-4">
                    Ensure popups look sharp and beautiful on all devices.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-blue-200">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-semibold text-green-700">Recommended</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div><strong>Size:</strong> 1080 × 1350 px (4:5 ratio)</div>
                        <div><strong>Format:</strong> JPG for photos, PNG for transparency</div>
                        <div><strong>Max size:</strong> Under 400 KB</div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-blue-200">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                        <span className="font-semibold text-orange-700">Minimum</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div><strong>Size:</strong> 720 × 960 px</div>
                        <div><strong>Purpose:</strong> Avoid pixelation</div>
                        <div><strong>Tip:</strong> Use bright colors & high contrast</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text Guidelines */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <Type className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800">Text Guidelines for Popups 📝</h3>
                  </div>
                  <p className="text-green-700 mb-4">
                    Keep messages short, clear, and persuasive.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-green-200">
                        <h4 className="font-semibold text-green-700 mb-2">Text Limits</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Headline:</strong> Max 7 words</div>
                          <div><strong>Body text:</strong> 30–40 words maximum</div>
                          <div><strong>Font size:</strong> Minimum 16px</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-green-200">
                        <h4 className="font-semibold text-green-700 mb-2">Examples</h4>
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="font-medium text-green-700">✅ Good:</div>
                              <div className="text-gray-600">"Today only! 20% OFF all burgers 🍔"</div>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <XCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="font-medium text-red-700">❌ Bad:</div>
                              <div className="text-gray-600">"Special discounts available for a limited time on selected products"</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Offers Category */}
                <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-200">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                      <ShoppingCart className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-purple-800">Special Offers Category 🛒</h3>
                  </div>
                  <p className="text-purple-700 mb-4">
                    Make CTAs more effective by linking directly to offers.
                  </p>
                  
                  <div className="bg-white p-4 rounded-xl border border-purple-200">
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold text-sm">1</span>
                        </div>
                        <span className="text-purple-700">Create a "Special Offers" category in your menu</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold text-sm">2</span>
                        </div>
                        <span className="text-purple-700">Add your discounted products there</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold text-sm">3</span>
                        </div>
                        <span className="text-purple-700">Copy the product link and paste it in the CTA field</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-700">
                        <strong>Result:</strong> Users tap the popup → go directly to the offer → higher conversion!
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA Best Practices */}
                <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-200">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg mr-3">
                      <Target className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-orange-800">Call-to-Action Best Practices 🔗</h3>
                  </div>
                  <p className="text-orange-700 mb-4">
                    Make users take action immediately.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-xl border border-orange-200">
                      <h4 className="font-semibold text-orange-700 mb-3">✅ Action-Driven CTAs</h4>
                      <div className="space-y-2">
                        <div className="flex items-center p-2 bg-green-50 rounded-lg">
                          <Zap className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-sm font-medium">"Order Now 🍕"</span>
                        </div>
                        <div className="flex items-center p-2 bg-green-50 rounded-lg">
                          <Star className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-sm font-medium">"Get 30% Off 🎉"</span>
                        </div>
                        <div className="flex items-center p-2 bg-green-50 rounded-lg">
                          <Clock className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-sm font-medium">"Limited Time Deal ⏳"</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-orange-200">
                      <h4 className="font-semibold text-orange-700 mb-3">❌ Avoid These</h4>
                      <div className="space-y-2">
                        <div className="flex items-center p-2 bg-red-50 rounded-lg">
                          <XCircle className="w-4 h-4 text-red-600 mr-2" />
                          <span className="text-sm text-red-700">"Click Here"</span>
                        </div>
                        <div className="flex items-center p-2 bg-red-50 rounded-lg">
                          <XCircle className="w-4 h-4 text-red-600 mr-2" />
                          <span className="text-sm text-red-700">"Learn More"</span>
                        </div>
                        <div className="flex items-center p-2 bg-red-50 rounded-lg">
                          <XCircle className="w-4 h-4 text-red-600 mr-2" />
                          <span className="text-sm text-red-700">"Find Out More"</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Marketing Tips */}
                <div className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                      <TrendingUp className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-bold text-yellow-800">Marketing Tips to Increase Sales 📈</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-yellow-200">
                        <h4 className="font-semibold text-yellow-700 mb-3">Urgency Words</h4>
                        <div className="space-y-2">
                          <div className="flex items-center p-2 bg-red-50 rounded-lg">
                            <span className="text-sm font-medium text-red-700">"Today only"</span>
                          </div>
                          <div className="flex items-center p-2 bg-red-50 rounded-lg">
                            <span className="text-sm font-medium text-red-700">"Limited offer"</span>
                          </div>
                          <div className="flex items-center p-2 bg-red-50 rounded-lg">
                            <span className="text-sm font-medium text-red-700">"Few left!"</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-yellow-200">
                        <h4 className="font-semibold text-yellow-700 mb-3">Exclusivity</h4>
                        <div className="space-y-2">
                          <div className="flex items-center p-2 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-blue-700">"Members-only deal"</span>
                          </div>
                          <div className="flex items-center p-2 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-blue-700">"Early access"</span>
                          </div>
                          <div className="flex items-center p-2 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-blue-700">"VIP customers"</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-white p-4 rounded-xl border border-yellow-200">
                    <div className="flex items-start">
                      <Lightbulb className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-yellow-700">
                          Pro Tips:
                        </p>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• High-quality food photos get <strong>30% more clicks</strong></li>
                          <li>• One clear message per popup → too many ideas confuse users</li>
                          <li>• Use strong visuals and bright colors to stand out</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Add Popup Button */}
      <div className="mb-6">
        <Button onClick={() => setShowForm(true)} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add New Popup
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className={`${spacing.md} mb-6`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`${typography.h4}`}>
              {editingPopup ? 'Edit Popup' : 'Add New Popup'}
            </h2>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className={`space-y-6`}>
            {/* Title and Status */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${gaps.md}`}>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter popup title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active" className="text-sm">
                    Active
                  </Label>
                </div>
              </div>
            </div>
            
            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter popup message"
                rows={3}
                required
              />
            </div>

            {/* CTA Fields */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${gaps.md}`}>
              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA Text</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ctaText"
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="e.g., Learn More"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ctaUrl">CTA URL</Label>
                <Input
                  id="ctaUrl"
                  type="url"
                  value={formData.ctaUrl}
                  onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* Date Fields */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${gaps.md}`}>
              <div className="space-y-2">
                <Label htmlFor="startAt">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startAt"
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endAt">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endAt"
                    type="datetime-local"
                    value={formData.endAt}
                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: "once-per-session" | "every-visit") => 
                  setFormData({ ...formData, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once-per-session">Once per session</SelectItem>
                  <SelectItem value="every-visit">Every visit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Popup Image</Label>
              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Popup preview"
                    className="w-full h-32 object-cover rounded-lg border-2 border-border"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="absolute inset-0 bg-black/50 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isUploadingImage ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  {isUploadingImage ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-muted-foreground"></div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-sm">Click to upload image</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
              />
            </div>
            
            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  editingPopup ? 'Update Popup' : 'Create Popup'
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Popups List */}
      <Card className={spacing.md}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`${typography.h4}`}>
            Popups ({popups.length})
          </h2>
        </div>
        
        {popups.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              <MessageSquare className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-muted-foreground mb-4">
              No popups found. Create your first popup to get started.
            </p>
            <Button onClick={() => setShowForm(true)}>
              Add First Popup
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {popups.map((popup) => (
              <div
                key={popup.id}
                className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-foreground mr-3">
                        {popup.title}
                      </h3>
                      <Badge variant={popup.active ? "default" : "secondary"}>
                        {popup.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-2">
                      {popup.message}
                    </p>
                    
                    {popup.image_url && (
                      <div className="mb-2">
                        <img
                          src={popup.image_url}
                          alt={popup.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Frequency: {popup.frequency}
                      </div>
                      {popup.start_at && (
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Start: {new Date(popup.start_at).toLocaleString()}
                        </div>
                      )}
                      {popup.end_at && (
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          End: {new Date(popup.end_at).toLocaleString()}
                        </div>
                      )}
                      {popup.cta_text && (
                        <div className="flex items-center">
                          <Link className="w-3 h-3 mr-1" />
                          CTA: {popup.cta_text}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(popup)}
                      className="flex items-center"
                    >
                      {popup.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(popup)}
                      className="flex items-center"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(popup)}
                      className="flex items-center text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
