'use client';

import { DataMapping } from '@/components/clients/import/data-mapping';
import { FileUpload } from '@/components/clients/import/file-upload';
import { ImportResults } from '@/components/clients/import/import-results';
import {
  FieldMapping,
  ImportPreviewResult,
  ImportResult,
  useExecuteImport,
  usePreviewImport,
} from '@/hooks/useClientImport';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

type ImportStep = 'upload' | 'mapping' | 'results';

export default function ClientImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [businessId, setBusinessId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(
    null
  );
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Hooks
  const previewMutation = usePreviewImport();
  const importMutation = useExecuteImport();

  // Get business ID from user's businesses
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const fetchBusinessId = async () => {
      try {
        const response = await fetch('/api/user/businesses');
        if (response.ok) {
          const data = await response.json();
          if (data.businesses && data.businesses.length > 0) {
            setBusinessId(data.businesses[0].businessId);
          }
        }
      } catch (error) {
        console.error('Error fetching business ID:', error);
      }
    };

    fetchBusinessId();
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);

    // Automatically preview the file
    try {
      const result = await previewMutation.mutateAsync({
        businessId,
        file,
      });

      setPreviewData(result);
      setCurrentStep('mapping');
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setCurrentStep('upload');
  };

  const handleMappingChange = (mapping: FieldMapping) => {
    setFieldMapping(mapping);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const result = await importMutation.mutateAsync({
        businessId,
        file: selectedFile,
        mapping: fieldMapping,
      });

      setImportResult(result);
      setCurrentStep('results');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleStartOver = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setFieldMapping({});
    setImportResult(null);
    setCurrentStep('upload');
  };

  const handleViewClients = () => {
    router.push('/clients');
  };

  const handleBackToUpload = () => {
    setCurrentStep('upload');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Clients</h1>
        <p className="mt-1 text-gray-600">
          Upload a CSV file to import multiple clients at once
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {[
              { id: 'upload', name: 'Upload File', step: 'upload' },
              { id: 'mapping', name: 'Map Data', step: 'mapping' },
              { id: 'results', name: 'Review Results', step: 'results' },
            ].map((step, stepIdx) => (
              <li
                key={step.id}
                className={`${stepIdx !== 2 ? 'pr-8 sm:pr-20' : ''} relative`}
              >
                <div className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      currentStep === step.step
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : stepIdx <
                            ['upload', 'mapping', 'results'].indexOf(
                              currentStep
                            )
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 bg-white text-gray-500'
                    }`}
                  >
                    {stepIdx <
                    ['upload', 'mapping', 'results'].indexOf(currentStep) ? (
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{stepIdx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`ml-3 text-sm font-medium ${
                      currentStep === step.step
                        ? 'text-orange-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {stepIdx !== 2 && (
                  <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {currentStep === 'upload' && (
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={selectedFile || undefined}
            isLoading={previewMutation.isPending}
          />
        )}

        {currentStep === 'mapping' && previewData && (
          <DataMapping
            previewData={previewData}
            onMappingChange={handleMappingChange}
            onContinue={handleImport}
            onBack={handleBackToUpload}
            isLoading={importMutation.isPending}
          />
        )}

        {currentStep === 'results' && importResult && (
          <ImportResults
            result={importResult}
            onStartOver={handleStartOver}
            onViewClients={handleViewClients}
          />
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-medium text-blue-900">
          CSV Format Guidelines
        </h3>
        <div className="space-y-1 text-sm text-blue-700">
          <p>• Include column headers in the first row</p>
          <p>• Required fields: first_name, last_name</p>
          <p>
            • Optional fields: email, phone, address, city, state, zip_code,
            notes
          </p>
          <p>• Use UTF-8 encoding for special characters</p>
          <p>• Maximum file size: 5MB</p>
        </div>
      </div>
    </div>
  );
}
