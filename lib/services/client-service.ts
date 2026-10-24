import { prisma } from '@/lib/prisma';
import { Client, Prisma } from '@prisma/client';

export interface BookingClientData {
  businessId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  marketingOptIn: boolean;
}

export class ClientService {
  /**
   * The client a public booking belongs to: an existing one matched by email,
   * then by phone, or a new one made from what was typed.
   *
   * An existing client's record is never changed. The person booking is a
   * stranger to the server — anyone can type anyone's email or phone number —
   * so a booking used to be able to overwrite a client's saved name, marketing
   * consent and notes. What they typed is kept on the appointment instead
   * (`clientName`, `clientEmail`, `clientPhone`), for staff to reconcile.
   *
   * `Client` is unique on (businessId, email) and on (businessId, phone)
   * separately, so the two can match different people (a household sharing a
   * phone); the email match wins.
   */
  static async findOrCreateForBooking(
    data: BookingClientData
  ): Promise<{ client: Client; created: boolean }> {
    const email = data.email.toLowerCase().trim();
    const phone = this.normalizePhoneNumber(data.phone);

    const [emailMatch, phoneMatch] = await Promise.all([
      prisma.client.findUnique({
        where: { businessId_email: { businessId: data.businessId, email } },
      }),
      prisma.client.findUnique({
        where: { businessId_phone: { businessId: data.businessId, phone } },
      }),
    ]);

    const existing = emailMatch ?? phoneMatch;
    if (existing) return { client: existing, created: false };

    const client = await prisma.client.create({
      data: {
        businessId: data.businessId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        phone,
        emailMarketing: data.marketingOptIn,
        smsMarketing: data.marketingOptIn,
        notes: data.notes?.trim() || null,
      },
    });
    return { client, created: true };
  }

  /**
   * Get client by ID with business scoping
   */
  static async getClientById(
    clientId: string,
    businessId: string
  ): Promise<Client | null> {
    try {
      return await prisma.client.findFirst({
        where: {
          id: clientId,
          businessId,
        },
      });
    } catch (error) {
      console.error('Error getting client by ID:', error);
      throw new Error('Failed to retrieve client information');
    }
  }

  /**
   * Update client information
   */
  static async updateClient(
    clientId: string,
    businessId: string,
    data: Partial<BookingClientData>
  ): Promise<Client> {
    try {
      // Verify client belongs to business
      const existingClient = await this.getClientById(clientId, businessId);
      if (!existingClient) {
        throw new Error('Client not found');
      }

      // Normalize update data
      const updateData: Prisma.ClientUpdateInput = {};
      if (data.firstName) updateData.firstName = data.firstName.trim();
      if (data.lastName) updateData.lastName = data.lastName.trim();
      if (data.email) updateData.email = data.email.toLowerCase().trim();
      if (data.phone) updateData.phone = this.normalizePhoneNumber(data.phone);
      if (data.notes !== undefined)
        updateData.notes = data.notes?.trim() || null;
      if (data.marketingOptIn !== undefined) {
        updateData.emailMarketing = data.marketingOptIn;
        updateData.smsMarketing = data.marketingOptIn;
      }

      updateData.updatedAt = new Date();

      return await prisma.client.update({
        where: { id: clientId },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating client:', error);
      throw new Error('Failed to update client information');
    }
  }

  /**
   * Normalize phone number for consistent storage and lookup
   */
  private static normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with +1 and has 11 digits total, keep as is
    if (cleaned.startsWith('+1') && cleaned.length === 12) {
      return cleaned;
    }

    // If it starts with 1 and has 11 digits, add +
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+${cleaned}`;
    }

    // If it has 10 digits, assume US number and add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    // For international numbers starting with +, keep as is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Default: return as is with + prefix if not present
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  /**
   * Validate client data before creation/update
   */
  static validateClientData(data: Partial<BookingClientData>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (
      data.firstName &&
      (data.firstName.length < 2 || data.firstName.length > 50)
    ) {
      errors.push('First name must be between 2 and 50 characters');
    }

    if (
      data.lastName &&
      (data.lastName.length < 2 || data.lastName.length > 50)
    ) {
      errors.push('Last name must be between 2 and 50 characters');
    }

    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    if (data.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(data.phone.replace(/[^\d+]/g, ''))) {
        errors.push('Invalid phone number format');
      }
    }

    if (data.notes && data.notes.length > 500) {
      errors.push('Notes must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Search clients by name, email, or phone
   */
  static async searchClients(
    businessId: string,
    query: string,
    limit: number = 10
  ): Promise<Client[]> {
    try {
      const searchTerm = query.toLowerCase().trim();

      return await prisma.client.findMany({
        where: {
          businessId,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm } },
          ],
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: limit,
      });
    } catch (error) {
      console.error('Error searching clients:', error);
      throw new Error('Failed to search clients');
    }
  }
}
