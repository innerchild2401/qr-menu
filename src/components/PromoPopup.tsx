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
        // Use the secure API route instead of direct database access
        const response = await fetch(`/api/popups/${slug}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch popup');
        }
        
        const { popup: popupData } = await response.json();
        
        if (popupData) {
          // Check session storage to see if this popup was already shown
          const sessionKey = `popup-shown-${popupData.id}`;
          const wasShown = sessionStorage.getItem(sessionKey);
          
          if (!wasShown || popupData.frequency === 'every-visit') {
            setPopup({
              id: popupData.id,
              title: popupData.title,
              description: popupData.message,
              image_url: popupData.image || undefined,
              button_text: popupData.cta_text || undefined,
              button_url: popupData.cta_url || undefined,
            });
            
            // Mark as shown in session storage
            sessionStorage.setItem(sessionKey, 'true');
            
            // Show popup after a delay
            setTimeout(() => setIsVisible(true), 2000);
          }
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
