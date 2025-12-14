'use client';

import { Button } from '@/components/ui/button';
import { X, Clock, Check, XCircle } from 'lucide-react';

interface ApprovalNotificationProps {
  requestId: string;
  timeLeft: number;
  onApprove: () => void;
  onDeny: () => void;
  onDismiss: () => void;
}

export default function ApprovalNotification({
  timeLeft,
  onApprove,
  onDeny,
  onDismiss,
}: ApprovalNotificationProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm animate-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">Approval Request</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Someone is requesting to add items to this table&apos;s order.
          </p>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeLeft}s remaining</span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDeny}
        >
          <XCircle className="w-3 h-3 mr-1" />
          Deny
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={onApprove}
        >
          <Check className="w-3 h-3 mr-1" />
          Approve
        </Button>
      </div>
    </div>
  );
}

