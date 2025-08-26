'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Clock } from 'lucide-react';

interface PromoPopupProps {
  slug: string;
}

interface Popup {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  button_text?: string;
  button_url?: string;
  discount_percentage?: number;
  valid_until?: string;
}

export default function PromoPopup({ slug }: PromoPopupProps) {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPopup = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';
        
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        // First get the restaurant ID
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id')
          .eq('slug', slug)
          .single();

        if (!restaurant) {
          setIsLoading(false);
          return;
        }

        // Then get the popup for this restaurant
        const { data: popupData } = await supabase
          .from('popups')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true)
          .single();

        if (popupData) {
          setPopup(popupData);
          // Show popup after a delay
          setTimeout(() => setIsVisible(true), 2000);
        }
      } catch (error) {
        console.error('Error fetching popup:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopup();
  }, [slug]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleAction = () => {
    if (popup?.button_url) {
      window.open(popup.button_url, '_blank');
    }
    handleClose();
  };

  if (isLoading || !popup || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="relative max-w-md w-full mx-auto shadow-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
        
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-4">
            {popup.discount_percentage && (
              <Badge variant="destructive" className="mb-3">
                {popup.discount_percentage}% OFF
              </Badge>
            )}
            <h3 className="text-xl font-bold text-foreground mb-2">
              {popup.title}
            </h3>
            <p className="text-muted-foreground text-sm">
              {popup.description}
            </p>
          </div>

          {/* Image */}
          {popup.image_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img
                src={popup.image_url}
                alt={popup.title}
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          {/* Valid until */}
          {popup.valid_until && (
            <div className="flex items-center justify-center text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4 mr-1" />
              Valid until {new Date(popup.valid_until).toLocaleDateString()}
            </div>
          )}

          {/* Action Button */}
          {popup.button_text && (
            <Button 
              onClick={handleAction} 
              className="w-full"
            >
              {popup.button_text}
            </Button>
          )}

          {/* Close button */}
          <Button 
            variant="outline" 
            onClick={handleClose} 
            className="w-full mt-2"
          >
            Maybe Later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
