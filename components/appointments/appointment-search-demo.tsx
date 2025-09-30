'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Info } from 'lucide-react';
import { useState } from 'react';

import { useAppointmentSearch, useSearchHistory } from '@/hooks/use-appointment-search';
import { Service, StaffMember } from '@/types/appointment-filters';
import { AppointmentStatus, DashboardAppointment } from '@/types/dashboard-appointments';
import { SearchFilters } from './search-filters';
import { SearchResults, SearchStats } from './search-results';

// Mock data for demonstration
const mockStaffMembers: StaffMember[] = [
    { id: '1', firstName: 'Sarah', lastName: 'Johnson', displayName: 'Sarah J.', color: '#FF6B6B', isActive: true },
    { id: '2', firstName: 'Mike', lastName: 'Chen', displayName: 'Mike C.', color: '#4ECDC4', isActive: true },
    { id: '3', firstName: 'Emma', lastName: 'Davis', displayName: 'Emma D.', color: '#45B7D1', isActive: true },
    { id: '4', firstName: 'Alex', lastName: 'Wilson', displayName: 'Alex W.', color: '#96CEB4', isActive: true },
];

const mockServices: Service[] = [
    { id: '1', name: 'Haircut & Style', category: 'Hair', duration: 60, price: 6500, isActive: true },
    { id: '2', name: 'Hair Color', category: 'Hair', duration: 120, price: 12000, isActive: true },
    { id: '3', name: 'Highlights', category: 'Hair', duration: 180, price: 15000, isActive: true },
    { id: '4', name: 'Manicure', category: 'Nails', duration: 45, price: 3500, isActive: true },
    { id: '5', name: 'Pedicure', category: 'Nails', duration: 60, price: 4500, isActive: true },
    { id: '6', name: 'Facial', category: 'Skincare', duration: 90, price: 8500, isActive: true },
];

// Generate mock appointments
const generateMockAppointments = (): DashboardAppointment[] => {
    const appointments: DashboardAppointment[] = [];
    const statuses = Object.values(AppointmentStatus);

    for (let i = 0; i < 50; i++) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + Math.floor(Math.random() * 30) - 15); // ±15 days
        startTime.setHours(9 + Math.floor(Math.random() * 8)); // 9 AM - 5 PM
        startTime.setMinutes(Math.floor(Math.random() * 4) * 15); // 15-minute intervals

        const staff = mockStaffMembers[Math.floor(Math.random() * mockStaffMembers.length)];
        const service = mockServices[Math.floor(Math.random() * mockServices.length)];
        const endTime = new Date(startTime.getTime() + service.duration * 60000);

        appointments.push({
            id: `apt-${i + 1}`,
            businessId: 'business-1',
            clientId: `client-${i + 1}`,
            staffId: staff.id,
            startTime,
            endTime,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            services: [{ id: service.id, name: service.name, duration: service.duration, price: service.price }],
            totalPrice: service.price,
            totalDuration: service.duration,
            notes: Math.random() > 0.7 ? `Notes for appointment ${i + 1}` : undefined,
            client: {
                id: `client-${i + 1}`,
                firstName: ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'][Math.floor(Math.random() * 6)],
                lastName: ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Miller'][Math.floor(Math.random() * 6)],
                email: `client${i + 1}@example.com`,
                phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                avatar: undefined
            },
            staff: {
                id: staff.id,
                firstName: staff.firstName,
                lastName: staff.lastName,
                displayName: staff.displayName,
                color: staff.color
            },
            isConflicted: Math.random() > 0.9,
            canEdit: true,
            canCancel: true,
            canReschedule: true,
            lastUpdated: new Date(),
            updatedBy: undefined
        });
    }

    return appointments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
};

export function AppointmentSearchDemo() {
    const [selectedAppointment, setSelectedAppointment] = useState<DashboardAppointment | null>(null);
    const mockAppointments = generateMockAppointments();

    const {
        filters,
        searchResult,
        isLoading,
        error,
        updateFilters,
        setFilters,
        clearFilters,
        hasActiveFilters,
        filterValidation
    } = useAppointmentSearch({
        appointments: mockAppointments,
        maxResults: 50
    });

    const { searchHistory, addToHistory } = useSearchHistory();

    // Handle filter changes and add to history
    const handleFilterChange = (newFilters: any) => {
        updateFilters(newFilters);
        addToHistory(newFilters);
    };

    const handleAppointmentClick = (appointment: DashboardAppointment) => {
        setSelectedAppointment(appointment);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Appointment Search & Filter System</CardTitle>
                </CardHeader>
                <CardContent>
                    <SearchFilters
                        onFilterChange={handleFilterChange}
                        staffMembers={mockStaffMembers}
                        services={mockServices}
                        initialFilters={filters}
                    />
                </CardContent>
            </Card>

            {/* Filter Validation Alerts */}
            {filterValidation.errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {filterValidation.errors.join(', ')}
                    </AlertDescription>
                </Alert>
            )}

            {filterValidation.warnings.length > 0 && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        {filterValidation.warnings.join(', ')}
                    </AlertDescription>
                </Alert>
            )}

            {/* Search Results */}
            <Tabs defaultValue="results" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="results">
                        Search Results
                        {hasActiveFilters && (
                            <Badge variant="secondary" className="ml-2">
                                {searchResult.totalCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                    <TabsTrigger value="history">Search History</TabsTrigger>
                </TabsList>

                <TabsContent value="results">
                    <Card>
                        <CardContent className="p-6">
                            {error ? (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            ) : (
                                <SearchResults
                                    appointments={mockAppointments}
                                    filters={filters}
                                    onAppointmentClick={handleAppointmentClick}
                                    onClearFilters={clearFilters}
                                    showStats={true}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stats">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SearchStats searchResult={searchResult} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {searchHistory.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No search history yet. Perform some searches to see them here.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {searchHistory.map((historyFilters, index) => (
                                        <div
                                            key={index}
                                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                                            onClick={() => setFilters(historyFilters)}
                                        >
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {historyFilters.searchTerm && (
                                                    <Badge variant="outline">
                                                        Search: "{historyFilters.searchTerm}"
                                                    </Badge>
                                                )}
                                                {historyFilters.staffIds?.length && (
                                                    <Badge variant="outline">
                                                        Staff: {historyFilters.staffIds.length}
                                                    </Badge>
                                                )}
                                                {historyFilters.serviceIds?.length && (
                                                    <Badge variant="outline">
                                                        Services: {historyFilters.serviceIds.length}
                                                    </Badge>
                                                )}
                                                {historyFilters.status?.length && (
                                                    <Badge variant="outline">
                                                        Status: {historyFilters.status.length}
                                                    </Badge>
                                                )}
                                                {historyFilters.dateRange && (
                                                    <Badge variant="outline">Date Range</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Selected Appointment Details */}
            {selectedAppointment && (
                <Card>
                    <CardHeader>
                        <CardTitle>Selected Appointment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium">Client</h4>
                                <p>{selectedAppointment.client.firstName} {selectedAppointment.client.lastName}</p>
                                <p className="text-sm text-muted-foreground">{selectedAppointment.client.email}</p>
                            </div>
                            <div>
                                <h4 className="font-medium">Staff</h4>
                                <p>{selectedAppointment.staff.displayName}</p>
                            </div>
                            <div>
                                <h4 className="font-medium">Service</h4>
                                <p>{selectedAppointment.services.map(s => s.name).join(', ')}</p>
                            </div>
                            <div>
                                <h4 className="font-medium">Date & Time</h4>
                                <p>{selectedAppointment.startTime.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}