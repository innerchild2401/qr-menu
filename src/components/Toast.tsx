'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const toastStyles = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info: 'border-blue-200 bg-blue-50',
};

const toastColors = {
  success: 'text-green-800',
  error: 'text-red-800',
  warning: 'text-yellow-800',
  info: 'text-blue-800',
};

export default function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Show toast after a brief delay
    const showTimer = setTimeout(() => setIsVisible(true), 100);

    // Auto-hide after duration
    const hideTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [id, duration, onClose]);

  const Icon = toastIcons[type];

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <Card 
      className={`border shadow-lg transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${isLeaving ? 'translate-x-full opacity-0' : ''} ${toastStyles[type]}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Icon className={`w-5 h-5 mt-0.5 ${toastColors[type]}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-medium ${toastColors[type]}`}>
                {title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 ml-2"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            {message && (
              <p className={`text-sm mt-1 ${toastColors[type]}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
