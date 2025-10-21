'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, User, Shield, Eye, EyeOff, Copy, Link } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';

interface StaffUser {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  categories: Array<{
    category_id: number;
    category_name: string;
    can_edit: boolean;
  }>;
}

interface Category {
  id: number;
  name: string;
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string>('');
  const { showSuccess, showError } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    role: 'cook',
    category_permissions: [] as number[]
  });

  const fetchStaff = useCallback(async () => {
    try {
      const response = await authenticatedApiCall('/api/admin/staff');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        setStaff(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch staff:', response.status);
        setStaff([]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      showError('Failed to fetch staff users');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await authenticatedApiCall('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        setCategories(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch categories:', response.status);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      showError('Failed to fetch categories');
      setCategories([]);
    }
  }, [showError]);

  const fetchRestaurantInfo = useCallback(async () => {
    try {
      const response = await authenticatedApiCall('/api/admin/me/restaurant');
      if (response.ok) {
        const data = await response.json();
        setRestaurantSlug(data.slug || '');
      }
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
    }
  }, []);

  const copyStaffLoginLink = async () => {
    if (!restaurantSlug) {
      showError('Restaurant information not available');
      return;
    }

    const loginUrl = `${window.location.origin}/staff/login?restaurant=${restaurantSlug}`;
    
    try {
      await navigator.clipboard.writeText(loginUrl);
      showSuccess('Staff login link copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = loginUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess('Staff login link copied to clipboard!');
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchCategories();
    fetchRestaurantInfo();
  }, [fetchStaff, fetchCategories, fetchRestaurantInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await authenticatedApiCallWithBody('/api/admin/staff', {
        id: editingId,
        ...formData
      }, {
        method: editingId ? 'PUT' : 'POST'
      });

      if (response.ok) {
        showSuccess(editingId ? 'Staff user updated' : 'Staff user added');
        setShowAddForm(false);
        setEditingId(null);
        setFormData({ name: '', pin: '', role: 'cook', category_permissions: [] });
        fetchStaff();
      } else {
        throw new Error('Failed to save staff user');
      }
    } catch (error) {
      showError('Failed to save staff user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff user?')) return;

    try {
      const response = await authenticatedApiCall(`/api/admin/staff?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccess('Staff user deleted');
        fetchStaff();
      } else {
        throw new Error('Failed to delete staff user');
      }
    } catch (error) {
      showError('Failed to delete staff user');
    }
  };

  const handleEdit = (staffUser: StaffUser) => {
    setEditingId(staffUser.id);
    setFormData({
      name: staffUser.name,
      pin: '', // Don't show existing PIN
      role: staffUser.role,
      category_permissions: Array.isArray(staffUser.categories) ? staffUser.categories.map(c => c.category_id) : []
    });
    setShowAddForm(true);
  };

  const filteredStaff = Array.isArray(staff) ? staff.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff users and their category permissions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={copyStaffLoginLink} 
            variant="outline" 
            className="flex items-center gap-2"
            disabled={!restaurantSlug}
          >
            <Link className="h-4 w-4" />
            Copy Staff Login Link
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Staff User
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search staff users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Staff User' : 'Add New Staff User'}</CardTitle>
            <CardDescription>
              {editingId ? 'Update staff user information and permissions' : 'Add a new staff user with PIN and category access'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Staff Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pin">PIN (4-6 digits)</Label>
                  <Input
                    id="pin"
                    type="password"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    required
                    minLength={4}
                    maxLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="cook">Cook</option>
                    <option value="bartender">Bartender</option>
                    <option value="server">Server</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              {/* Category Permissions */}
              <div>
                <Label>Category Access</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.category_permissions.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              category_permissions: [...formData.category_permissions, category.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              category_permissions: formData.category_permissions.filter(id => id !== category.id)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? 'Update' : 'Add'} Staff User
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setFormData({ name: '', pin: '', role: 'cook', category_permissions: [] });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <div className="grid gap-4">
        {filteredStaff.map((staffUser) => (
          <Card key={staffUser.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <h3 className="font-semibold">{staffUser.name}</h3>
                    <Badge variant={staffUser.is_active ? 'default' : 'secondary'}>
                      {staffUser.role}
                    </Badge>
                    {!staffUser.is_active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Categories: {Array.isArray(staffUser.categories) ? staffUser.categories.map(c => c.category_name).join(', ') : 'None'}</p>
                    <p>Added: {new Date(staffUser.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(staffUser)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(staffUser.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No staff users found</p>
            <Button onClick={() => setShowAddForm(true)} className="mt-4">
              Add your first staff user
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
