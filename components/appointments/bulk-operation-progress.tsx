'use client';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';

interface BulkOperationResult {
  appointmentId: string;
  clientName: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message?: string;
  originalTime?: Date;
  newTime?: Date;
}

interface BulkOperationProgressProps {
  isOpen: boolean;
  operation: 'cancel' | 'status_update' | 'reschedule';
  results: BulkOperationResult[];
  totalCount: number;
  completedCount: number;
  onClose?: () => void;
}

export function BulkOperationProgress({
  isOpen,
  operation,
  results,
  totalCount,
  completedCount,
  onClose,
}: BulkOperationProgressProps) {
  const progressPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = completedCount === totalCount;

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  const getOperationTitle = () => {
    switch (operation) {
      case 'cancel':
        return 'Cancelling Appointments';
      case 'status_update':
        return 'Updating Appointment Status';
      case 'reschedule':
        return 'Rescheduling Appointments';
      default:
        return 'Processing Appointments';
    }
  };

  const getStatusIcon = (status: BulkOperationResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: BulkOperationResult['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Success
          </Badge>
        );
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Warning
          </Badge>
        );
      case 'pending':
        return <Badge variant="outline">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isComplete && <Loader2 className="h-5 w-5 animate-spin" />}
            {getOperationTitle()}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `Operation completed. ${successCount} successful, ${errorCount} failed, ${warningCount} warnings.`
              : `Processing ${completedCount} of ${totalCount} appointments...`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>
                {completedCount}/{totalCount}
              </span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>

          {/* Summary Stats */}
          {isComplete && (
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {successCount}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {errorCount}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {warningCount}
                </div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </div>
          )}

          {/* Results List */}
          <div>
            <h4 className="mb-2 font-medium">Operation Results</h4>
            <ScrollArea className="h-64 rounded-lg border">
              <div className="space-y-2 p-3">
                {results.map((result, index) => (
                  <div
                    key={result.appointmentId}
                    className="flex items-start gap-3 rounded-lg border bg-white p-3"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getStatusIcon(result.status)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="truncate font-medium">
                          {result.clientName}
                        </div>
                        {getStatusBadge(result.status)}
                      </div>

                      {result.message && (
                        <div className="mb-2 text-sm text-gray-600">
                          {result.message}
                        </div>
                      )}

                      {operation === 'reschedule' &&
                        result.originalTime &&
                        result.newTime && (
                          <div className="space-y-1 text-xs text-gray-500">
                            <div>
                              <span className="line-through">
                                {result.originalTime.toLocaleString()}
                              </span>
                            </div>
                            <div className="font-medium text-green-600">
                              → {result.newTime.toLocaleString()}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ))}

                {/* Show pending items */}
                {Array.from(
                  { length: totalCount - results.length },
                  (_, index) => (
                    <div
                      key={`pending-${index}`}
                      className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3 opacity-50"
                    >
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-500">
                          Appointment {results.length + index + 1}
                        </div>
                        <div className="text-sm text-gray-400">
                          Waiting to process...
                        </div>
                      </div>
                      <Badge variant="outline" className="text-gray-400">
                        Pending
                      </Badge>
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Error Summary */}
          {errorCount > 0 && isComplete && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-red-800">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">
                  {errorCount} appointment{errorCount > 1 ? 's' : ''} failed to
                  process
                </span>
              </div>
              <div className="text-sm text-red-700">
                Please review the failed items and try again, or contact support
                if the issue persists.
              </div>
            </div>
          )}

          {/* Success Message */}
          {isComplete && errorCount === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">
                  All appointments processed successfully!
                </span>
              </div>
            </div>
          )}
        </div>

        {isComplete && onClose && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
