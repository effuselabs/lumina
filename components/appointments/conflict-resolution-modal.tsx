/**
 * Conflict Resolution Modal Component
 *
 * Modal for resolving conflicts between local and server appointment data
 * when concurrent editing occurs.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ConflictResolution } from '@/lib/services/real-time-sync-service';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { format } from 'date-fns';
import { AlertTriangle, Clock, FileText, User } from 'lucide-react';
import { useState } from 'react';

export interface ConflictResolutionModalProps {
  conflict: ConflictResolution | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (
    conflictId: string,
    resolution: ConflictResolution['resolution']
  ) => void;
}

export function ConflictResolutionModal({
  conflict,
  isOpen,
  onClose,
  onResolve,
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] =
    useState<ConflictResolution['resolution']>('manual');

  if (!conflict) return null;

  /**
   * Handle resolution selection
   */
  const handleResolve = () => {
    onResolve(conflict.conflictId, selectedResolution);
    onClose();
  };

  /**
   * Get field display value
   */
  const getFieldDisplay = (
    appointment: DashboardAppointment,
    field: keyof DashboardAppointment
  ) => {
    const value = appointment[field];

    switch (field) {
      case 'startTime':
      case 'endTime':
        return value
          ? format(new Date(value as string), 'MMM d, yyyy h:mm a')
          : 'Not set';
      case 'totalPrice':
        return value ? `$${(value as number).toFixed(2)}` : '$0.00';
      case 'totalDuration':
        return value ? `${value} minutes` : '0 minutes';
      case 'status':
        return (
          <Badge variant={getStatusVariant(value as string)}>
            {value as string}
          </Badge>
        );
      case 'services':
        const services = value as any[];
        return services?.map(s => s.name).join(', ') || 'No services';
      default:
        return String(value || 'Not set');
    }
  };

  /**
   * Get status badge variant
   */
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'no_show':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  /**
   * Get conflicting fields
   */
  const getConflictingFields = (): Array<keyof DashboardAppointment> => {
    const fields: Array<keyof DashboardAppointment> = [];
    const compareFields: Array<keyof DashboardAppointment> = [
      'startTime',
      'endTime',
      'status',
      'totalPrice',
      'totalDuration',
      'notes',
      'services',
    ];

    compareFields.forEach(field => {
      const localValue = conflict.localVersion[field];
      const serverValue = conflict.serverVersion[field];

      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        fields.push(field);
      }
    });

    return fields;
  };

  const conflictingFields = getConflictingFields();
  const isDeleteConflict = !conflict.serverVersion.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Appointment Conflict Detected
          </DialogTitle>
          <DialogDescription>
            {isDeleteConflict
              ? 'This appointment was deleted on the server but has local changes.'
              : 'This appointment was modified by another user while you were editing it.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-6">
            {/* Appointment Info */}
            <div className="space-y-2">
              <h3 className="font-medium">Appointment Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Client:</span>
                  <span className="ml-2">
                    {conflict.localVersion.client?.firstName}{' '}
                    {conflict.localVersion.client?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Staff:</span>
                  <span className="ml-2">
                    {conflict.localVersion.staff?.displayName}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {isDeleteConflict ? (
              /* Delete Conflict */
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h4 className="mb-2 font-medium text-red-800">
                    Deletion Conflict
                  </h4>
                  <p className="text-sm text-red-700">
                    This appointment was deleted on the server, but you have
                    unsaved local changes.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Your Local Changes</h4>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    {conflictingFields.map(field => (
                      <div key={field} className="flex justify-between py-1">
                        <span className="font-medium capitalize">
                          {field.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                        </span>
                        <span>
                          {getFieldDisplay(conflict.localVersion, field)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Update Conflict */
              <div className="space-y-4">
                <h3 className="font-medium">Conflicting Changes</h3>

                {conflictingFields.length > 0 ? (
                  <div className="space-y-4">
                    {conflictingFields.map(field => (
                      <div key={field} className="rounded-lg border p-4">
                        <h4 className="mb-3 font-medium capitalize">
                          {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Your Version */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              <span className="font-medium text-blue-700">
                                Your Version
                              </span>
                            </div>
                            <div className="rounded border border-blue-200 bg-blue-50 p-3">
                              {getFieldDisplay(conflict.localVersion, field)}
                            </div>
                          </div>

                          {/* Server Version */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-green-500" />
                              <span className="font-medium text-green-700">
                                Server Version
                              </span>
                            </div>
                            <div className="rounded border border-green-200 bg-green-50 p-3">
                              {getFieldDisplay(conflict.serverVersion, field)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No conflicting fields detected</p>
                  </div>
                )}

                {/* Merged Version Preview */}
                {conflict.mergedData && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Suggested Merge</h4>
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <p className="mb-2 text-sm text-purple-700">
                        Automatically merged compatible changes:
                      </p>
                      {conflictingFields.map(field => (
                        <div key={field} className="flex justify-between py-1">
                          <span className="font-medium capitalize">
                            {field.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                          </span>
                          <span>
                            {getFieldDisplay(conflict.mergedData!, field)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-4">
          {/* Resolution Options */}
          <div className="w-full space-y-3">
            <h4 className="font-medium">Choose Resolution</h4>
            <div className="grid grid-cols-1 gap-2">
              {!isDeleteConflict && (
                <>
                  <label className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="resolution"
                      value="accept_server"
                      checked={selectedResolution === 'accept_server'}
                      onChange={e =>
                        setSelectedResolution(
                          e.target.value as ConflictResolution['resolution']
                        )
                      }
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">Accept Server Version</div>
                      <div className="text-sm text-muted-foreground">
                        Discard your changes and use the server version
                      </div>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="resolution"
                      value="accept_local"
                      checked={selectedResolution === 'accept_local'}
                      onChange={e =>
                        setSelectedResolution(
                          e.target.value as ConflictResolution['resolution']
                        )
                      }
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">Keep Your Version</div>
                      <div className="text-sm text-muted-foreground">
                        Override server changes with your version
                      </div>
                    </div>
                  </label>

                  {conflict.mergedData && (
                    <label className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                      <input
                        type="radio"
                        name="resolution"
                        value="merge"
                        checked={selectedResolution === 'merge'}
                        onChange={e =>
                          setSelectedResolution(
                            e.target.value as ConflictResolution['resolution']
                          )
                        }
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-medium">Use Merged Version</div>
                        <div className="text-sm text-muted-foreground">
                          Apply automatically merged changes
                        </div>
                      </div>
                    </label>
                  )}
                </>
              )}

              {isDeleteConflict && (
                <>
                  <label className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="resolution"
                      value="accept_server"
                      checked={selectedResolution === 'accept_server'}
                      onChange={e =>
                        setSelectedResolution(
                          e.target.value as ConflictResolution['resolution']
                        )
                      }
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">Accept Deletion</div>
                      <div className="text-sm text-muted-foreground">
                        Discard your changes and remove the appointment
                      </div>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="resolution"
                      value="accept_local"
                      checked={selectedResolution === 'accept_local'}
                      onChange={e =>
                        setSelectedResolution(
                          e.target.value as ConflictResolution['resolution']
                        )
                      }
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">Restore Appointment</div>
                      <div className="text-sm text-muted-foreground">
                        Recreate the appointment with your changes
                      </div>
                    </div>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>Resolve Conflict</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
