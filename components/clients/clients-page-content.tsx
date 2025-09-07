'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ClientCreateDialog } from './client-create-dialog';
import { ClientDetailsDialog } from './client-details-dialog';
import { ClientEditDialog } from './client-edit-dialog';
import { ClientList } from './client-list';

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
  businessId: string;
}

export function ClientsPageContent({ businessId }: ClientsPageContentProps) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lumina-primary text-3xl font-bold">Clients</h1>
          <p className="text-lumina-secondary mt-1">
            Manage your client relationships and appointment history
          </p>
        </div>
        <Button
          className="bg-lumina-radiant text-white hover:bg-lumina-radiant-hover"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Client List */}
      <ClientList
        key={refreshKey}
        businessId={businessId}
        onEditClient={handleEditClient}
        onViewClient={handleViewClient}
      />

      {/* Client Creation Dialog */}
      <ClientCreateDialog
        businessId={businessId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleClientUpdate}
      />

      {/* Client Edit Dialog */}
      <ClientEditDialog
        client={selectedClient}
        businessId={businessId}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleClientUpdate}
      />

      {/* Client Details Dialog */}
      <ClientDetailsDialog
        client={selectedClient}
        businessId={businessId}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
}
