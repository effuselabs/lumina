'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Edit,
    Mail,
    MapPin,
    MoreHorizontal,
    Phone,
    User,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Appointment {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    notes?: string;
    staff: {
        id: string;
        displayName: string;
        avatar?: string;
    };
    services: Array<{
        serviceName: string;
        price: number;
        duration: number;
    }>;
    transactions: Array<{
        amount: number;
        paymentMethod?: string;
        status: string;
    }>;
}

interface ClientDetail {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    preferredStaff?: string;
    notes?: string;
    emailMarketing: boolean;
    smsMarketing: boolean;
    appointmentCount: number;
    appointments: Appointment[];
    createdAt: string;
    updatedAt: string;
}

interface Staff {
    id: string;
    displayName: string;
}

interface ClientDetailProps {
    clientId: string;
    onEdit?: () => void;
}

export function ClientDetail({ clientId, onEdit }: ClientDetailProps) {
    const [client, setClient] = useState<ClientDetail | null>(null);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadClient = async () => {
            try {
                const response = await fetch(`/api/clients/${clientId}`);
                if (response.ok) {
                    const data = await response.json();
                    setClient(data);
                }
            } catch (error) {
                console.error('Error loading client:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const loadStaff = async () => {
            try {
                const response = await fetch('/api/staff');
                if (response.ok) {
                    const data = await response.json();
                    setStaff(data.staff || []);
                }
            } catch (error) {
                console.error('Error loading staff:', error);
            }
        };

        loadClient();
        loadStaff();
    }, [clientId]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-64 bg-gray-200 rounded-lg"></div>
                        <div className="h-64 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500">Client not found</div>
            </div>
        );
    }

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const getPreferredStaffName = (staffId?: string) => {
        if (!staffId) return 'No preference';
        const staffMember = staff.find(s => s.id === staffId);
        return staffMember?.displayName || 'Unknown';
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'cancelled':
            case 'no_show':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'scheduled':
            case 'confirmed':
                return <Clock className="h-4 w-4 text-blue-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
            case 'no_show':
                return 'bg-red-100 text-red-800';
            case 'scheduled':
            case 'confirmed':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    const totalSpent = client.appointments
        .filter(apt => apt.status.toLowerCase() === 'completed')
        .reduce((total, apt) => {
            return total + apt.transactions.reduce((sum, txn) => sum + txn.amount, 0);
        }, 0);

    const fullAddress = [client.address, client.city, client.state, client.zipCode]
        .filter(Boolean)
        .join(', ');

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg">
                                    {getInitials(client.firstName, client.lastName)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {client.firstName} {client.lastName}
                                </h1>
                                <p className="text-gray-600">
                                    Client since {format(new Date(client.createdAt), 'MMMM d, yyyy')}
                                </p>
                                <div className="flex items-center space-x-4 mt-2">
                                    <Badge variant="secondary">
                                        {client.appointmentCount} appointment{client.appointmentCount !== 1 ? 's' : ''}
                                    </Badge>
                                    <Badge variant="outline">
                                        ${totalSpent.toFixed(2)} total spent
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <Button onClick={onEdit} className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Client
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <User className="mr-2 h-5 w-5" />
                            Contact Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {client.email && (
                            <div className="flex items-center space-x-3">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <div>
                                    <div className="text-sm font-medium">Email</div>
                                    <div className="text-sm text-gray-600">{client.email}</div>
                                </div>
                            </div>
                        )}

                        {client.phone && (
                            <div className="flex items-center space-x-3">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <div>
                                    <div className="text-sm font-medium">Phone</div>
                                    <div className="text-sm text-gray-600">{client.phone}</div>
                                </div>
                            </div>
                        )}

                        {fullAddress && (
                            <div className="flex items-start space-x-3">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium">Address</div>
                                    <div className="text-sm text-gray-600">{fullAddress}</div>
                                </div>
                            </div>
                        )}

                        <Separator />

                        <div>
                            <div className="text-sm font-medium mb-2">Preferences</div>
                            <div className="space-y-2">
                                <div className="text-sm text-gray-600">
                                    <strong>Preferred Staff:</strong> {getPreferredStaffName(client.preferredStaff)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <strong>Email Marketing:</strong> {client.emailMarketing ? 'Yes' : 'No'}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <strong>SMS Marketing:</strong> {client.smsMarketing ? 'Yes' : 'No'}
                                </div>
                            </div>
                        </div>

                        {client.notes && (
                            <>
                                <Separator />
                                <div>
                                    <div className="text-sm font-medium mb-2">Notes</div>
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                        {client.notes}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Appointment History */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Calendar className="mr-2 h-5 w-5" />
                            Appointment History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {client.appointments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No appointments yet
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date & Time</TableHead>
                                            <TableHead>Staff</TableHead>
                                            <TableHead>Services</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {client.appointments.map((appointment) => (
                                            <TableRow key={appointment.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">
                                                            {format(new Date(appointment.startTime), 'MMM d, yyyy')}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {format(new Date(appointment.startTime), 'h:mm a')} - {format(new Date(appointment.endTime), 'h:mm a')}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-xs">
                                                                {appointment.staff.displayName.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{appointment.staff.displayName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        {appointment.services.map((service, index) => (
                                                            <div key={index} className="text-sm">
                                                                <div className="font-medium">{service.serviceName}</div>
                                                                <div className="text-gray-500">
                                                                    {service.duration} min • ${service.price.toFixed(2)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        {getStatusIcon(appointment.status)}
                                                        <Badge className={getStatusColor(appointment.status)}>
                                                            {appointment.status.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        ${appointment.transactions.reduce((sum, txn) => sum + txn.amount, 0).toFixed(2)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                                <Calendar className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit Appointment
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}