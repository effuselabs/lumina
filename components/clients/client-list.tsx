'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Edit,
    Filter,
    Mail,
    MoreHorizontal,
    Phone,
    Search,
    Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Staff {
    id: string;
    displayName: string;
}

interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    preferredStaff?: string;
    appointmentCount: number;
    lastAppointment?: {
        startTime: string;
        staff: {
            displayName: string;
        };
        services: Array<{
            service: {
                name: string;
            };
        }>;
    };
    createdAt: string;
}

interface ClientListProps {
    onEditClient?: (client: Client) => void;
    onDeleteClient?: (client: Client) => void;
}

export function ClientList({ onEditClient, onDeleteClient }: ClientListProps) {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStaff, setSelectedStaff] = useState('');
    const [sortBy, setSortBy] = useState('firstName');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const loadClients = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '20',
                sortBy,
                sortOrder,
            });

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            if (selectedStaff) {
                params.append('staffId', selectedStaff);
            }

            const response = await fetch(`/api/clients?${params}`);
            if (response.ok) {
                const data = await response.json();
                setClients(data.clients);
                setTotalPages(data.pagination.totalPages);
                setTotalCount(data.pagination.totalCount);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchTerm, selectedStaff, sortBy, sortOrder]);

    const loadStaff = useCallback(async () => {
        try {
            const response = await fetch('/api/staff');
            if (response.ok) {
                const data = await response.json();
                setStaff(data.staff || []);
            }
        } catch (error) {
            console.error('Error loading staff:', error);
        }
    }, []);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    // Reset to first page when search/filter changes
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [searchTerm, selectedStaff]);

    // Sorting is handled via the select dropdown
    // const handleSort = (field: string) => {
    //     if (sortBy === field) {
    //         setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    //     } else {
    //         setSortBy(field);
    //         setSortOrder('asc');
    //     }
    // };

    const handleDeleteClient = async (client: Client) => {
        if (!confirm(`Are you sure you want to delete ${client.firstName} ${client.lastName}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/clients/${client.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                loadClients();
                if (onDeleteClient) {
                    onDeleteClient(client);
                }
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete client');
            }
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Failed to delete client');
        }
    };

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const getPreferredStaffName = (staffId?: string) => {
        if (!staffId) return 'No preference';
        const staffMember = staff.find(s => s.id === staffId);
        return staffMember?.displayName || 'Unknown';
    };

    if (isLoading && clients.length === 0) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    <div className="h-10 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search clients by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex gap-2">
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                        <SelectTrigger className="w-48">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Filter by staff" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All staff</SelectItem>
                            {staff.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                    {member.displayName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                        const [field, order] = value.split('-');
                        setSortBy(field);
                        setSortOrder(order as 'asc' | 'desc');
                    }}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="firstName-asc">First Name A-Z</SelectItem>
                            <SelectItem value="firstName-desc">First Name Z-A</SelectItem>
                            <SelectItem value="lastName-asc">Last Name A-Z</SelectItem>
                            <SelectItem value="lastName-desc">Last Name Z-A</SelectItem>
                            <SelectItem value="createdAt-desc">Newest First</SelectItem>
                            <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                    Showing {clients.length} of {totalCount} clients
                </span>
                {(searchTerm || selectedStaff) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedStaff('');
                        }}
                    >
                        Clear filters
                    </Button>
                )}
            </div>

            {/* Client Table */}
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Preferred Staff</TableHead>
                            <TableHead>Appointments</TableHead>
                            <TableHead>Last Visit</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.map((client) => (
                            <TableRow key={client.id} className="hover:bg-gray-50">
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                                                {getInitials(client.firstName, client.lastName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {client.firstName} {client.lastName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Client since {new Date(client.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        {client.email && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Mail className="mr-2 h-3 w-3" />
                                                {client.email}
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Phone className="mr-2 h-3 w-3" />
                                                {client.phone}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-gray-600">
                                        {getPreferredStaffName(client.preferredStaff)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">
                                        {client.appointmentCount} appointment{client.appointmentCount !== 1 ? 's' : ''}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {client.lastAppointment ? (
                                        <div className="text-sm">
                                            <div className="text-gray-900">
                                                {formatDistanceToNow(new Date(client.lastAppointment.startTime), { addSuffix: true })}
                                            </div>
                                            <div className="text-gray-500">
                                                {client.lastAppointment.services.map(s => s.service.name).join(', ')}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-500">No visits yet</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => router.push(`/clients/${client.id}`)}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onEditClient ? onEditClient(client) : router.push(`/clients/${client.id}/edit`)}
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Client
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteClient(client)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Client
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {clients.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                        <div className="text-gray-500">
                            {searchTerm || selectedStaff ? 'No clients match your search criteria' : 'No clients found'}
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}