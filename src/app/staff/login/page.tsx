'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function StaffLoginPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get restaurant ID from URL params or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const restaurantId = urlParams.get('restaurant') || localStorage.getItem('restaurant_id');

      if (!restaurantId) {
        showError('Restaurant ID not found');
        return;
      }

      const response = await fetch('/api/staff/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, restaurant_id: restaurantId })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('staff_user', JSON.stringify(data.staff));
        localStorage.setItem('staff_categories', JSON.stringify(data.categories));
        showSuccess(`Welcome, ${data.staff.name}!`);
        router.push('/staff/dashboard');
      } else {
        const error = await response.json();
        showError(error.error || 'Invalid PIN');
      }
    } catch (error) {
      showError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Staff Login</CardTitle>
            <CardDescription>
              Enter your PIN to access the staff dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading || pin.length < 4}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="text-sm text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to main site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
