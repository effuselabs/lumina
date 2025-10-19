import { prisma } from '@/lib/prisma';
import { Client } from '@prisma/client';

export interface ClientLookupParams {
    businessId: string;
    email?: string;
    phone?: string;
}

export interface ClientCreateData {
    businessId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes?: string;
    marketingOptIn: boolean;
    source: 'public_booking';
}

export interface ClientLookupResult {
    clientExists: boolean;
    clientData?: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        marketingOptIn: boolean;
    };
}

export class ClientService {
    /**
     * Look up existing client by email or phone number
     */
    static async lookupClient(params: ClientLookupParams): Promise<ClientLookupResult> {
        const { businessId, email, phone } = params;

        if (!email && !phone) {
            return { clientExists: false };
        }

        try {
            // Build where clause for client lookup
            const whereClause: any = {
                businessId,
                isActive: true,
            };

            // Add email or phone conditions
            const orConditions: any[] = [];
            if (email) {
                orConditions.push({ email: email.toLowerCase().trim() });
            }
            if (phone) {
                // Normalize phone number for lookup
                const normalizedPhone = this.normalizePhoneNumber(phone);
                orConditions.push({ phone: normalizedPhone });
            }

            if (orConditions.length > 0) {
                whereClause.OR = orConditions;
            }

            const existingClient = await prisma.client.findFirst({
                where: whereClause,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    // marketingOptIn: true, // Property doesn't exist in schema
                },
            });

            if (existingClient) {
                return {
                    clientExists: true,
                    clientData: {
                        firstName: existingClient.firstName,
                        lastName: existingClient.lastName,
                        email: existingClient.email ?? '',
                        phone: existingClient.phone ?? '',
                        marketingOptIn: (existingClient as any).emailMarketing || false,
                    },
                };
            }

            return { clientExists: false };
        } catch (error) {
            console.error('Error looking up client:', error);
            throw new Error('Failed to lookup client information');
        }
    }

    /**
     * Create a new client profile
     */
    static async createClient(data: ClientCreateData): Promise<Client> {
        try {
            // Normalize data
            const normalizedData = {
                ...data,
                email: data.email.toLowerCase().trim(),
                phone: this.normalizePhoneNumber(data.phone),
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                notes: data.notes?.trim() || null,
            };

            // Check if client already exists
            const existingClient = await prisma.client.findFirst({
                where: {
                    businessId: data.businessId,
                    OR: [
                        { email: normalizedData.email },
                        { phone: normalizedData.phone },
                    ],
                    // isActive: true, // Property doesn't exist in Client model
                },
            });

            if (existingClient) {
                // Update existing client with new information
                return await prisma.client.update({
                    where: { id: existingClient.id },
                    data: {
                        firstName: normalizedData.firstName,
                        lastName: normalizedData.lastName,
                        email: normalizedData.email,
                        phone: normalizedData.phone,
                        emailMarketing: normalizedData.marketingOptIn,
                        smsMarketing: normalizedData.marketingOptIn,
                        notes: normalizedData.notes,
                        updatedAt: new Date(),
                    },
                });
            }

            // Create new client
            const newClient = await prisma.client.create({
                data: {
                    businessId: normalizedData.businessId,
                    firstName: normalizedData.firstName,
                    lastName: normalizedData.lastName,
                    email: normalizedData.email,
                    phone: normalizedData.phone,
                    emailMarketing: normalizedData.marketingOptIn,
                    smsMarketing: normalizedData.marketingOptIn,
                    notes: normalizedData.notes,
                },
            });

            return newClient;
        } catch (error) {
            console.error('Error creating client:', error);
            throw new Error('Failed to create client profile');
        }
    }

    /**
     * Get client by ID with business scoping
     */
    static async getClientById(clientId: string, businessId: string): Promise<Client | null> {
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
        data: Partial<ClientCreateData>
    ): Promise<Client> {
        try {
            // Verify client belongs to business
            const existingClient = await this.getClientById(clientId, businessId);
            if (!existingClient) {
                throw new Error('Client not found');
            }

            // Normalize update data
            const updateData: any = {};
            if (data.firstName) updateData.firstName = data.firstName.trim();
            if (data.lastName) updateData.lastName = data.lastName.trim();
            if (data.email) updateData.email = data.email.toLowerCase().trim();
            if (data.phone) updateData.phone = this.normalizePhoneNumber(data.phone);
            if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
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
    static validateClientData(data: Partial<ClientCreateData>): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (data.firstName && (data.firstName.length < 2 || data.firstName.length > 50)) {
            errors.push('First name must be between 2 and 50 characters');
        }

        if (data.lastName && (data.lastName.length < 2 || data.lastName.length > 50)) {
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
                orderBy: [
                    { lastName: 'asc' },
                    { firstName: 'asc' },
                ],
                take: limit,
            });
        } catch (error) {
            console.error('Error searching clients:', error);
            throw new Error('Failed to search clients');
        }
    }
}