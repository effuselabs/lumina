'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ClientCreateDialog } from './client-create-dialog';
import { ClientDetailsDialog } from './client-details-dialog';
import { ClientEditDialog } from './client-edit-dialog';
import { ComprehensiveClientManagement } from './comprehensive-client-management';

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

interface ClientsPageContentProps {
  business: {
    id: string;
    name: string;
    users: Array<{ role: string }>;
  };
  userRole: string;
  userName: string;
  businessSlug: string;
}

export function ClientsPageContent({
  business,
  userRole,
  userName,
  businessSlug,
}: ClientsPageContentProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 3,
          },
        },
      })
  );

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const handleClientUpdate = () => {
    // Trigger a refresh of the client list
    setRefreshKey(prev => prev + 1);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setDetailsDialogOpen(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout
        businessSlug={businessSlug}
        userRole={userRole}
        userName={userName}
        businessName={business.name}
      >
        <div className="space-y-8">
          {/* Comprehensive Client Management */}
          <ComprehensiveClientManagement
            key={refreshKey}
            businessId={business.id}
            businessSlug={businessSlug}
            onEditClient={handleEditClient}
            onViewClient={handleViewClient}
            onCreateClient={() => setCreateDialogOpen(true)}
            onBookAppointment={(client: Client) => {
              // TODO: Implement quick booking functionality
              console.log('Quick book for', client.firstName);
            }}
          />

          {/* Client Creation Dialog */}
          <ClientCreateDialog
            businessId={business.id}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSuccess={handleClientUpdate}
          />

          {/* Client Edit Dialog */}
          <ClientEditDialog
            client={selectedClient}
            businessId={business.id}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={handleClientUpdate}
          />

          {/* Client Details Dialog */}
          <ClientDetailsDialog
            client={selectedClient}
            businessId={business.id}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
          />
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  );
}
