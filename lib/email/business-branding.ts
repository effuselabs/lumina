/**
 * Business Branding Service
 * Fetches and applies business branding to email templates
 */

import { prisma } from '@/lib/prisma';
import type { BusinessBranding } from './template-engine';

/**
 * Default Lumina branding used as fallback
 */
const LUMINA_DEFAULT_BRANDING: Omit<BusinessBranding, 'businessId'> = {
  businessName: 'Lumina',
  logoUrl: undefined, // No default logo URL
  primaryColor: '#FFD25A',
  secondaryColor: '#FF7A5A',
  accentColor: '#0B2B33',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

/**
 * Fetch business branding data from database
 */
export async function getBusinessBranding(
  businessId: string
): Promise<BusinessBranding> {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        logo: true,
        primaryColor: true,
      },
    });

    if (!business) {
      throw new BusinessBrandingError(
        `Business not found: ${businessId}`,
        'BUSINESS_NOT_FOUND'
      );
    }

    // Return business branding with Lumina defaults as fallback
    return {
      businessId: business.id,
      businessName: business.name,
      logoUrl: business.logo || undefined,
      primaryColor:
        business.primaryColor || LUMINA_DEFAULT_BRANDING.primaryColor,
      secondaryColor: LUMINA_DEFAULT_BRANDING.secondaryColor,
      accentColor: LUMINA_DEFAULT_BRANDING.accentColor,
      fontFamily: LUMINA_DEFAULT_BRANDING.fontFamily,
    };
  } catch (error) {
    if (error instanceof BusinessBrandingError) {
      throw error;
    }

    throw new BusinessBrandingError(
      `Failed to fetch business branding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FETCH_ERROR'
    );
  }
}

/**
 * Get default Lumina branding
 * Used when business branding is not configured or as fallback
 */
export function getLuminaBranding(businessId: string): BusinessBranding {
  return {
    businessId,
    ...LUMINA_DEFAULT_BRANDING,
    businessName: 'Lumina',
  };
}

/**
 * Apply business branding to HTML content
 * Replaces branding placeholders in HTML with actual values
 */
export function applyBrandingToHtml(
  html: string,
  branding: BusinessBranding
): string {
  let brandedHtml = html;

  // Replace color placeholders
  if (branding.primaryColor) {
    brandedHtml = brandedHtml.replace(
      /\{primaryColor\}/g,
      branding.primaryColor
    );
  }

  if (branding.secondaryColor) {
    brandedHtml = brandedHtml.replace(
      /\{secondaryColor\}/g,
      branding.secondaryColor
    );
  }

  if (branding.accentColor) {
    brandedHtml = brandedHtml.replace(/\{accentColor\}/g, branding.accentColor);
  }

  // Replace logo placeholder
  if (branding.logoUrl) {
    brandedHtml = brandedHtml.replace(/\{logoUrl\}/g, branding.logoUrl);
  }

  // Replace business name placeholder
  brandedHtml = brandedHtml.replace(/\{businessName\}/g, branding.businessName);

  return brandedHtml;
}

/**
 * Validate business branding configuration
 */
export function validateBranding(branding: BusinessBranding): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Validate business ID
  if (!branding.businessId || branding.businessId.trim() === '') {
    issues.push('Business ID is required');
  }

  // Validate business name
  if (!branding.businessName || branding.businessName.trim() === '') {
    issues.push('Business name is required');
  }

  // Validate color format (hex colors)
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

  if (branding.primaryColor && !hexColorRegex.test(branding.primaryColor)) {
    issues.push('Primary color must be a valid hex color (e.g., #FFD25A)');
  }

  if (branding.secondaryColor && !hexColorRegex.test(branding.secondaryColor)) {
    issues.push('Secondary color must be a valid hex color (e.g., #FF7A5A)');
  }

  if (branding.accentColor && !hexColorRegex.test(branding.accentColor)) {
    issues.push('Accent color must be a valid hex color (e.g., #0B2B33)');
  }

  // Validate logo URL format
  if (branding.logoUrl) {
    try {
      new URL(branding.logoUrl);
    } catch {
      issues.push('Logo URL must be a valid URL');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Merge business branding with defaults
 * Ensures all branding properties have values
 */
export function mergeBrandingWithDefaults(
  branding: Partial<BusinessBranding>,
  businessId: string
): BusinessBranding {
  return {
    businessId,
    businessName: branding.businessName || LUMINA_DEFAULT_BRANDING.businessName,
    logoUrl: branding.logoUrl || LUMINA_DEFAULT_BRANDING.logoUrl,
    primaryColor: branding.primaryColor || LUMINA_DEFAULT_BRANDING.primaryColor,
    secondaryColor:
      branding.secondaryColor || LUMINA_DEFAULT_BRANDING.secondaryColor,
    accentColor: branding.accentColor || LUMINA_DEFAULT_BRANDING.accentColor,
    fontFamily: branding.fontFamily || LUMINA_DEFAULT_BRANDING.fontFamily,
  };
}

/**
 * Check if business has custom branding configured
 */
export async function hasCustomBranding(businessId: string): Promise<boolean> {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        logo: true,
        primaryColor: true,
      },
    });

    if (!business) {
      return false;
    }

    // Consider branding custom if logo or non-default color is set
    return !!(
      business.logo ||
      (business.primaryColor &&
        business.primaryColor !== LUMINA_DEFAULT_BRANDING.primaryColor)
    );
  } catch {
    return false;
  }
}

/**
 * Business Branding Error
 */
export class BusinessBrandingError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'BusinessBrandingError';
  }
}
