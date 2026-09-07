import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types
export interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration: number;
  isActive: boolean;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  staff?: {
    staff: {
      id: string;
      displayName: string;
      avatar?: string;
    };
  }[];
  _count?: {
    appointments: number;
  };
}

export interface CreateServiceData {
  businessId: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration: number;
  isActive?: boolean;
  isOnline?: boolean;
}

export interface UpdateServiceData {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  duration?: number;
  isActive?: boolean;
  isOnline?: boolean;
}

export interface ServiceFilters {
  search?: string;
  category?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API functions
const fetchServices = async (
  businessId: string,
  filters: ServiceFilters = {}
): Promise<Service[]> => {
  const params = new URLSearchParams({
    businessId,
    ...Object.fromEntries(
      Object.entries(filters).filter(
        ([_, value]) => value !== undefined && value !== ''
      )
    ),
  });

  const response = await fetch(`/api/services?${params}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch services');
  }

  const data = await response.json();
  return data.services;
};

const fetchService = async (serviceId: string): Promise<Service> => {
  const response = await fetch(`/api/services/${serviceId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch service');
  }

  const data = await response.json();
  return data.service;
};

const createService = async (
  serviceData: CreateServiceData
): Promise<Service> => {
  const response = await fetch('/api/services', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(serviceData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create service');
  }

  const data = await response.json();
  return data.service;
};

const updateService = async (
  serviceId: string,
  serviceData: UpdateServiceData
): Promise<Service> => {
  const response = await fetch(`/api/services/${serviceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(serviceData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update service');
  }

  const data = await response.json();
  return data.service;
};

const deleteService = async (serviceId: string): Promise<void> => {
  const response = await fetch(`/api/services/${serviceId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete service');
  }
};

// Hooks
export const useServices = (
  businessId: string,
  filters: ServiceFilters = {}
) => {
  return useQuery({
    queryKey: ['services', businessId, filters],
    queryFn: () => fetchServices(businessId, filters),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useService = (serviceId: string) => {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => fetchService(serviceId),
    enabled: !!serviceId,
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createService,
    onSuccess: newService => {
      // Invalidate services list
      queryClient.invalidateQueries({
        queryKey: ['services', newService.businessId],
      });
      toast.success('Service created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create service');
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: UpdateServiceData;
    }) => updateService(serviceId, data),
    onSuccess: updatedService => {
      // Update the specific service in cache
      queryClient.setQueryData(['service', updatedService.id], updatedService);
      // Invalidate services list
      queryClient.invalidateQueries({
        queryKey: ['services', updatedService.businessId],
      });
      toast.success('Service updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update service');
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteService,
    onSuccess: (_, serviceId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['service', serviceId] });
      // Invalidate services list
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deactivated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to deactivate service');
    },
  });
};
