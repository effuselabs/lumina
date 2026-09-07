'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { UndoOperation } from '@/lib/drag-drop-utils';
import { cn } from '@/lib/utils';
import { CheckCircle, Undo2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Undo Notification Component
 *
 * Displays a temporary notification with undo functionality
 * after appointment moves or reassignments.
 *
 * Requirements: 2.3, 7.3
 */

interface UndoNotificationProps {
  operation: UndoOperation | null;
  onUndo: () => Promise<void>;
  onDismiss: () => void;
  autoHideDelay?: number;
  className?: string;
}

export function UndoNotification({
  operation,
  onUndo,
  onDismiss,
  autoHideDelay = 8000,
  className,
}: UndoNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(autoHideDelay / 1000);

  useEffect(() => {
    if (operation) {
      setIsVisible(true);
      setTimeLeft(autoHideDelay / 1000);

      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      const countdownTimer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownTimer);
      };
    } else {
      setIsVisible(false);
      return undefined;
    }
  }, [operation, autoHideDelay]);

  const handleUndo = async () => {
    if (isUndoing) return;

    setIsUndoing(true);
    try {
      await onUndo();
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to undo operation:', error);
      // Keep notification visible on error
    } finally {
      setIsUndoing(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Allow fade out animation
  };

  if (!operation || !isVisible) {
    return null;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!operation || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-md transform transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        className
      )}
    >
      <Alert className="bg-color-background border-color-border shadow-lg">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="pr-16">
          <div className="space-y-2">
            <div className="font-medium">
              Appointment{' '}
              {operation.type === 'reassign' ? 'reassigned' : 'moved'}{' '}
              successfully
            </div>
            <div className="text-color-foreground-muted text-sm">
              {operation.description}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-color-foreground-muted text-xs">
                Auto-dismiss in {timeLeft}s
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={isUndoing}
                  className="h-7 px-2 text-xs"
                >
                  <Undo2 className="mr-1 h-3 w-3" />
                  {isUndoing ? 'Undoing...' : 'Undo'}
                </Button>
              </div>
            </div>
          </div>
        </AlertDescription>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="hover:bg-color-background-muted absolute right-2 top-2 rounded-full p-1 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress bar */}
        <div className="bg-color-background-muted absolute bottom-0 left-0 right-0 h-1 rounded-b">
          <div
            className="h-full rounded-b bg-lumina-coral transition-all duration-1000 ease-linear"
            style={{
              width: `${(timeLeft / (autoHideDelay / 1000)) * 100}%`,
            }}
          />
        </div>
      </Alert>
    </div>
  );
}

/**
 * Hook for managing undo notifications
 */
export function useUndoNotification() {
  const [currentOperation, setCurrentOperation] =
    useState<UndoOperation | null>(null);

  const showNotification = (operation: UndoOperation) => {
    setCurrentOperation(operation);
  };

  const hideNotification = () => {
    setCurrentOperation(null);
  };

  return {
    currentOperation,
    showNotification,
    hideNotification,
  };
}
