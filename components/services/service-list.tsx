'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Clock,
  DollarSign,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ServiceCreateDialog } from './service-create-dialog';
import { ServiceEditDialog } from './service-edit-dialog';

interface Service {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration: number;
  isActive: boolean;
  isOnline: boolean;
  staff: Array<{
    staff: {
      id: string;
      displayName: string;
    };
  }>;
  _count: {
    appointments: number;
  };
}

interface ServiceListProps {
  businessId: string;
}

export function ServiceList({ businessId }: ServiceListProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        businessId,
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(statusFilter !== 'all' && {
          isActive: statusFilter === 'active' ? 'true' : 'false',
        }),
      });

      const response = await fetch(`/api/services?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const data = await response.json();
      setServices(data.services || []);
    } catch (_error) {
      // Error fetching services
    } finally {
      setIsLoading(false);
    }
  }, [businessId, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchServices();
  }, [businessId, searchTerm, categoryFilter, statusFilter, fetchServices]);

  const handleServiceUpdate = () => {
    fetchServices();
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setEditDialogOpen(true);
  };

  const handleToggleServiceStatus = async (service: Service) => {
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !service.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update service status');
      }

      // Refresh the services list
      handleServiceUpdate();
    } catch (error) {
      // Error updating service status
      alert(
        `Error updating service status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}min`
      : `${hours}h`;
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCategoryBadgeColor = (category?: string) => {
    const colors = {
      Hair: 'bg-blue-100 text-blue-800 border-blue-200',
      Nails: 'bg-pink-100 text-pink-800 border-pink-200',
      Skincare: 'bg-green-100 text-green-800 border-green-200',
      Massage: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return (
      colors[category as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  const filteredServices = services.filter(service => {
    const matchesSearch =
      !searchTerm ||
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || service.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && service.isActive) ||
      (statusFilter === 'inactive' && !service.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200"></div>
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg bg-gray-200"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-64 pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Hair">Hair</SelectItem>
              <SelectItem value="Nails">Nails</SelectItem>
              <SelectItem value="Skincare">Skincare</SelectItem>
              <SelectItem value="Massage">Massage</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-lumina-radiant text-white hover:bg-lumina-radiant-hover"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <DollarSign className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            No services found
          </h3>
          <p className="mb-4 text-gray-600">
            {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more services.'
              : 'Get started by adding your first service.'}
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-lumina-radiant text-white hover:bg-lumina-radiant-hover"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map(service => (
            <Card
              key={service.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lumina-primary text-lg font-semibold">
                      {service.name}
                    </CardTitle>
                    {service.description && (
                      <p className="text-lumina-secondary mt-1 line-clamp-2 text-sm">
                        {service.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditService(service)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Service
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleToggleServiceStatus(service)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {service.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusBadgeColor(service.isActive)}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {service.category && (
                    <Badge className={getCategoryBadgeColor(service.category)}>
                      {service.category}
                    </Badge>
                  )}
                  {service.isOnline && (
                    <Badge className="border-blue-200 bg-blue-100 text-blue-800">
                      Online Booking
                    </Badge>
                  )}
                </div>

                {/* Price and Duration */}
                <div className="flex items-center justify-between">
                  <div className="text-lumina-primary flex items-center gap-1 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    {formatPrice(service.price)}
                  </div>
                  <div className="text-lumina-secondary flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(service.duration)}
                  </div>
                </div>

                {/* Staff and Appointments */}
                <div className="text-lumina-secondary flex items-center justify-between text-sm">
                  <span>{service.staff.length} staff assigned</span>
                  <span>{service._count.appointments} appointments</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Service Creation Dialog */}
      <ServiceCreateDialog
        businessId={businessId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleServiceUpdate}
      />

      {/* Service Edit Dialog */}
      <ServiceEditDialog
        service={selectedService}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleServiceUpdate}
      />
    </div>
  );
}
