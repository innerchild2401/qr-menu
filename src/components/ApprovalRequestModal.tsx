'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Clock } from 'lucide-react';

interface ApprovalRequestModalProps {
  timeLeft: number;
  onRetry: () => void;
  onClose: () => void;
}

export default function ApprovalRequestModal({ timeLeft, onRetry, onClose }: ApprovalRequestModalProps) {
  const [currentTimeLeft, setCurrentTimeLeft] = useState(timeLeft);

  useEffect(() => {
    setCurrentTimeLeft(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (currentTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setCurrentTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTimeLeft]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Waiting for Approval</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-muted-foreground mb-4">
            Please ask a table participant to approve your request to add items to this order.
          </p>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold text-primary">
              {currentTimeLeft}s
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(currentTimeLeft / 20) * 100}%` }}
            />
          </div>
        </div>

        {currentTimeLeft === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Request expired. You can try again.
            </p>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Close
          </Button>
          {currentTimeLeft === 0 && (
            <Button
              className="flex-1"
              onClick={onRetry}
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

