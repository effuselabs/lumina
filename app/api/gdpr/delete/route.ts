import { getCurrentUser } from '@/lib/auth';
import {
  SecurityViolationType,
  businessContextSecurity,
} from '@/lib/security/business-context-security';
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

const DeleteRequestSchema = z.object({
  clientId: z.string().cuid('Invalid client ID format'),
  businessId: z.string().cuid('Invalid business ID format'),
  reason: z
    .string()
    .min(10, 'Deletion reason must be at least 10 characters')
    .max(500, 'Deletion reason too long'),
  confirmationCode: z.string().min(6, 'Confirmation code required'),
  acknowledgeIrreversible: z
    .boolean()
    .refine(
      val => val === true,
      'Must acknowledge that deletion is irreversible'
    ),
});

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST /api/gdpr/delete
 * Delete client data for GDPR compliance (Article 17 - Right to erasure)
 */
export async function POST(request: NextRequest) {
  const securityContext = extractServerSecurityContext();

  try {
    // Parse and validate request body
    const body = await request.json();
    const {
      clientId,
      businessId,
      reason,
      confirmationCode,
      acknowledgeIrreversible,
    } = DeleteRequestSchema.parse(body);

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate business access - only owners can delete client data
    const validation = await businessContextSecurity.validateBusinessContext(
      businessId,
      user.id,
      ['OWNER'], // Only business owners can delete client data
      createSecurityMetadata(securityContext, {
        action: 'gdpr_delete',
        clientId,
        reason: dataProtection.maskSensitiveData(reason),
      })
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized: Only business owners can delete client data' },
        { status: 403 }
      );
    }

    // Validate client belongs to business
    const clientValidation = await businessContextSecurity.validateClientAccess(
      clientId,
      businessId,
      user.id,
      createSecurityMetadata(securityContext, { action: 'gdpr_delete' })
    );

    if (!clientValidation.isValid) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Validate confirmation code (simple implementation - in production, use more secure method)
    const expectedCode = generateConfirmationCode(clientId, businessId);
    if (confirmationCode !== expectedCode) {
      // Log security violation for invalid confirmation code
      await businessContextSecurity.logSecurityViolation({
        type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
        userId: user.id,
        businessId,
        resourceId: clientId,
        resourceType: 'client',
        attemptedAction: 'gdpr_delete_invalid_confirmation',
        details: {
          providedCode: confirmationCode,
          expectedCodeLength: expectedCode.length,
          ...createSecurityMetadata(securityContext),
        },
      });

      return NextResponse.json(
        { error: 'Invalid confirmation code' },
        { status: 400 }
      );
    }

    // Perform the deletion
    const deletionResult = await dataProtection.deleteClientData(
      clientId,
      businessId,
      user.id,
      reason
    );

    // Return success response with deletion summary
    return NextResponse.json({
      success: true,
      message: 'Client data has been successfully deleted',
      deletionSummary: {
        deletedRecords: deletionResult.deletedRecords,
        retainedRecords: deletionResult.retainedRecords,
        deletionDate: deletionResult.deletionDate,
        requestedBy: user.id,
        reason: reason,
      },
      notice:
        'Some business records have been anonymized rather than deleted to comply with financial and legal requirements.',
    });
  } catch (error) {
    console.error('GDPR deletion error:', error);

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
      { error: 'Failed to delete client data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gdpr/delete/confirmation
 * Generate confirmation code for client deletion
 */
export async function GET(request: NextRequest) {
  const securityContext = extractServerSecurityContext();

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const businessId = searchParams.get('businessId');

    if (!clientId || !businessId) {
      return NextResponse.json(
        { error: 'Missing clientId or businessId parameters' },
        { status: 400 }
      );
    }

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
      ['OWNER'],
      createSecurityMetadata(securityContext, {
        action: 'gdpr_delete_confirmation',
        clientId,
      })
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error:
            'Unauthorized: Only business owners can request deletion confirmation codes',
        },
        { status: 403 }
      );
    }

    // Validate client exists
    const clientValidation = await businessContextSecurity.validateClientAccess(
      clientId,
      businessId,
      user.id,
      createSecurityMetadata(securityContext, {
        action: 'gdpr_delete_confirmation',
      })
    );

    if (!clientValidation.isValid) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode(clientId, businessId);

    // Log the confirmation code generation
    await businessContextSecurity.createAuditLog({
      userId: user.id,
      businessId,
      action: 'GDPR_DELETE_CONFIRMATION_GENERATED',
      resourceType: 'client',
      resourceId: clientId,
      metadata: {
        codeGenerated: true,
        ...createSecurityMetadata(securityContext),
      },
    });

    return NextResponse.json({
      success: true,
      confirmationCode,
      expiresIn: '15 minutes',
      warning:
        'This deletion is irreversible. Please ensure you have exported any needed data before proceeding.',
    });
  } catch (error) {
    console.error('Confirmation code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate confirmation code' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a confirmation code for client deletion
 * In production, this should be more secure and time-limited
 */
function generateConfirmationCode(
  clientId: string,
  businessId: string
): string {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / (15 * 60 * 1000)); // 15-minute windows
  const data = `${clientId}:${businessId}:${timestamp}:${process.env.NEXTAUTH_SECRET}`;

  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
}
