'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ClientCreateDialog } from './client-create-dialog';
import { ClientDetailsDialog } from './client-details-dialog';
import { ClientEditDialog } from './client-edit-dialog';
import { EnhancedClientManagement } from './enhanced-client-management';

interface Client {
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
  createdAt: string;
  appointmentCount?: number;
  lastAppointment?: {
    startTime: string;
    staff: { displayName: string };
    services: Array<{ service: { name: string } }>;
  };
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
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="lumina-heading-2">Clients</h1>
              <p className="lumina-body-large" style={{ color: '#808285' }}>
                Manage your client relationships and appointment history
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                style={{ color: '#0b2b33' }}
                onClick={() => {
                  // TODO: Implement bulk import functionality
                  // console.log('Import clients clicked');
                }}
              >
                Import Clients
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, #ffcd47 0%, #ff6b47 100%)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)';
                }}
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </button>
            </div>
          </div>

          {/* Enhanced Client Management */}
          <EnhancedClientManagement
            key={refreshKey}
            businessId={business.id}
            businessSlug={businessSlug}
            onEditClient={handleEditClient}
            onViewClient={handleViewClient}
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
