'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, User, Edit, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { authenticatedApiCall } from '@/lib/api-helpers';

interface StaffActivity {
  id: string;
  action: string;
  product_id?: number;
  product_name?: string;
  details: {
    ip_address?: string;
    changes?: string;
    staff_name?: string;
    approval_id?: string;
    [key: string]: unknown;
  };
  created_at: string;
  staff_user: {
    id: string;
    name: string;
    role: string;
  };
}

export default function StaffActivityPage() {
  const [activities, setActivities] = useState<StaffActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  const fetchActivities = useCallback(async () => {
    try {
      const response = await authenticatedApiCall('/api/admin/staff-activity');
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        console.error('Failed to fetch activities:', response.status);
        showError('Failed to fetch staff activities');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      showError('Failed to fetch staff activities');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <LogIn className="h-4 w-4" />;
      case 'edit_recipe':
        return <Edit className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'edit_recipe':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionDescription = (activity: StaffActivity) => {
    switch (activity.action) {
      case 'login':
        return `Logged in from ${activity.details?.ip_address || 'unknown IP'}`;
      case 'edit_recipe':
        return `Updated recipe for "${activity.product_name || 'Unknown Product'}"`;
      default:
        return activity.details?.changes || 'Unknown action';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Staff Activity</h1>
          <p className="text-muted-foreground">
            Monitor staff actions and recipe updates
          </p>
        </div>
        <Button onClick={fetchActivities} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No staff activity found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getActionIcon(activity.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getActionColor(activity.action)}>
                          {activity.action.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatTime(activity.created_at)}
                        </span>
                      </div>
                      <p className="font-medium">{getActionDescription(activity)}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{activity.staff_user.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.staff_user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
