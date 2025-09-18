'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar } from '@/components/ui/filter-bar';
import { LoadingCard } from '@/components/ui/loading-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  DollarSign,
  Edit,
  Heart,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Star,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  preferredStaff?: string;
  appointmentCount: number;
  totalSpent?: number;
  averageSpent?: number;
  lastAppointment?: {
    startTime: string;
    staff: { displayName: string };
    services: Array<{ service: { name: string } }>;
  };
  createdAt: string;
  status?: 'active' | 'inactive' | 'vip';
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface Staff {
  id: string;
  displayName: string;
}

interface ClientMetrics {
  totalClients: number;
  activeClients: number;
  newThisMonth: number;
  vipClients: number;
  averageLifetimeValue: number;
  retentionRate: number;
}

interface ComprehensiveClientManagementProps {
  businessId: string;
  businessSlug: string;
  onEditClient?: (client: Client) => void;
  onViewClient?: (client: Client) => void;
  onCreateClient?: () => void;
  onBookAppointment?: (client: Client) => void;
}

export function ComprehensiveClientManagement({
  businessId,
  businessSlug: _businessSlug,
  onEditClient: _onEditClient,
  onViewClient,
  onCreateClient,
  onBookAppointment,
}: ComprehensiveClientManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({
    status: 'all',
    staff: 'all',
    loyaltyTier: 'all',
  });

  const loadData = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    try {
      // Load clients with enhanced data
      const clientsResponse = await fetch(
        `/api/clients?businessId=${businessId}&enhanced=true`
      );
      if (false) {
        // Temporarily force test data
        const clientsData = await clientsResponse.json();
        setClients(clientsData.clients || []);
        setMetrics(clientsData.metrics || null);
      } else {
        // For development: Add some test data if API fails
        const testClients: Client[] = [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567',
            appointmentCount: 5,
            totalSpent: 250,
            createdAt: new Date().toISOString(),
            status: 'active',
            loyaltyTier: 'gold',
            preferredStaff: 'staff-1',
          },
          {
            id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '(555) 987-6543',
            appointmentCount: 12,
            totalSpent: 680,
            createdAt: new Date().toISOString(),
            status: 'vip',
            loyaltyTier: 'platinum',
            preferredStaff: 'staff-2',
          },
          {
            id: '3',
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@example.com',
            phone: '(555) 456-7890',
            appointmentCount: 2,
            totalSpent: 120,
            createdAt: new Date().toISOString(),
            status: 'inactive',
            loyaltyTier: 'bronze',
          },
        ];
        setClients(testClients);

        setMetrics({
          totalClients: 3,
          activeClients: 2,
          newThisMonth: 1,
          vipClients: 1,
          averageLifetimeValue: 350,
          retentionRate: 85,
        });
      }

      // Load staff for filtering
      const staffResponse = await fetch(`/api/staff?businessId=${businessId}`);
      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        setStaff(staffData.staff || []);
      } else {
        // Test staff data
        setStaff([
          { id: 'staff-1', displayName: 'Sarah Wilson' },
          { id: 'staff-2', displayName: 'Mike Chen' },
        ]);
      }
    } catch (_error) {
      // Error handling would go here
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filterOptions = [
    {
      key: 'search',
      label: 'Search',
      type: 'search' as const,
      placeholder: 'Search clients by name, email, or phone...',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'vip', label: 'VIP' },
      ],
    },
    {
      key: 'staff',
      label: 'Preferred Staff',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Staff' },
        ...staff.map(member => ({
          value: member.id,
          label: member.displayName,
        })),
      ],
    },
    {
      key: 'loyaltyTier',
      label: 'Loyalty Tier',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Tiers' },
        { value: 'bronze', label: 'Bronze' },
        { value: 'silver', label: 'Silver' },
        { value: 'gold', label: 'Gold' },
        { value: 'platinum', label: 'Platinum' },
      ],
    },
  ];

  const handleFilterChange = (key: string, value: unknown) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilterValues({
      status: 'all',
      staff: 'all',
      loyaltyTier: 'all',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'vip':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getLoyaltyIcon = (tier?: string) => {
    switch (tier) {
      case 'platinum':
        return <Star className="h-3 w-3 fill-current text-purple-500" />;
      case 'gold':
        return <Star className="h-3 w-3 fill-current text-yellow-500" />;
      case 'silver':
        return <Star className="h-3 w-3 fill-current text-gray-400" />;
      case 'bronze':
        return <Star className="h-3 w-3 fill-current text-orange-600" />;
      default:
        return null;
    }
  };

  // Filter clients based on current filter values
  const filteredClients = clients.filter(client => {
    const searchTerm = filterValues.search as string;
    const statusFilter = filterValues.status as string;
    const staffFilter = filterValues.staff as string;
    const loyaltyFilter = filterValues.loyaltyTier as string;

    // Search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        client.firstName.toLowerCase().includes(searchLower) ||
        client.lastName.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.includes(searchTerm);

      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter && statusFilter.trim() && statusFilter !== 'all') {
      if (client.status !== statusFilter) return false;
    }

    // Staff filter
    if (staffFilter && staffFilter.trim() && staffFilter !== 'all') {
      if (client.preferredStaff !== staffFilter) return false;
    }

    // Loyalty filter
    if (loyaltyFilter && loyaltyFilter.trim() && loyaltyFilter !== 'all') {
      if (client.loyaltyTier !== loyaltyFilter) return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="dashboard-stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} title lines={2} />
          ))}
        </div>
        <LoadingCard title lines={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Metrics */}
      {metrics && (
        <div className="dashboard-stats-grid">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lumina-primary text-sm font-medium">
                Total Clients
              </CardTitle>
              <Users className="h-4 w-4" style={{ color: '#ff7a5a' }} />
            </CardHeader>
            <CardContent>
              <div className="text-lumina-primary text-2xl font-bold">
                {metrics.totalClients}
              </div>
              <p className="text-xs" style={{ color: '#808285' }}>
                {metrics.activeClients} active
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lumina-primary text-sm font-medium">
                New This Month
              </CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: '#ff7a5a' }} />
            </CardHeader>
            <CardContent>
              <div className="text-lumina-primary text-2xl font-bold">
                {metrics.newThisMonth}
              </div>
              <p className="text-xs" style={{ color: '#808285' }}>
                +
                {Math.round(
                  (metrics.newThisMonth / metrics.totalClients) * 100
                )}
                % growth
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lumina-primary text-sm font-medium">
                Avg Lifetime Value
              </CardTitle>
              <DollarSign className="h-4 w-4" style={{ color: '#ff7a5a' }} />
            </CardHeader>
            <CardContent>
              <div className="text-lumina-primary text-2xl font-bold">
                ${metrics.averageLifetimeValue.toLocaleString()}
              </div>
              <p className="text-xs" style={{ color: '#808285' }}>
                Per client
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lumina-primary text-sm font-medium">
                VIP Clients
              </CardTitle>
              <Heart className="h-4 w-4" style={{ color: '#ff7a5a' }} />
            </CardHeader>
            <CardContent>
              <div className="text-lumina-primary text-2xl font-bold">
                {metrics.vipClients}
              </div>
              <p className="text-xs" style={{ color: '#808285' }}>
                {metrics.retentionRate}% retention rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header with Add Client Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lumina-primary text-2xl font-bold">Clients</h2>
          <p className="text-sm" style={{ color: '#808285' }}>
            Manage your client relationships and booking history
          </p>
        </div>
        <button
          onClick={onCreateClient}
          className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:transform"
          style={{
            background: 'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
            color: '#0b2b33',
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, #ff7a5a 0%, #ffd25a 100%)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.textShadow =
              '0 1px 2px rgba(11, 43, 51, 0.4)';
            e.currentTarget.style.boxShadow =
              '0 4px 12px rgba(255, 122, 90, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)';
            e.currentTarget.style.color = '#0b2b33';
            e.currentTarget.style.textShadow =
              '0 1px 2px rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Filters and View Toggle */}
      <div className="space-y-4">
        <FilterBar
          filters={filterOptions}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />

        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: '#808285' }}>
            Showing {filteredClients.length} of {clients.length} clients
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'text-lumina-primary bg-white shadow-sm'
                  : 'hover:text-lumina-primary text-gray-600'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'text-lumina-primary bg-white shadow-sm'
                  : 'hover:text-lumina-primary text-gray-600'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Client Display */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description={
            Object.keys(filterValues).length > 0
              ? 'No clients match your current filters'
              : 'Start building your client base by adding your first client'
          }
          action={
            Object.keys(filterValues).length === 0
              ? {
                  label: 'Add First Client',
                  onClick: onCreateClient,
                }
              : undefined
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredClients.map(client => (
            <Card
              key={client.id}
              className="flex h-full cursor-pointer flex-col border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              onClick={() => onViewClient?.(client)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 flex-1 items-center space-x-2">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback
                        className="text-xs font-medium text-white"
                        style={{
                          background:
                            'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
                        }}
                      >
                        {getInitials(client.firstName, client.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lumina-primary truncate text-sm font-semibold">
                        {client.firstName} {client.lastName}
                      </h3>
                      <div className="mt-1 flex items-center gap-1">
                        {client.status && (
                          <StatusBadge
                            variant={getStatusColor(client.status)}
                            size="sm"
                          >
                            {client.status.charAt(0).toUpperCase() +
                              client.status.slice(1)}
                          </StatusBadge>
                        )}
                        {getLoyaltyIcon(client.loyaltyTier)}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={e => e.stopPropagation()}
                        className="flex-shrink-0 rounded p-1 hover:bg-gray-100"
                      >
                        <MoreHorizontal
                          className="h-4 w-4"
                          style={{ color: '#808285' }}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation();
                          onViewClient?.(client);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation();
                          onEditClient?.(client);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Client
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation();
                          // TODO: Implement delete functionality
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col justify-between space-y-3 pt-0">
                {/* Contact Info - Compact */}
                <div className="space-y-1">
                  {client.email && (
                    <div
                      className="flex items-center truncate text-xs"
                      style={{ color: '#808285' }}
                    >
                      <Mail className="mr-1 h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div
                      className="flex items-center text-xs"
                      style={{ color: '#808285' }}
                    >
                      <Phone className="mr-1 h-3 w-3 flex-shrink-0" />
                      {client.phone}
                    </div>
                  )}
                </div>

                {/* Stats - Compact Grid */}
                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 py-2">
                  <div className="text-center">
                    <div className="text-lumina-primary text-sm font-medium">
                      {client.appointmentCount}
                    </div>
                    <div className="text-xs" style={{ color: '#808285' }}>
                      Visits
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lumina-primary text-sm font-medium">
                      ${client.totalSpent?.toLocaleString() || '0'}
                    </div>
                    <div className="text-xs" style={{ color: '#808285' }}>
                      Spent
                    </div>
                  </div>
                </div>

                {/* Last Appointment - Compact */}
                {client.lastAppointment && (
                  <div className="border-t border-gray-100 pt-2">
                    <div className="text-lumina-primary text-xs">
                      {formatDistanceToNow(
                        new Date(client.lastAppointment.startTime),
                        { addSuffix: true }
                      )}
                    </div>
                    <div
                      className="truncate text-xs"
                      style={{ color: '#808285' }}
                    >
                      {client.lastAppointment.services
                        .map(s => s.service.name)
                        .join(', ')}
                    </div>
                  </div>
                )}

                {/* Quick Actions - Always at bottom with consistent alignment */}
                <div className="mt-auto flex gap-2 pt-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onViewClient?.(client);
                    }}
                    className="text-lumina-primary flex-1 rounded-md bg-gray-100 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-gray-200"
                  >
                    <Calendar className="mr-1 inline h-3 w-3" />
                    Details
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onBookAppointment?.(client);
                    }}
                    className="flex-1 rounded-md px-2 py-1.5 text-xs font-bold transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:transform"
                    style={{
                      background:
                        'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
                      color: '#0b2b33',
                      textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background =
                        'linear-gradient(135deg, #ff7a5a 0%, #ffd25a 100%)';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.textShadow =
                        '0 1px 2px rgba(11, 43, 51, 0.4)';
                      e.currentTarget.style.boxShadow =
                        '0 4px 12px rgba(255, 122, 90, 0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background =
                        'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)';
                      e.currentTarget.style.color = '#0b2b33';
                      e.currentTarget.style.textShadow =
                        '0 1px 2px rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Book Now
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Enhanced Table view with perfect alignment
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="p-4">
            <div className="space-y-3">
              {filteredClients.map(client => (
                <div
                  key={client.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  onClick={() => onViewClient?.(client)}
                >
                  <div className="flex min-w-0 flex-1 items-center space-x-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback
                        className="text-sm font-medium text-white"
                        style={{
                          background:
                            'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
                        }}
                      >
                        {getInitials(client.firstName, client.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lumina-primary truncate font-medium">
                          {client.firstName} {client.lastName}
                        </h3>
                        {client.status && (
                          <StatusBadge
                            variant={getStatusColor(client.status)}
                            size="sm"
                          >
                            {client.status}
                          </StatusBadge>
                        )}
                        {getLoyaltyIcon(client.loyaltyTier)}
                      </div>
                      {client.email && (
                        <div
                          className="mt-1 flex items-center truncate text-sm"
                          style={{ color: '#808285' }}
                        >
                          <Mail className="mr-1 h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-4">
                    <div className="text-right">
                      <div className="text-lumina-primary text-sm font-medium">
                        {client.appointmentCount} visits
                      </div>
                      <div className="text-xs" style={{ color: '#808285' }}>
                        ${client.totalSpent?.toLocaleString() || '0'} spent
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onViewClient?.(client);
                        }}
                        className="text-lumina-primary rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-200"
                      >
                        Details
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onBookAppointment?.(client);
                        }}
                        className="rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:transform"
                        style={{
                          background:
                            'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
                          color: '#0b2b33',
                          textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background =
                            'linear-gradient(135deg, #ff7a5a 0%, #ffd25a 100%)';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.textShadow =
                            '0 1px 2px rgba(11, 43, 51, 0.4)';
                          e.currentTarget.style.boxShadow =
                            '0 4px 12px rgba(255, 122, 90, 0.4)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background =
                            'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)';
                          e.currentTarget.style.color = '#0b2b33';
                          e.currentTarget.style.textShadow =
                            '0 1px 2px rgba(255, 255, 255, 0.3)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
