'use client';

import { useEffect, useState } from 'react';

// Define types for popup data structure
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

interface PromoPopupProps {
  slug: string;
}

export default function PromoPopup({ slug }: PromoPopupProps) {
  const [currentPopup, setCurrentPopup] = useState<Popup | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchAndShowPopups = async () => {
      try {
        const response = await fetch(`/api/popups/${slug}`);
        if (!response.ok) return;

        const data = await response.json();
        const popups: Popup[] = data.popups || [];

        // Find the first popup that should be shown based on frequency rules
        for (const popup of popups) {
          const storageKey = `popup_${slug}_${popup.id}_shown`;
          
          if (popup.frequency === 'once-per-session') {
            // Check sessionStorage - if not shown this session, show it
            if (!sessionStorage.getItem(storageKey)) {
              setCurrentPopup(popup);
              setIsVisible(true);
              // Mark as shown for this session
              sessionStorage.setItem(storageKey, 'true');
              break;
            }
          } else if (popup.frequency === 'every-visit') {
            // Always show on every visit, but respect localStorage for temporary dismissal
            const lastShown = localStorage.getItem(storageKey);
            const now = Date.now();
            
            // Show if never shown or if it's been more than 1 hour since last shown
            if (!lastShown || (now - parseInt(lastShown)) > 60 * 60 * 1000) {
              setCurrentPopup(popup);
              setIsVisible(true);
              // Update last shown timestamp
              localStorage.setItem(storageKey, now.toString());
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching popups:', error);
      }
    };

    fetchAndShowPopups();
  }, [slug]);

  const handleClose = () => {
    setIsVisible(false);
    // Clear the popup after animation
    setTimeout(() => setCurrentPopup(null), 300);
  };

  const handleCTA = () => {
    if (currentPopup?.ctaUrl) {
      window.location.href = currentPopup.ctaUrl;
    }
    handleClose();
  };

  if (!currentPopup || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
          aria-label="Close popup"
        >
          <svg
            className="w-4 h-4 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image */}
        {currentPopup.image && (
          <div className="relative h-48 overflow-hidden rounded-t-2xl">
            <img
              src={currentPopup.image}
              alt={currentPopup.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {currentPopup.title}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            {currentPopup.message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {currentPopup.ctaText && currentPopup.ctaUrl && (
              <button
                onClick={handleCTA}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors text-center"
              >
                {currentPopup.ctaText}
              </button>
            )}
            
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {currentPopup.ctaText ? 'Maybe Later' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
