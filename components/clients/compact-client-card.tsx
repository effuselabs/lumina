'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Mail, MoreHorizontal, Phone, Star } from 'lucide-react';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  appointmentCount: number;
  totalSpent?: number;
  lastAppointment?: {
    startTime: string;
    services: Array<{ service: { name: string } }>;
  };
  status?: 'active' | 'inactive' | 'vip';
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface CompactClientCardProps {
  client: Client;
  onViewClient?: (client: Client) => void;
  onBookAppointment?: (client: Client) => void;
  onShowMenu?: (client: Client) => void;
}

export function CompactClientCard({
  client,
  onViewClient,
  onBookAppointment,
  onShowMenu,
}: CompactClientCardProps) {
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
        return <Star className="h-3 w-3 text-purple-500" />;
      case 'gold':
        return <Star className="h-3 w-3 text-yellow-500" />;
      case 'silver':
        return <Star className="h-3 w-3 text-gray-400" />;
      case 'bronze':
        return <Star className="h-3 w-3 text-orange-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className="flex h-full cursor-pointer flex-col border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
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
          <button
            onClick={e => {
              e.stopPropagation();
              onShowMenu?.(client);
            }}
            className="flex-shrink-0 rounded p-1 hover:bg-gray-100"
          >
            <MoreHorizontal className="h-4 w-4" style={{ color: '#808285' }} />
          </button>
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
              {formatDistanceToNow(new Date(client.lastAppointment.startTime), {
                addSuffix: true,
              })}
            </div>
            <div className="truncate text-xs" style={{ color: '#808285' }}>
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
            Book Now
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
