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

export function StaffList({ businessId, onStaffUpdate }: StaffListProps) {
    const [staff, setStaff] = useState<StaffMember[]>([]);
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

            const response = await fetch(`/api/staff?${params}`);
            if (!response.ok) throw new Error('Failed to fetch staff');

            const data = await response.json();
            setStaff(data.staff);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [businessId, showInactive, employmentFilter]);

    const handleStaffUpdate = () => {
        fetchStaff();
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

    const filteredStaff = staff.filter(member =>
        member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getEmploymentBadgeColor = (type: EmploymentType) => {
        switch (type) {
            case 'COMMISSION':
                return 'bg-blue-100 text-blue-800';
            case 'CHAIR_RENTAL':
                return 'bg-green-100 text-green-800';
            case 'HYBRID':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
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

            {/* Staff Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStaff.map((member) => (
                    <Card key={member.id} className={`${!member.isActive ? 'opacity-60' : ''}`}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={member.avatar || member.user.image || undefined} />
                                        <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-lg">{member.displayName}</CardTitle>
                                        {member.title && (
                                            <p className="text-sm text-gray-600">{member.title}</p>
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
                        <CardContent className="space-y-4">
                            {/* Employment Info */}
                            <div className="space-y-2">
                                <Badge className={getEmploymentBadgeColor(member.employmentType)}>
                                    {member.employmentType.replace('_', ' ')}
                                </Badge>
                                <p className="text-sm text-gray-600">
                                    {getEmploymentDisplay(member)}
                                </p>
                            </div>

                            {/* Performance Metrics */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                                        <Calendar className="w-3 h-3" />
                                        Appointments
                                    </div>
                                    <p className="font-semibold">{member._count.appointments}</p>
                                    <p className="text-xs text-gray-500">Last 30 days</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                                        <TrendingUp className="w-3 h-3" />
                                        Performance
                                    </div>
                                    <p className="font-semibold">
                                        {member.paymentCalculations.length > 0 ? 'Active' : 'New'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {member.paymentCalculations.length} periods
                                    </p>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between pt-2 border-t">
                                <span className="text-sm text-gray-600">Status</span>
                                <Badge variant={member.isActive ? "default" : "secondary"}>
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