import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types
export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface ImportPreviewResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  preview: {
    row: number;
    data: Record<string, string>;
    raw: string[];
  }[];
  headers: string[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface FieldMapping {
  [ourField: string]: string; // ourField -> csvColumn
}

// API functions
const previewImport = async (
  businessId: string,
  file: File,
  mapping?: FieldMapping
): Promise<ImportPreviewResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('businessId', businessId);
  formData.append('preview', 'true');

  if (mapping) {
    formData.append('mapping', JSON.stringify(mapping));
  }

  const response = await fetch('/api/clients/import', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to preview import');
  }

  return response.json();
};

const executeImport = async (
  businessId: string,
  file: File,
  mapping: FieldMapping
): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('businessId', businessId);
  formData.append('mapping', JSON.stringify(mapping));

  const response = await fetch('/api/clients/import', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import clients');
  }

  return response.json();
};

// Hooks
export const usePreviewImport = () => {
  return useMutation({
    mutationFn: ({
      businessId,
      file,
      mapping,
    }: {
      businessId: string;
      file: File;
      mapping?: FieldMapping;
    }) => previewImport(businessId, file, mapping),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to preview import');
    },
  });
};

export const useExecuteImport = () => {
  return useMutation({
    mutationFn: ({
      businessId,
      file,
      mapping,
    }: {
      businessId: string;
      file: File;
      mapping: FieldMapping;
    }) => executeImport(businessId, file, mapping),
    onSuccess: result => {
      if (result.success) {
        toast.success(
          `Import completed! ${result.imported} clients imported, ${result.skipped} skipped.`
        );
      } else {
        toast.error('Import failed. Please check the errors and try again.');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import clients');
    },
  });
};

// Utility functions
export const getDefaultFieldMapping = (): FieldMapping => ({
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  city: 'city',
  state: 'state',
  zipCode: 'zip_code',
  notes: 'notes',
});

export const getFieldDisplayName = (field: string): string => {
  const displayNames: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    phone: 'Phone Number',
    address: 'Street Address',
    city: 'City',
    state: 'State/Province',
    zipCode: 'ZIP/Postal Code',
    notes: 'Notes',
  };

  return displayNames[field] || field;
};

export const validateFile = (file: File): string | null => {
  // Check file type
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return 'Please select a CSV file';
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return 'File size must be less than 5MB';
  }

  return null;
};
