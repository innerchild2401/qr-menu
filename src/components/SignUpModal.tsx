'use client';

import { useState } from 'react';
import { signUp } from '@/lib/auth-supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';


interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    restaurantName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        restaurant_name: formData.restaurantName
      });

      console.log('✅ Signup successful:', result);
      
      // Close modal first
      onClose();
      
      // Email confirmation is disabled, so always redirect
      console.log('✅ Signup successful, redirecting to admin...');
      
      // Add a small delay to ensure session is properly established
      setTimeout(() => {
        try {
          router.push('/admin/settings');
        } catch (redirectError) {
          console.error('❌ Redirect error:', redirectError);
          // Fallback: try to navigate to admin root
          router.push('/admin');
        }
      }, 1000); // Increased delay to ensure session is fully established
      
    } catch (error) {
      console.error('❌ Signup error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Create Your Account
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Restaurant Name</Label>
            <Input
              id="restaurantName"
              name="restaurantName"
              type="text"
              value={formData.restaurantName}
              onChange={handleInputChange}
              required
              placeholder="Enter your restaurant name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Create a password"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              placeholder="Confirm your password"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="text-center text-sm text-muted-foreground">
          By creating an account, you agree to our terms of service and privacy policy.
        </div>
      </DialogContent>
    </Dialog>
  );
}
