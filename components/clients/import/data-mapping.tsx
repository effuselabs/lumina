'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FieldMapping,
  ImportPreviewResult,
  getDefaultFieldMapping,
  getFieldDisplayName,
} from '@/hooks/useClientImport';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DataMappingProps {
  previewData: ImportPreviewResult;
  onMappingChange: (mapping: FieldMapping) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function DataMapping({
  previewData,
  onMappingChange,
  onContinue,
  onBack,
  isLoading = false,
}: DataMappingProps) {
  const [mapping, setMapping] = useState<FieldMapping>(
    getDefaultFieldMapping()
  );
  const [autoMapped, setAutoMapped] = useState<string[]>([]);

  // Auto-map fields based on header similarity
  useEffect(() => {
    const newMapping: FieldMapping = {};
    const mapped: string[] = [];

    const ourFields = Object.keys(getDefaultFieldMapping());

    ourFields.forEach(ourField => {
      const defaultCsvField = getDefaultFieldMapping()[ourField];

      // Try exact match first
      let matchedHeader = previewData.headers.find(
        header => header.toLowerCase().trim() === defaultCsvField.toLowerCase()
      );

      // Try partial match if no exact match
      if (!matchedHeader) {
        matchedHeader = previewData.headers.find(header => {
          const headerLower = header.toLowerCase().trim();
          const fieldLower = defaultCsvField.toLowerCase();
          return (
            headerLower.includes(fieldLower) || fieldLower.includes(headerLower)
          );
        });
      }

      // Try alternative common names
      if (!matchedHeader) {
        const alternatives: Record<string, string[]> = {
          firstName: ['first', 'fname', 'given_name', 'forename'],
          lastName: ['last', 'lname', 'surname', 'family_name'],
          email: ['email_address', 'mail', 'e_mail'],
          phone: ['telephone', 'mobile', 'cell', 'phone_number'],
          address: ['street', 'address1', 'street_address'],
          zipCode: ['zip', 'postal_code', 'postcode'],
        };

        const alts = alternatives[ourField] || [];
        matchedHeader = previewData.headers.find(header => {
          const headerLower = header.toLowerCase().trim();
          return alts.some(
            alt => headerLower.includes(alt) || alt.includes(headerLower)
          );
        });
      }

      if (matchedHeader) {
        newMapping[ourField] = matchedHeader;
        mapped.push(ourField);
      }
    });

    setMapping(newMapping);
    setAutoMapped(mapped);
    onMappingChange(newMapping);
  }, [previewData.headers, onMappingChange]);

  const handleFieldMapping = (ourField: string, csvField: string) => {
    const newMapping = {
      ...mapping,
      [ourField]: csvField === 'none' ? '' : csvField,
    };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const requiredFields = ['firstName', 'lastName'];
  const canContinue = requiredFields.every(field => mapping[field]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Map Your Data</h2>
        <p className="mt-1 text-sm text-gray-600">
          Match your CSV columns to our client fields. Required fields are
          marked with *.
        </p>
      </div>

      {/* Preview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-600" />
            <span className="ml-2 text-sm font-medium text-blue-900">
              Total Rows: {previewData.totalRows}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="ml-2 text-sm font-medium text-green-900">
              Valid: {previewData.validRows}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="ml-2 text-sm font-medium text-red-900">
              Errors: {previewData.invalidRows}
            </span>
          </div>
        </div>
      </div>

      {/* Field Mapping */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Field Mapping</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.keys(getDefaultFieldMapping()).map(ourField => {
            const isRequired = requiredFields.includes(ourField);
            const isAutoMapped = autoMapped.includes(ourField);

            return (
              <div key={ourField} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {getFieldDisplayName(ourField)}
                  {isRequired && <span className="ml-1 text-red-500">*</span>}
                  {isAutoMapped && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Auto-mapped
                    </span>
                  )}
                </label>

                <Select
                  value={mapping[ourField] || 'none'}
                  onValueChange={value => handleFieldMapping(ourField, value)}
                >
                  <SelectTrigger
                    className={cn(
                      isRequired &&
                        !mapping[ourField] &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  >
                    <SelectValue placeholder="Select CSV column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-500">Don&apos;t import</span>
                    </SelectItem>
                    {previewData.headers.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Data */}
      {previewData.preview.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Row
                    </th>
                    {Object.keys(mapping)
                      .filter(field => mapping[field])
                      .map(field => (
                        <th
                          key={field}
                          className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          {getFieldDisplayName(field)}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {previewData.preview.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {row.row}
                      </td>
                      {Object.keys(mapping)
                        .filter(field => mapping[field])
                        .map(field => {
                          const value = row.data[field] || '';
                          return (
                            <td
                              key={field}
                              className="px-4 py-3 text-sm text-gray-900"
                            >
                              {value || (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {previewData.errors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Import Errors</h3>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="space-y-2">
              {previewData.errors.slice(0, 10).map((error, index) => (
                <div key={index} className="text-sm text-red-700">
                  <span className="font-medium">Row {error.row}:</span>
                  {error.field && <span className="ml-1">({error.field})</span>}
                  <span className="ml-1">{error.message}</span>
                </div>
              ))}
              {previewData.errors.length > 10 && (
                <div className="text-sm text-red-600">
                  ... and {previewData.errors.length - 10} more errors
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>

        <Button
          onClick={onContinue}
          disabled={!canContinue || isLoading}
          className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Importing...
            </>
          ) : (
            'Import Clients'
          )}
        </Button>
      </div>
    </div>
  );
}
