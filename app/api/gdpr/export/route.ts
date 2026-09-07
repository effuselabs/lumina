import { getCurrentUser } from '@/lib/auth';
import { businessContextSecurity } from '@/lib/security/business-context-security';
import { dataProtection } from '@/lib/security/data-protection';
import {
  createSecurityMetadata,
  extractServerSecurityContext,
} from '@/lib/security/security-middleware';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ExportRequestSchema = z.object({
  clientId: z.string().cuid('Invalid client ID format'),
  businessId: z.string().cuid('Invalid business ID format'),
  format: z.enum(['json', 'csv']).default('json'),
  includeTransactions: z.boolean().default(true),
  includeCommunications: z.boolean().default(true),
});

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST /api/gdpr/export
 * Export client data for GDPR compliance (Article 20 - Right to data portability)
 */
export async function POST(request: NextRequest) {
  const securityContext = extractServerSecurityContext();

  try {
    // Parse and validate request body
    const body = await request.json();
    const {
      clientId,
      businessId,
      format,
      includeTransactions,
      includeCommunications,
    } = ExportRequestSchema.parse(body);

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate business access
    const validation = await businessContextSecurity.validateBusinessContext(
      businessId,
      user.id,
      ['OWNER', 'MANAGER'], // Only owners and managers can export client data
      createSecurityMetadata(securityContext, {
        action: 'gdpr_export',
        clientId,
      })
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Insufficient permissions to export client data',
        },
        { status: 403 }
      );
    }

    // Validate client belongs to business
    const clientValidation = await businessContextSecurity.validateClientAccess(
      clientId,
      businessId,
      user.id,
      createSecurityMetadata(securityContext, { action: 'gdpr_export' })
    );

    if (!clientValidation.isValid) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Export client data
    const exportData = await dataProtection.exportClientData(
      clientId,
      businessId
    );

    // Filter data based on request options
    if (!includeTransactions) {
      exportData.transactions = [];
    }

    if (!includeCommunications) {
      exportData.communications = [];
    }

    // Format response based on requested format
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="client-data-${clientId}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    return NextResponse.json({
      success: true,
      data: exportData,
      metadata: {
        exportedAt: new Date().toISOString(),
        format,
        requestedBy: user.id,
        businessId,
      },
    });
  } catch (error) {
    console.error('GDPR export error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export client data' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert export data to CSV format
 */
function convertToCSV(exportData: any): string {
  const lines: string[] = [];

  // Personal Data Section
  lines.push('PERSONAL DATA');
  lines.push('Field,Value');
  Object.entries(exportData.personalData).forEach(([key, value]) => {
    lines.push(`${key},"${String(value).replace(/"/g, '""')}"`);
  });
  lines.push('');

  // Appointments Section
  lines.push('APPOINTMENTS');
  lines.push('ID,Start Time,End Time,Status,Total Price,Notes,Services');
  exportData.appointments.forEach((appointment: any) => {
    const services = appointment.services
      .map((s: any) => s.serviceName)
      .join('; ');
    lines.push(
      [
        appointment.id,
        appointment.startTime,
        appointment.endTime,
        appointment.status,
        appointment.totalPrice,
        `"${(appointment.notes || '').replace(/"/g, '""')}"`,
        `"${services}"`,
      ].join(',')
    );
  });
  lines.push('');

  // Transactions Section
  if (exportData.transactions.length > 0) {
    lines.push('TRANSACTIONS');
    lines.push('ID,Amount,Type,Status,Payment Method,Created At');
    exportData.transactions.forEach((transaction: any) => {
      lines.push(
        [
          transaction.id,
          transaction.amount,
          transaction.type,
          transaction.status,
          transaction.paymentMethod,
          transaction.createdAt,
        ].join(',')
      );
    });
    lines.push('');
  }

  // Communications Section
  if (exportData.communications.length > 0) {
    lines.push('COMMUNICATIONS');
    lines.push('ID,Type,Direction,Channel,Subject,Status,Created At');
    exportData.communications.forEach((comm: any) => {
      lines.push(
        [
          comm.id,
          comm.type,
          comm.direction,
          comm.channel,
          `"${(comm.subject || '').replace(/"/g, '""')}"`,
          comm.status,
          comm.createdAt,
        ].join(',')
      );
    });
  }

  return lines.join('\n');
}
