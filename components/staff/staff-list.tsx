'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { StaffWithRelations } from '@/types/database';
import type { EmploymentType } from '@prisma/client';
import {
  Calendar,
  CheckCircle,
  Edit,
  Mail,
  MoreHorizontal,
  Search,
  Trash2,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { StaffEditDialog } from './staff-edit-dialog';
import { StaffInviteDialog } from './staff-invite-dialog';

interface StaffListProps {
  businessId: string;
  onStaffUpdate?: () => void;
}

interface StaffMember extends StaffWithRelations {
  _count: {
    appointments: number;
  };
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  staffData: any;
  createdAt: string;
  expiresAt: string;
}

export function StaffList({ businessId, onStaffUpdate }: StaffListProps) {
  console.log('StaffList Component: Rendered with businessId:', businessId);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState<
    EmploymentType | 'ALL'
  >('ALL');
  const [showInactive, setShowInactive] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        businessId,
        includeInactive: showInactive.toString(),
      });

      if (employmentFilter !== 'ALL') {
        params.append('employmentType', employmentFilter);
      }

      console.log('StaffList Debug: Fetching staff with params:', {
        businessId,
        includeInactive: showInactive,
        employmentFilter,
        url: `/api/staff?${params}`,
      });

      const response = await fetch(`/api/staff?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          'StaffList Debug: API Error:',
          response.status,
          errorText
        );
        throw new Error(`Failed to fetch staff: ${response.status}`);
      }

      const data = await response.json();
      console.log('StaffList Debug: Received data:', data);
      setStaff(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const params = new URLSearchParams({ businessId });
      const response = await fetch(`/api/staff/invitations?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = await response.json();
      setPendingInvitations(data.invitations || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      setPendingInvitations([]);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchPendingInvitations();
  }, [businessId, showInactive, employmentFilter]);

  const handleStaffUpdate = () => {
    fetchStaff();
    fetchPendingInvitations();
    onStaffUpdate?.();
  };

  const handleDeactivateStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to deactivate this staff member?'))
      return;

    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate staff');
      }

      handleStaffUpdate();
    } catch (error) {
      console.error('Error deactivating staff:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to deactivate staff'
      );
    }
  };

  const handleReactivateStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to reactivate this staff member?'))
      return;

    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reactivate staff');
      }

      handleStaffUpdate();
    } catch (error) {
      console.error('Error reactivating staff:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to reactivate staff'
      );
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      const response = await fetch('/api/staff/invitations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel invitation');
      }

      fetchPendingInvitations(); // Refresh the invitations list
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to cancel invitation'
      );
    }
  };

  const filteredStaff = staff.filter(
    member =>
      member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmploymentBadgeVariant = (type: EmploymentType) => {
    switch (type) {
      case 'COMMISSION':
        return 'default'; // Blue variant
      case 'CHAIR_RENTAL':
        return 'secondary'; // Green variant  
      case 'HYBRID':
        return 'outline'; // Purple variant
      default:
        return 'secondary';
    }
  };

  const getEmploymentDisplay = (member: StaffMember) => {
    switch (member.employmentType) {
      case 'COMMISSION':
        return `${member.commissionRate}% Commission`;
      case 'CHAIR_RENTAL':
        return `$${member.chairRentalAmount}/${member.chairRentalPeriod?.toLowerCase()}`;
      case 'HYBRID':
        return `${member.commissionRate}% + $${member.baseSalary}`;
      default:
        return member.employmentType;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-0 shadow-md animate-pulse">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 rounded-full bg-neutral-200 dark:bg-neutral-700 ring-2 ring-neutral-100 dark:ring-neutral-800"></div>
                  <div className="space-y-2">
                    <div className="h-5 w-24 rounded bg-neutral-200 dark:bg-neutral-700"></div>
                    <div className="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-700"></div>
                  </div>
                </div>
                <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-700"></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="h-6 w-20 rounded bg-neutral-200 dark:bg-neutral-700"></div>
                <div className="h-5 w-32 rounded bg-neutral-200 dark:bg-neutral-700"></div>
              </div>
              <div className="grid grid-cols-2 gap-6 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <div className="text-center space-y-2">
                  <div className="h-4 w-20 mx-auto rounded bg-neutral-200 dark:bg-neutral-700"></div>
                  <div className="h-8 w-12 mx-auto rounded bg-neutral-200 dark:bg-neutral-700"></div>
                  <div className="h-3 w-16 mx-auto rounded bg-neutral-200 dark:bg-neutral-700"></div>
                </div>
                <div className="text-center space-y-2">
                  <div className="h-4 w-20 mx-auto rounded bg-neutral-200 dark:bg-neutral-700"></div>
                  <div className="h-8 w-12 mx-auto rounded bg-neutral-200 dark:bg-neutral-700"></div>
                  <div className="h-3 w-16 mx-auto rounded bg-neutral-200 dark:bg-neutral-700"></div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <div className="h-4 w-12 rounded bg-neutral-200 dark:bg-neutral-700"></div>
                <div className="h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-700"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          {/* Header removed - now handled by parent component */}
        </div>
        <Button
          onClick={() => setInviteDialogOpen(true)}
          variant="primary"
          icon={<UserPlus className="h-4 w-4" />}
        >
          Invite Staff
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search staff members..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={employmentFilter}
          onValueChange={(value: EmploymentType | 'ALL') =>
            setEmploymentFilter(value)
          }
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Employment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="COMMISSION">Commission</SelectItem>
            <SelectItem value="CHAIR_RENTAL">Chair Rental</SelectItem>
            <SelectItem value="HYBRID">Hybrid</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? 'default' : 'outline'}
          onClick={() => setShowInactive(!showInactive)}
          className="w-full sm:w-auto"
        >
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </Button>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Pending Invitations ({pendingInvitations.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingInvitations.map(invitation => (
              <Card
                key={invitation.id}
                className="border-orange-200 bg-orange-50"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-gray-900">
                          {invitation.staffData?.displayName || 'Staff Member'}
                        </span>
                      </div>
                      <p className="mb-1 text-sm text-gray-700">
                        {invitation.email}
                      </p>
                      <p className="text-xs text-gray-600">
                        Role: {invitation.role} • Sent:{' '}
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                      {invitation.staffData?.employmentType && (
                        <div className="mt-2">
                          <Badge className="bg-orange-500 text-xs text-white">
                            {invitation.staffData.employmentType.replace(
                              '_',
                              ' '
                            )}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Staff Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredStaff.map(member => (
          <Card
            key={member.id}
            className={`border-0 shadow-md transition-all hover:shadow-lg ${!member.isActive ? 'opacity-60' : ''}`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-14 w-14 ring-2 ring-gray-100">
                    <AvatarImage
                      src={member.avatar || member.user.image || undefined}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white">
                      {getInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {member.displayName}
                    </CardTitle>
                    {member.title && (
                      <p className="mt-1 text-sm font-medium text-gray-600">
                        {member.title}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingStaff(member)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => window.open(`mailto:${member.user.email}`)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </DropdownMenuItem>
                    {member.isActive ? (
                      <DropdownMenuItem
                        onClick={() => handleDeactivateStaff(member.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleReactivateStaff(member.id)}
                        className="text-green-600"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Reactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Employment Info */}
              <div className="space-y-3">
                <Badge
                  variant={getEmploymentBadgeVariant(member.employmentType)}
                  className="px-3 py-1 text-xs uppercase tracking-wide font-medium"
                >
                  {member.employmentType.replace('_', ' ')}
                </Badge>
                <p className="text-base font-semibold text-gray-800">
                  {getEmploymentDisplay(member)}
                </p>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-4">
                <div className="text-center">
                  <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Appointments
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {member._count.appointments}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Last 30 days</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Performance
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {member.paymentCalculations.length > 0 ? 'Active' : 'New'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {member.paymentCalculations.length} periods
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm font-medium text-gray-700">
                  Status
                </span>
                <Badge
                  variant={member.isActive ? 'default' : 'secondary'}
                  className={cn(
                    'font-medium',
                    member.isActive
                      ? 'bg-green-500 text-white hover:bg-green-500'
                      : 'bg-neutral-400 text-white hover:bg-neutral-400'
                  )}
                >
                  {member.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              No staff members found
            </h3>
            <p className="mb-4 text-gray-600">
              {searchTerm || employmentFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Get started by inviting your first team member'}
            </p>
            {!searchTerm && employmentFilter === 'ALL' && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Staff Member
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <StaffInviteDialog
        businessId={businessId}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={handleStaffUpdate}
      />

      {editingStaff && (
        <StaffEditDialog
          staff={editingStaff}
          open={!!editingStaff}
          onOpenChange={open => !open && setEditingStaff(null)}
          onSuccess={handleStaffUpdate}
        />
      )}
    </div>
  );
}
