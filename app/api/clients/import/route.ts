import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for client import data
const clientImportSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

// interface ImportResult {
//     success: boolean;
//     totalRows: number;
//     validRows: number;
//     invalidRows: number;
//     errors: ImportError[];
//     preview?: any[];
//     imported?: number;
// }

// POST /api/clients/import - Process CSV import
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;
    const preview = formData.get('preview') === 'true';
    const mapping = formData.get('mapping')
      ? JSON.parse(formData.get('mapping') as string)
      : null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: session.user.id,
        role: { in: ['OWNER', 'MANAGER'] }, // Only owners and managers can import clients
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // Parse CSV content
    const csvContent = await file.text();
    const parseResult = await parseCSV(csvContent, mapping);

    if (preview) {
      // Return preview data for mapping interface
      return NextResponse.json({
        success: true,
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        invalidRows: parseResult.invalidRows,
        errors: parseResult.errors,
        preview: parseResult.preview,
        headers: parseResult.headers,
      });
    }

    // Import validated data
    if (parseResult.validData && parseResult.validData.length > 0) {
      const importResult = await importClients(
        businessId,
        parseResult.validData
      );

      return NextResponse.json({
        success: true,
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        invalidRows: parseResult.invalidRows,
        imported: importResult.imported,
        skipped: importResult.skipped,
        errors: [...parseResult.errors, ...importResult.errors],
      });
    }

    return NextResponse.json({
      success: false,
      totalRows: parseResult.totalRows,
      validRows: 0,
      invalidRows: parseResult.totalRows,
      errors: parseResult.errors,
    });
  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Parse CSV content and validate data
async function parseCSV(csvContent: string, mapping?: Record<string, string>) {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const dataLines = lines.slice(1);

  const errors: ImportError[] = [];
  const validData: any[] = [];
  const preview: any[] = [];

  // Default field mapping if not provided
  const fieldMapping = mapping || {
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    city: 'city',
    state: 'state',
    zipCode: 'zip_code',
    notes: 'notes',
  };

  // Process each data row
  dataLines.forEach((line, index) => {
    const rowNumber = index + 2; // +2 because we skip header and arrays are 0-indexed

    try {
      const values = parseCSVLine(line);

      if (values.length === 0 || values.every(v => !v.trim())) {
        return; // Skip empty rows
      }

      // Map CSV columns to our fields
      const rowData: any = {};

      Object.entries(fieldMapping).forEach(([ourField, csvField]) => {
        const columnIndex = headers.findIndex(
          h => h.toLowerCase().trim() === csvField.toLowerCase().trim()
        );

        if (columnIndex !== -1 && columnIndex < values.length) {
          rowData[ourField] = values[columnIndex]?.trim() || '';
        }
      });

      // Add preview data (first 5 rows)
      if (preview.length < 5) {
        preview.push({
          row: rowNumber,
          data: rowData,
          raw: values,
        });
      }

      // Validate the row data
      const validationResult = clientImportSchema.safeParse(rowData);

      if (validationResult.success) {
        validData.push(validationResult.data);
      } else {
        validationResult.error.errors.forEach(err => {
          errors.push({
            row: rowNumber,
            field: err.path.join('.'),
            message: err.message,
            data: rowData,
          });
        });
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  return {
    totalRows: dataLines.length,
    validRows: validData.length,
    invalidRows: errors.length,
    errors,
    validData,
    preview,
    headers,
  };
}

// Simple CSV line parser (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(field => field.replace(/^"|"$/g, '').trim());
}

// Import validated client data
async function importClients(businessId: string, clientsData: any[]) {
  const errors: ImportError[] = [];
  let imported = 0;
  let skipped = 0;

  for (const clientData of clientsData) {
    try {
      // Check for existing client by email or phone
      const existingClient = await prisma.client.findFirst({
        where: {
          businessId,
          OR: [
            clientData.email ? { email: clientData.email } : {},
            clientData.phone ? { phone: clientData.phone } : {},
          ].filter(condition => Object.keys(condition).length > 0),
        },
      });

      if (existingClient) {
        skipped++;
        continue;
      }

      // Create new client
      await prisma.client.create({
        data: {
          ...clientData,
          businessId,
          // Convert empty strings to null for optional fields
          email: clientData.email || null,
          phone: clientData.phone || null,
          address: clientData.address || null,
          city: clientData.city || null,
          state: clientData.state || null,
          zipCode: clientData.zipCode || null,
          notes: clientData.notes || null,
        },
      });

      imported++;
    } catch (error) {
      errors.push({
        row: -1, // We don't have row number in this context
        message: `Failed to import client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: clientData,
      });
    }
  }

  return { imported, skipped, errors };
}
