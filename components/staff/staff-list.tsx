'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StaffWithRelations } from '@/types/database';
import type { EmploymentType } from '@prisma/client';
import {
    Calendar,
    Edit,
    Mail,
    MoreHorizontal,
    Search,
    Trash2,
    TrendingUp,
    UserPlus
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
    const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [employmentFilter, setEmploymentFilter] = useState<EmploymentType | 'ALL'>('ALL');
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
                url: `/api/staff?${params}`
            });

            const response = await fetch(`/api/staff?${params}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('StaffList Debug: API Error:', response.status, errorText);
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
        if (!confirm('Are you sure you want to deactivate this staff member?')) return;

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
            alert(error instanceof Error ? error.message : 'Failed to deactivate staff');
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
            alert(error instanceof Error ? error.message : 'Failed to cancel invitation');
        }
    };

    const filteredStaff = staff.filter(member =>
        member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getEmploymentBadgeColor = (type: EmploymentType) => {
        switch (type) {
            case 'COMMISSION':
                return 'bg-blue-500 text-white font-medium';
            case 'CHAIR_RENTAL':
                return 'bg-green-500 text-white font-medium';
            case 'HYBRID':
                return 'bg-purple-500 text-white font-medium';
            default:
                return 'bg-gray-500 text-white font-medium';
        }
    };

    const getEmploymentDisplay = (member: StaffMember) => {
        switch (member.employmentType) {
            case 'COMMISSION':
                return `${member.commissionRate}% Commission`;
            case 'CHAIR_RENTAL':
                return `$${member.chairRentalAmount}/${member.chairRentalPeriod?.toLowerCase()}`;
            case 'HYBRID':
                return `${member.commissionRate}% + $${member.chairRentalAmount}/${member.chairRentalPeriod?.toLowerCase()}`;
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
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header and Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
                    <p className="text-gray-600">Manage your team members and their employment settings</p>
                </div>
                <Button onClick={() => setInviteDialogOpen(true)} className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Invite Staff
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search staff members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={employmentFilter} onValueChange={(value: EmploymentType | 'ALL') => setEmploymentFilter(value)}>
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
                    variant={showInactive ? "default" : "outline"}
                    onClick={() => setShowInactive(!showInactive)}
                    className="w-full sm:w-auto"
                >
                    {showInactive ? 'Hide Inactive' : 'Show Inactive'}
                </Button>
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Pending Invitations ({pendingInvitations.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingInvitations.map((invitation) => (
                            <Card key={invitation.id} className="border-orange-200 bg-orange-50">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Mail className="w-4 h-4 text-orange-600" />
                                                <span className="font-medium text-gray-900">
                                                    {invitation.staffData?.displayName || 'Staff Member'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 mb-1">{invitation.email}</p>
                                            <p className="text-xs text-gray-600">
                                                Role: {invitation.role} •
                                                Sent: {new Date(invitation.createdAt).toLocaleDateString()}
                                            </p>
                                            {invitation.staffData?.employmentType && (
                                                <div className="mt-2">
                                                    <Badge className="text-xs bg-orange-500 text-white">
                                                        {invitation.staffData.employmentType.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCancelInvitation(invitation.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                {filteredStaff.map((member) => (
                    <Card key={member.id} className={`transition-all hover:shadow-lg border-0 shadow-md ${!member.isActive ? 'opacity-60' : ''}`}>
                        <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-4">
                                    <Avatar className="w-14 h-14 ring-2 ring-gray-100">
                                        <AvatarImage src={member.avatar || member.user.image || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                            {getInitials(member.displayName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-xl font-bold text-gray-900">{member.displayName}</CardTitle>
                                        {member.title && (
                                            <p className="text-sm font-medium text-gray-600 mt-1">{member.title}</p>
                                        )}
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setEditingStaff(member)}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => window.open(`mailto:${member.user.email}`)}>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Send Email
                                        </DropdownMenuItem>
                                        {member.isActive && (
                                            <DropdownMenuItem
                                                onClick={() => handleDeactivateStaff(member.id)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Deactivate
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Employment Info */}
                            <div className="space-y-3">
                                <Badge className={`${getEmploymentBadgeColor(member.employmentType)} px-3 py-1 text-xs uppercase tracking-wide`}>
                                    {member.employmentType.replace('_', ' ')}
                                </Badge>
                                <p className="text-base font-semibold text-gray-800">
                                    {getEmploymentDisplay(member)}
                                </p>
                            </div>

                            {/* Performance Metrics */}
                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        Appointments
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{member._count.appointments}</p>
                                    <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                        Performance
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {member.paymentCalculations.length > 0 ? 'Active' : 'New'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {member.paymentCalculations.length} periods
                                    </p>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <span className="text-sm font-medium text-gray-700">Status</span>
                                <Badge
                                    className={member.isActive
                                        ? "bg-green-500 hover:bg-green-500 text-white font-medium border-0"
                                        : "bg-gray-400 hover:bg-gray-400 text-white font-medium border-0"
                                    }
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
                    <CardContent className="text-center py-12">
                        <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No staff members found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || employmentFilter !== 'ALL'
                                ? 'Try adjusting your search or filters'
                                : 'Get started by inviting your first team member'
                            }
                        </p>
                        {!searchTerm && employmentFilter === 'ALL' && (
                            <Button onClick={() => setInviteDialogOpen(true)}>
                                <UserPlus className="w-4 h-4 mr-2" />
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
                    onOpenChange={(open) => !open && setEditingStaff(null)}
                    onSuccess={handleStaffUpdate}
                />
            )}
        </div>
    );
}