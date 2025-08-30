'use client';

import { Button } from '@/components/ui/button';
import { ImportResult } from '@/hooks/useClientImport';
import { AlertTriangle, CheckCircle, Download, Users, XCircle } from 'lucide-react';

interface ImportResultsProps {
    result: ImportResult;
    onStartOver: () => void;
    onViewClients: () => void;
}

export function ImportResults({
    result,
    onStartOver,
    onViewClients,
}: ImportResultsProps) {
    const successRate = result.totalRows > 0
        ? Math.round((result.imported / result.totalRows) * 100)
        : 0;

    const downloadErrorReport = () => {
        if (result.errors.length === 0) return;

        const csvContent = [
            ['Row', 'Field', 'Error Message', 'Data'],
            ...result.errors.map(error => [
                error.row.toString(),
                error.field || '',
                error.message,
                error.data ? JSON.stringify(error.data) : ''
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import-errors.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange-100 to-orange-200 mb-4">
                    {result.success ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                        <XCircle className="h-8 w-8 text-red-600" />
                    )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900">
                    {result.success ? 'Import Completed!' : 'Import Failed'}
                </h2>

                <p className="mt-2 text-gray-600">
                    {result.success
                        ? `Successfully imported ${result.imported} clients`
                        : 'There were issues with your import. Please review the errors below.'
                    }
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-blue-900">Total Rows</p>
                            <p className="text-lg font-semibold text-blue-900">{result.totalRows}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-900">Imported</p>
                            <p className="text-lg font-semibold text-green-900">{result.imported}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-yellow-900">Skipped</p>
                            <p className="text-lg font-semibold text-yellow-900">{result.skipped}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-900">Errors</p>
                            <p className="text-lg font-semibold text-red-900">{result.errors.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Rate */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Import Success Rate</h3>
                    <span className="text-2xl font-bold text-gray-900">{successRate}%</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${successRate}%` }}
                    />
                </div>

                <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>{result.imported} successful</span>
                    <span>{result.totalRows - result.imported} failed/skipped</span>
                </div>
            </div>

            {/* Detailed Results */}
            {result.imported > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="ml-3">
                            <h4 className="text-sm font-medium text-green-900">Successfully Imported</h4>
                            <p className="text-sm text-green-700 mt-1">
                                {result.imported} clients have been added to your database and are ready to book appointments.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {result.skipped > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="ml-3">
                            <h4 className="text-sm font-medium text-yellow-900">Skipped Clients</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                                {result.skipped} clients were skipped because they already exist in your database
                                (matched by email or phone number).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Import Errors</h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadErrorReport}
                            className="text-sm"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download Error Report
                        </Button>
                    </div>

                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                            {result.errors.slice(0, 20).map((error, index) => (
                                <div key={index} className="text-sm text-red-700">
                                    <span className="font-medium">
                                        {error.row > 0 ? `Row ${error.row}:` : 'Import Error:'}
                                    </span>
                                    {error.field && <span className="ml-1">({error.field})</span>}
                                    <span className="ml-1">{error.message}</span>
                                </div>
                            ))}
                            {result.errors.length > 20 && (
                                <div className="text-sm text-red-600 font-medium">
                                    ... and {result.errors.length - 20} more errors. Download the full report above.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                    variant="outline"
                    onClick={onStartOver}
                    className="sm:w-auto"
                >
                    Import Another File
                </Button>

                {result.imported > 0 && (
                    <Button
                        onClick={onViewClients}
                        className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 sm:w-auto"
                    >
                        View Imported Clients
                    </Button>
                )}
            </div>
        </div>
    );
}