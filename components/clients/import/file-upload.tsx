'use client';

import { Button } from '@/components/ui/button';
import { validateFile } from '@/hooks/useClientImport';
import { cn } from '@/lib/utils';
import { AlertCircle, FileText, Upload, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile?: File;
  isLoading?: boolean;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  isLoading = false,
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      setError(null);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const validationError = validateFile(file);

        if (validationError) {
          setError(validationError);
          return;
        }

        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);

      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const validationError = validateFile(file);

        if (validationError) {
          setError(validationError);
          return;
        }

        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleRemoveFile = () => {
    setError(null);
    onFileRemove();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Selected File Display */}
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">
                {selectedFile.name}
              </p>
              <p className="text-xs text-green-600">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveFile}
            disabled={isLoading}
            className="text-green-600 hover:bg-green-100 hover:text-green-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* File Upload Area */}
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragActive
            ? 'border-orange-400 bg-orange-50'
            : 'border-gray-300 hover:border-gray-400',
          isLoading && 'pointer-events-none opacity-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          disabled={isLoading}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Upload className="h-8 w-8 text-gray-600" />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Upload CSV File
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Drag and drop your CSV file here, or click to browse
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            className="pointer-events-none"
          >
            Choose File
          </Button>

          <div className="text-xs text-gray-500">
            <p>Supported format: CSV files up to 5MB</p>
            <p className="mt-1">
              Expected columns: first_name, last_name, email, phone, address,
              city, state, zip_code, notes
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
