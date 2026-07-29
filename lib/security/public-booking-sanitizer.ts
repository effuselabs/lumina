/**
 * Input sanitization specifically for public booking endpoints
 * Implements comprehensive sanitization for untrusted public input
 */

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Sanitization configuration
interface SanitizationConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  maxLength: {
    name: number;
    email: number;
    phone: number;
    notes: number;
    general: number;
  };
}

const defaultConfig: SanitizationConfig = {
  allowedTags: [], // No HTML tags allowed in public booking
  allowedAttributes: {},
  maxLength: {
    name: 100,
    email: 254, // RFC 5321 limit
    phone: 20,
    notes: 1000,
    general: 500,
  },
};

/**
 * Disposable-mailbox providers, matched against the address's domain.
 *
 * Keep this a list of hosts, never substrings of the whole address: matching
 * anywhere in the string is what made the previous check reject legitimate
 * clients whose names happened to contain "temp" or "test".
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'discard.email',
  'dispostable.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'mailinator.com',
  'maildrop.cc',
  'mintemail.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
] as const;

export class PublicBookingSanitizer {
  private config: SanitizationConfig;

  constructor(config?: Partial<SanitizationConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Sanitize client booking data
   */
  sanitizeClientData(data: any): {
    sanitized: any;
    violations: string[];
  } {
    const violations: string[] = [];
    const sanitized: any = {};

    // Sanitize first name
    if (data.firstName) {
      const result = this.sanitizeName(data.firstName, 'firstName');
      sanitized.firstName = result.value;
      violations.push(...result.violations);
    }

    // Sanitize last name
    if (data.lastName) {
      const result = this.sanitizeName(data.lastName, 'lastName');
      sanitized.lastName = result.value;
      violations.push(...result.violations);
    }

    // Sanitize email
    if (data.email) {
      const result = this.sanitizeEmail(data.email);
      sanitized.email = result.value;
      violations.push(...result.violations);
    }

    // Sanitize phone
    if (data.phone) {
      const result = this.sanitizePhone(data.phone);
      sanitized.phone = result.value;
      violations.push(...result.violations);
    }

    // Sanitize notes
    if (data.notes) {
      const result = this.sanitizeNotes(data.notes);
      sanitized.notes = result.value;
      violations.push(...result.violations);
    }

    // Sanitize marketing opt-in (boolean)
    if (typeof data.marketingOptIn === 'boolean') {
      sanitized.marketingOptIn = data.marketingOptIn;
    } else if (data.marketingOptIn !== undefined) {
      violations.push('marketingOptIn must be a boolean value');
      sanitized.marketingOptIn = false; // Default to false for safety
    }

    return { sanitized, violations };
  }

  /**
   * Sanitize booking request data
   */
  sanitizeBookingData(data: any): {
    sanitized: any;
    violations: string[];
  } {
    const violations: string[] = [];
    const sanitized: any = {};

    // Sanitize service IDs (array of strings)
    if (data.services) {
      const result = this.sanitizeServiceIds(data.services);
      sanitized.services = result.value;
      violations.push(...result.violations);
    }

    // Sanitize staff ID
    if (data.staffId) {
      const result = this.sanitizeId(data.staffId, 'staffId');
      sanitized.staffId = result.value;
      violations.push(...result.violations);
    }

    // Sanitize time slot data
    if (data.timeSlot) {
      const result = this.sanitizeTimeSlot(data.timeSlot);
      sanitized.timeSlot = result.value;
      violations.push(...result.violations);
    }

    // Sanitize client data
    if (data.client) {
      const result = this.sanitizeClientData(data.client);
      sanitized.client = result.sanitized;
      violations.push(...result.violations);
    }

    return { sanitized, violations };
  }

  /**
   * Sanitize name fields
   */
  private sanitizeName(
    name: string,
    fieldName: string
  ): {
    value: string;
    violations: string[];
  } {
    const violations: string[] = [];
    let sanitized = name;

    // Remove HTML tags
    sanitized = this.stripHtml(sanitized);

    // Trim whitespace
    sanitized = sanitized.trim();

    // Check length
    if (sanitized.length > this.config.maxLength.name) {
      violations.push(
        `${fieldName} exceeds maximum length of ${this.config.maxLength.name} characters`
      );
      sanitized = sanitized.substring(0, this.config.maxLength.name);
    }

    // Check for suspicious patterns
    if (this.hasSuspiciousPatterns(sanitized)) {
      violations.push(`${fieldName} contains suspicious patterns`);
    }

    // Remove non-name characters (keep letters, spaces, hyphens, apostrophes)
    sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');

    // Normalize multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Check minimum length
    if (sanitized.length < 1) {
      violations.push(`${fieldName} is required and cannot be empty`);
    }

    return { value: sanitized, violations };
  }

  /**
   * Sanitize email field
   */
  private sanitizeEmail(email: string): {
    value: string;
    violations: string[];
  } {
    const violations: string[] = [];
    let sanitized = email;

    // Remove HTML tags
    sanitized = this.stripHtml(sanitized);

    // Trim whitespace
    sanitized = sanitized.trim().toLowerCase();

    // Check length
    if (sanitized.length > this.config.maxLength.email) {
      violations.push(
        `Email exceeds maximum length of ${this.config.maxLength.email} characters`
      );
      sanitized = sanitized.substring(0, this.config.maxLength.email);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      violations.push('Invalid email format');
    }

    // Check for suspicious email patterns
    if (this.isSuspiciousEmail(sanitized)) {
      violations.push('Email appears to be suspicious or temporary');
    }

    return { value: sanitized, violations };
  }

  /**
   * Sanitize phone field
   */
  private sanitizePhone(phone: string): {
    value: string;
    violations: string[];
  } {
    const violations: string[] = [];
    let sanitized = phone;

    // Remove HTML tags
    sanitized = this.stripHtml(sanitized);

    // Remove all non-digit characters except + and spaces
    sanitized = sanitized.replace(/[^\d\+\s\-\(\)]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Check length
    if (sanitized.length > this.config.maxLength.phone) {
      violations.push(
        `Phone number exceeds maximum length of ${this.config.maxLength.phone} characters`
      );
      sanitized = sanitized.substring(0, this.config.maxLength.phone);
    }

    // Basic phone validation (at least 10 digits)
    const digitsOnly = sanitized.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      violations.push('Phone number must contain at least 10 digits');
    }

    return { value: sanitized, violations };
  }

  /**
   * Sanitize notes field
   */
  private sanitizeNotes(notes: string): {
    value: string;
    violations: string[];
  } {
    const violations: string[] = [];
    let sanitized = notes;

    // Remove HTML tags
    sanitized = this.stripHtml(sanitized);

    // Trim whitespace
    sanitized = sanitized.trim();

    // Check length
    if (sanitized.length > this.config.maxLength.notes) {
      violations.push(
        `Notes exceed maximum length of ${this.config.maxLength.notes} characters`
      );
      sanitized = sanitized.substring(0, this.config.maxLength.notes);
    }

    // Check for suspicious patterns
    if (this.hasSuspiciousPatterns(sanitized)) {
      violations.push('Notes contain suspicious patterns');
    }

    // Remove potentially dangerous characters but keep basic punctuation
    sanitized = sanitized.replace(/[<>{}[\]\\]/g, '');

    // Normalize line breaks
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Limit consecutive line breaks
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

    return { value: sanitized, violations };
  }

  /**
   * Sanitize service IDs array
   */
  private sanitizeServiceIds(services: any): {
    value: string[];
    violations: string[];
  } {
    const violations: string[] = [];
    let sanitized: string[] = [];

    if (!Array.isArray(services)) {
      violations.push('Services must be an array');
      return { value: [], violations };
    }

    // Limit number of services
    if (services.length > 5) {
      violations.push('Maximum 5 services allowed per booking');
      services = services.slice(0, 5);
    }

    for (const service of services) {
      const result = this.sanitizeId(service, 'service ID');
      if (result.value) {
        sanitized.push(result.value);
      }
      violations.push(...result.violations);
    }

    // Remove duplicates
    sanitized = [...new Set(sanitized)];

    return { value: sanitized, violations };
  }

  /**
   * Sanitize ID fields (CUID format expected)
   */
  private sanitizeId(
    id: any,
    fieldName: string
  ): {
    value: string;
    violations: string[];
  } {
    const violations: string[] = [];

    if (typeof id !== 'string') {
      violations.push(`${fieldName} must be a string`);
      return { value: '', violations };
    }

    let sanitized = id.trim();

    // Remove HTML tags
    sanitized = this.stripHtml(sanitized);

    // CUID validation (basic pattern check)
    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (!cuidRegex.test(sanitized)) {
      violations.push(`${fieldName} has invalid format`);
    }

    return { value: sanitized, violations };
  }

  /**
   * Sanitize time slot data
   */
  private sanitizeTimeSlot(timeSlot: any): {
    value: any;
    violations: string[];
  } {
    const violations: string[] = [];
    const sanitized: any = {};

    if (typeof timeSlot !== 'object' || timeSlot === null) {
      violations.push('Time slot must be an object');
      return { value: {}, violations };
    }

    // Sanitize start time
    if (timeSlot.startTime) {
      const startTime = new Date(timeSlot.startTime);
      if (isNaN(startTime.getTime())) {
        violations.push('Invalid start time format');
      } else {
        sanitized.startTime = startTime.toISOString();
      }
    }

    // Sanitize end time
    if (timeSlot.endTime) {
      const endTime = new Date(timeSlot.endTime);
      if (isNaN(endTime.getTime())) {
        violations.push('Invalid end time format');
      } else {
        sanitized.endTime = endTime.toISOString();
      }
    }

    // Sanitize staff ID
    if (timeSlot.staffId) {
      const result = this.sanitizeId(timeSlot.staffId, 'staff ID');
      sanitized.staffId = result.value;
      violations.push(...result.violations);
    }

    return { value: sanitized, violations };
  }

  /**
   * Strip HTML tags using DOMPurify
   */
  private stripHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: this.config.allowedTags,
      ALLOWED_ATTR: this.config.allowedAttributes,
      KEEP_CONTENT: true,
    } as any) as unknown as string;
  }

  /**
   * Check for suspicious patterns in text
   */
  private hasSuspiciousPatterns(text: string): boolean {
    const suspiciousPatterns = [
      // Script injection attempts
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,

      // SQL injection attempts
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,

      // XSS attempts
      /alert\s*\(/i,
      /document\./i,
      /window\./i,

      // Suspicious URLs
      /https?:\/\/[^\s]+/i,

      // Excessive special characters
      /[!@#$%^&*()]{5,}/,

      // Repeated characters (potential spam)
      /(.)\1{10,}/,

      // Base64 encoded content (potential payload)
      /^[A-Za-z0-9+/]{20,}={0,2}$/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check for suspicious email patterns
   */
  private isSuspiciousEmail(email: string): boolean {
    /*
     * This check fires on the last step of the booking flow, so a false
     * positive costs a real appointment: the client is told "Please check
     * your input and try again" about an address that is entirely valid,
     * and there is nothing they can change to get past it.
     *
     * The rules this replaces rejected, among others:
     *   - `sarah1990@gmail.com`  — matched /^[a-z]+\d+@/, "letters then
     *     digits", which describes an enormous share of personal addresses
     *   - `stempel@gmail.com`, `contested@gmail.com`, `tempest@…`,
     *     `testa.maria@…` — the words test/temp/fake/spam/throwaway were
     *     matched anywhere in the string, including inside surnames
     *   - `jo@example.org` — two-character local parts are legal and real
     *
     * What remains is narrow and defensible: known disposable-mailbox
     * providers, matched on the DOMAIN (exact host or a subdomain of it, so
     * `mailinator-reviews.example.com` is not caught), plus two structural
     * signals that no deliverable address has.
     */
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) {
      return false; // Format is reported separately by the regex check.
    }

    const localPart = email.slice(0, atIndex);
    const domain = email.slice(atIndex + 1).toLowerCase();

    const isDisposableDomain = DISPOSABLE_EMAIL_DOMAINS.some(
      blocked => domain === blocked || domain.endsWith(`.${blocked}`)
    );

    if (isDisposableDomain) {
      return true;
    }

    // Consecutive dots are invalid in an unquoted local part (RFC 5322).
    if (/\.{2,}/.test(localPart)) {
      return true;
    }

    // A run of 10+ digits as the whole local part is machine-generated, not
    // a person. Scoped to the local part so long numeric domains are safe.
    if (/^\d{10,}$/.test(localPart)) {
      return true;
    }

    return false;
  }
}

// Global instance for public booking sanitization
export const publicBookingSanitizer = new PublicBookingSanitizer();

/**
 * Sanitize client booking data
 */
export function sanitizeClientBookingData(data: any): {
  sanitized: any;
  violations: string[];
} {
  return publicBookingSanitizer.sanitizeClientData(data);
}

/**
 * Sanitize booking request data
 */
export function sanitizeBookingRequestData(data: any): {
  sanitized: any;
  violations: string[];
} {
  return publicBookingSanitizer.sanitizeBookingData(data);
}

/**
 * Validation schemas with sanitization
 */
export const publicBookingSchemas = {
  clientData: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().max(254),
    phone: z.string().min(10).max(20),
    notes: z.string().max(1000).optional(),
    marketingOptIn: z.boolean().default(false),
  }),

  bookingRequest: z.object({
    services: z
      .array(z.string().regex(/^c[a-z0-9]{24}$/))
      .min(1)
      .max(5),
    staffId: z.string().regex(/^c[a-z0-9]{24}$/),
    timeSlot: z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      staffId: z.string().regex(/^c[a-z0-9]{24}$/),
    }),
    client: z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email().max(254),
      phone: z.string().min(10).max(20),
      notes: z.string().max(1000).optional(),
      marketingOptIn: z.boolean().default(false),
    }),
  }),
};
