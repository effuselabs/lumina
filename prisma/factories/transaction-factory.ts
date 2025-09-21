/**
 * TransactionFactory - Generate comprehensive financial transaction system with 400+ transactions
 */

import { faker } from '@faker-js/faker';
import {
    EmploymentType,
    PaymentMethod,
    PrismaClient,
    Transaction,
    TransactionStatus,
    TransactionType
} from '@prisma/client';
import { BaseFactory } from './base-factory';
import { PaymentMethodDistribution, TransactionTypeConfig, ValidationResult } from './types';

export interface TransactionProfile {
    appointmentId?: string;
    staffId?: string;
    userId?: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    currency: string;
    paymentMethod?: PaymentMethod;
    paymentId?: string;
    staffEmploymentType?: EmploymentType;
    commissionRate?: number;
    commissionAmount?: number;
    chairRentalApplicable: boolean;
    description?: string;
    metadata?: any;
}

export interface TransactionFactoryOptions {
    startDate?: Date;
    endDate?: Date;
    paymentDistribution?: PaymentMethodDistribution;
    transactionConfig?: TransactionTypeConfig;
    targetCount?: number;
}

export interface FinancialContext {
    appointments: Array<{
        id: string;
        staffId: string;
        status: string;
        startTime: Date;
        services: Array<{
            serviceName: string;
            price: number;
        }>;
        staff: {
            employmentType: EmploymentType;
            commissionRate?: number;
            chairRentalAmount?: number;
        };
    }>;
    staff: Array<{
        id: string;
        displayName: string;
        employmentType: EmploymentType;
        commissionRate?: number;
        chairRentalAmount?: number;
    }>;
}

export class TransactionFactory extends BaseFactory<Transaction> {
    private financialContext: FinancialContext = { appointments: [], staff: [] };
    private paymentDistribution: PaymentMethodDistribution;
    private transactionConfig: TransactionTypeConfig;

    constructor(
        prisma: PrismaClient,
        businessId: string,
        paymentDistribution: PaymentMethodDistribution,
        transactionConfig: TransactionTypeConfig
    ) {
        super(prisma, businessId);
        this.paymentDistribution = paymentDistribution;
        this.transactionConfig = transactionConfig;
    }

    /**
     * Initialize factory with financial context
     */
    async initialize(): Promise<void> {
        console.log('🔧 Initializing TransactionFactory...');

        // Load completed appointments with services and staff details
        const appointmentsData = await this.prisma.appointment.findMany({
            where: {
                businessId: this.businessId,
                status: 'COMPLETED'
            },
            include: {
                services: {
                    select: {
                        serviceName: true,
                        price: true
                    }
                },
                staff: {
                    select: {
                        employmentType: true,
                        commissionRate: true,
                        chairRentalAmount: true
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        });

        this.financialContext.appointments = appointmentsData.map(apt => ({
            id: apt.id,
            staffId: apt.staffId,
            status: apt.status,
            startTime: apt.startTime,
            services: apt.services.map(svc => ({
                serviceName: svc.serviceName,
                price: Number(svc.price)
            })),
            staff: {
                employmentType: apt.staff.employmentType,
                commissionRate: apt.staff.commissionRate ? Number(apt.staff.commissionRate) : undefined,
                chairRentalAmount: apt.staff.chairRentalAmount ? Number(apt.staff.chairRentalAmount) : undefined
            }
        }));

        // Load staff for standalone transactions
        const staffData = await this.prisma.staff.findMany({
            where: { businessId: this.businessId, isActive: true },
            select: {
                id: true,
                displayName: true,
                employmentType: true,
                commissionRate: true,
                chairRentalAmount: true
            }
        });

        this.financialContext.staff = staffData.map(staff => ({
            id: staff.id,
            displayName: staff.displayName,
            employmentType: staff.employmentType,
            commissionRate: staff.commissionRate ? Number(staff.commissionRate) : undefined,
            chairRentalAmount: staff.chairRentalAmount ? Number(staff.chairRentalAmount) : undefined
        }));

        console.log(`  Loaded ${this.financialContext.appointments.length} completed appointments`);
        console.log(`  Loaded ${this.financialContext.staff.length} staff members`);

        if (this.financialContext.appointments.length === 0) {
            throw new Error('Cannot generate transactions without completed appointments');
        }

        console.log('✅ TransactionFactory initialized');
    }

    /**
     * Generate a single transaction
     */
    async generate(options?: TransactionFactoryOptions): Promise<Transaction> {
        const profile = this.generateTransactionProfile(options);
        const transactionData = this.profileToTransactionData(profile);

        const validation = this.validate(transactionData);
        if (!validation.isValid) {
            throw new Error(`Transaction validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        try {
            const transaction = await this.prisma.transaction.create({
                data: transactionData
            });

            return transaction;
        } catch (error) {
            console.error('Failed to create transaction:', error);
            throw error;
        }
    }

    /**
     * Generate comprehensive transaction profile
     */
    private generateTransactionProfile(options?: TransactionFactoryOptions): TransactionProfile {
        // Determine transaction type based on realistic distribution
        const transactionType = this.generateTransactionType();

        switch (transactionType) {
            case 'PAYMENT':
                return this.generatePaymentTransaction(options);
            case 'TIP':
                return this.generateTipTransaction(options);
            case 'REFUND':
                return this.generateRefundTransaction(options);
            case 'COMMISSION':
                return this.generateCommissionTransaction(options);
            case 'CHAIR_RENTAL':
                return this.generateChairRentalTransaction(options);
            case 'DEPOSIT':
                return this.generateDepositTransaction(options);
            default:
                return this.generatePaymentTransaction(options);
        }
    }

    /**
     * Generate transaction type based on realistic distribution
     */
    private generateTransactionType(): TransactionType {
        const types: TransactionType[] = ['PAYMENT', 'TIP', 'REFUND', 'COMMISSION', 'CHAIR_RENTAL', 'DEPOSIT'];
        const weights = [70, 15, 2, 8, 3, 2]; // 70% payments, 15% tips, etc.
        return this.weightedRandom(types, weights);
    }

    /**
     * Generate payment transaction for completed appointment
     */
    private generatePaymentTransaction(options?: TransactionFactoryOptions): TransactionProfile {
        const appointment = faker.helpers.arrayElement(this.financialContext.appointments);

        // Calculate service total
        const serviceTotal = appointment.services.reduce((sum, service) => sum + service.price, 0);

        // Generate payment method
        const paymentMethod = this.generatePaymentMethod();

        // Generate payment ID for non-cash transactions
        const paymentId = paymentMethod === 'CASH' ? undefined : this.generatePaymentId(paymentMethod);

        return {
            appointmentId: appointment.id,
            staffId: appointment.staffId,
            type: 'PAYMENT',
            status: 'COMPLETED',
            amount: serviceTotal,
            currency: 'USD',
            paymentMethod,
            paymentId,
            staffEmploymentType: appointment.staff.employmentType,
            commissionRate: appointment.staff.commissionRate,
            commissionAmount: this.calculateCommissionAmount(serviceTotal, appointment.staff),
            chairRentalApplicable: appointment.staff.employmentType === 'CHAIR_RENTAL' || appointment.staff.employmentType === 'HYBRID',
            description: `Payment for services: ${appointment.services.map(s => s.serviceName).join(', ')}`,
            metadata: {
                serviceCount: appointment.services.length,
                appointmentDate: appointment.startTime.toISOString(),
                paymentProcessedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Generate tip transaction
     */
    private generateTipTransaction(options?: TransactionFactoryOptions): TransactionProfile {
        const appointment = faker.helpers.arrayElement(this.financialContext.appointments);

        // Calculate service total for tip calculation
        const serviceTotal = appointment.services.reduce((sum, service) => sum + service.price, 0);

        // Generate tip amount (15-20% average with variation)
        const tipPercentage = faker.number.float({
            min: this.transactionConfig.tips.range[0],
            max: this.transactionConfig.tips.range[1]
        });
        const tipAmount = Math.round(serviceTotal * (tipPercentage / 100));

        // Tips usually follow the same payment method as the service payment
        const paymentMethod = this.generatePaymentMethod();
        const paymentId = paymentMethod === 'CASH' ? undefined : this.generatePaymentId(paymentMethod);

        return {
            appointmentId: appointment.id,
            staffId: appointment.staffId,
            type: 'TIP',
            status: 'COMPLETED',
            amount: tipAmount,
            currency: 'USD',
            paymentMethod,
            paymentId,
            staffEmploymentType: appointment.staff.employmentType,
            chairRentalApplicable: false, // Tips typically go directly to staff
            description: `Tip for services (${tipPercentage.toFixed(1)}%)`,
            metadata: {
                tipPercentage,
                serviceTotal,
                appointmentDate: appointment.startTime.toISOString()
            }
        };
    }

    /**
     * Generate refund transaction
     */
    private generateRefundTransaction(options?: TransactionFactoryOptions): TransactionProfile {
        const appointment = faker.helpers.arrayElement(this.financialContext.appointments);

        // Refunds can be partial or full
        const serviceTotal = appointment.services.reduce((sum, service) => sum + service.price, 0);
        const isPartialRefund = faker.number.float() < 0.3; // 30% are partial refunds
        const refundAmount = isPartialRefund
            ? Math.round(serviceTotal * faker.number.float({ min: 0.3, max: 0.8 }))
            : serviceTotal;

        const refundReasons = [
            'Client dissatisfaction with service',
            'Service not completed as requested',
            'Allergic reaction to products',
            'Staff error during service',
            'Client complaint resolution',
            'Goodwill gesture',
            'Product defect compensation'
        ];

        return {
            appointmentId: appointment.id,
            staffId: appointment.staffId,
            type: 'REFUND',
            status: 'COMPLETED',
            amount: -refundAmount, // Negative amount for refunds
            currency: 'USD',
            paymentMethod: 'CARD', // Most refunds go back to card
            paymentId: this.generatePaymentId('CARD'),
            staffEmploymentType: appointment.staff.employmentType,
            commissionAmount: this.calculateCommissionAdjustment(refundAmount, appointment.staff),
            chairRentalApplicable: false,
            description: `Refund: ${faker.helpers.arrayElement(refundReasons)}`,
            metadata: {
                originalAmount: serviceTotal,
                refundAmount,
                isPartialRefund,
                refundReason: faker.helpers.arrayElement(refundReasons),
                processedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Generate commission transaction
     */
    private generateCommissionTransaction(options?: TransactionFactoryOptions): TransactionProfile {
        const staff = faker.helpers.arrayElement(
            this.financialContext.staff.filter(s => s.employmentType === 'COMMISSION' || s.employmentType === 'HYBRID')
        );

        // Find appointments for this staff member in the last week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const staffAppointments = this.financialContext.appointments.filter(
            apt => apt.staffId === staff.id && apt.startTime >= weekAgo
        );

        if (staffAppointments.length === 0) {
            // Fallback to any appointment for this staff
            const anyStaffAppointment = this.financialContext.appointments.find(apt => apt.staffId === staff.id);
            if (anyStaffAppointment) {
                staffAppointments.push(anyStaffAppointment);
            }
        }

        // Calculate total revenue for commission period
        const totalRevenue = staffAppointments.reduce((sum, apt) =>
            sum + apt.services.reduce((svcSum, svc) => svcSum + svc.price, 0), 0
        );

        const commissionRate = staff.commissionRate || 50;
        const commissionAmount = Math.round(totalRevenue * (commissionRate / 100));

        return {
            staffId: staff.id,
            type: 'COMMISSION',
            status: 'COMPLETED',
            amount: commissionAmount,
            currency: 'USD',
            staffEmploymentType: staff.employmentType,
            commissionRate,
            commissionAmount,
            chairRentalApplicable: false,
            description: `Weekly commission payment (${commissionRate}% of $${totalRevenue})`,
            metadata: {
                commissionPeriodStart: weekAgo.toISOString(),
                commissionPeriodEnd: new Date().toISOString(),
                totalRevenue,
                commissionRate,
                appointmentCount: staffAppointments.length
            }
        };
    }

    /**
     * Generate chair rental transaction
     */
    private generateChairRentalTransaction(options?: TransactionFactoryOptions): TransactionProfile {
        const staff = faker.helpers.arrayElement(
            this.financialContext.staff.filter(s => s.employmentType === 'CHAIR_RENTAL' || s.employmentType === 'HYBRID')
        );

        const rentalAmount = staff.chairRentalAmount || 200; // Default weekly rental

        const rentalPeriods = ['Weekly', 'Monthly', 'Daily'];
        const rentalPeriod = faker.helpers.arrayElement(rentalPeriods);

        return {
            staffId: staff.id,
            type: 'CHAIR_RENTAL',
            status: 'COMPLETED',
            amount: -rentalAmount, // Negative because it's money owed by staff
            currency: 'USD',
            paymentMethod: 'BANK_TRANSFER',
            staffEmploymentType: staff.employmentType,
            chairRentalApplicable: true,
            description: `${rentalPeriod} chair rental fee`,
            metadata: {
                rentalPeriod,
                rentalAmount,
                dueDate: new Date().toISOString(),
                staffName: staff.displayName
            }
        };
    }

    /**
     * Generate deposit transaction
     */
    private generateDepositTransaction(options?: TransactionFactoryOptions): TransactionProfile {
        const appointment = faker.helpers.arrayElement(this.financialContext.appointments);

        const serviceTotal = appointment.services.reduce((sum, service) => sum + service.price, 0);
        const depositAmount = Math.round(serviceTotal * 0.2); // 20% deposit

        const paymentMethod = this.generatePaymentMethod();
        const paymentId = paymentMethod === 'CASH' ? undefined : this.generatePaymentId(paymentMethod);

        return {
            appointmentId: appointment.id,
            staffId: appointment.staffId,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: depositAmount,
            currency: 'USD',
            paymentMethod,
            paymentId,
            staffEmploymentType: appointment.staff.employmentType,
            chairRentalApplicable: false,
            description: `Deposit for upcoming appointment (20% of $${serviceTotal})`,
            metadata: {
                depositPercentage: 20,
                totalServiceAmount: serviceTotal,
                appointmentDate: appointment.startTime.toISOString()
            }
        };
    }

    /**
     * Generate payment method based on distribution
     */
    private generatePaymentMethod(): PaymentMethod {
        const methods: PaymentMethod[] = ['CASH', 'CARD', 'DIGITAL_WALLET', 'OTHER'];
        const weights = [
            this.paymentDistribution.cash * 100,
            this.paymentDistribution.card * 100,
            this.paymentDistribution.digital * 100,
            this.paymentDistribution.other * 100
        ];
        return this.weightedRandom(methods, weights);
    }

    /**
     * Generate payment ID for non-cash transactions
     */
    private generatePaymentId(paymentMethod: PaymentMethod): string {
        switch (paymentMethod) {
            case 'CARD':
                return `ch_${faker.string.alphanumeric(24)}`; // Stripe-style charge ID
            case 'DIGITAL_WALLET':
                return `dw_${faker.string.alphanumeric(20)}`;
            case 'BANK_TRANSFER':
                return `bt_${faker.string.alphanumeric(16)}`;
            default:
                return `tx_${faker.string.alphanumeric(18)}`;
        }
    }

    /**
     * Calculate commission amount based on staff employment type
     */
    private calculateCommissionAmount(
        serviceTotal: number,
        staff: { employmentType: EmploymentType; commissionRate?: number }
    ): number | undefined {
        if (staff.employmentType === 'COMMISSION' || staff.employmentType === 'HYBRID') {
            const rate = staff.commissionRate || 50;
            return Math.round(serviceTotal * (rate / 100));
        }
        return undefined;
    }

    /**
     * Calculate commission adjustment for refunds
     */
    private calculateCommissionAdjustment(
        refundAmount: number,
        staff: { employmentType: EmploymentType; commissionRate?: number }
    ): number | undefined {
        if (staff.employmentType === 'COMMISSION' || staff.employmentType === 'HYBRID') {
            const rate = staff.commissionRate || 50;
            return -Math.round(refundAmount * (rate / 100)); // Negative adjustment
        }
        return undefined;
    }

    /**
     * Convert transaction profile to Prisma data
     */
    private profileToTransactionData(profile: TransactionProfile): any {
        return {
            businessId: this.businessId,
            appointmentId: profile.appointmentId,
            staffId: profile.staffId,
            userId: profile.userId,
            type: profile.type,
            status: profile.status,
            amount: profile.amount,
            currency: profile.currency,
            paymentMethod: profile.paymentMethod,
            paymentId: profile.paymentId,
            staffEmploymentType: profile.staffEmploymentType,
            commissionRate: profile.commissionRate,
            commissionAmount: profile.commissionAmount,
            chairRentalApplicable: profile.chairRentalApplicable,
            description: profile.description,
            metadata: profile.metadata
        };
    }

    /**
     * Validate transaction data
     */
    protected validate(data: any): ValidationResult {
        const errors: any[] = [];

        // Required fields
        if (!data.businessId) {
            errors.push({ field: 'businessId', message: 'Business ID is required', code: 'REQUIRED' });
        }

        if (!data.type) {
            errors.push({ field: 'type', message: 'Transaction type is required', code: 'REQUIRED' });
        }

        if (!data.status) {
            errors.push({ field: 'status', message: 'Transaction status is required', code: 'REQUIRED' });
        }

        if (data.amount === undefined || data.amount === null) {
            errors.push({ field: 'amount', message: 'Transaction amount is required', code: 'REQUIRED' });
        }

        // Validate amount logic
        if (data.type === 'REFUND' && data.amount > 0) {
            errors.push({ field: 'amount', message: 'Refund amount must be negative', code: 'INVALID_VALUE' });
        }

        if (data.type === 'CHAIR_RENTAL' && data.amount > 0) {
            errors.push({ field: 'amount', message: 'Chair rental amount must be negative (expense)', code: 'INVALID_VALUE' });
        }

        if (['PAYMENT', 'TIP', 'COMMISSION', 'DEPOSIT'].includes(data.type) && data.amount < 0) {
            errors.push({ field: 'amount', message: `${data.type} amount must be positive`, code: 'INVALID_VALUE' });
        }

        // Validate commission data
        if (data.commissionRate && (data.commissionRate < 0 || data.commissionRate > 100)) {
            errors.push({ field: 'commissionRate', message: 'Commission rate must be between 0 and 100', code: 'INVALID_RANGE' });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }

    /**
     * Generate comprehensive financial transactions for a business
     */
    async generateComprehensiveTransactions(
        targetCount: number = 400,
        options?: TransactionFactoryOptions,
        progressCallback?: (processed: number, total: number) => void
    ): Promise<Transaction[]> {
        await this.initialize();

        console.log(`Generating ${targetCount} comprehensive financial transactions...`);

        const transactions: Transaction[] = [];

        // Generate transactions in batches
        const batchSize = 25;
        const totalBatches = Math.ceil(targetCount / batchSize);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batchStart = batchIndex * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, targetCount);
            const batchCount = batchEnd - batchStart;

            const batchPromises: Promise<Transaction>[] = [];
            for (let i = 0; i < batchCount; i++) {
                batchPromises.push(this.generate(options));
            }

            try {
                const batchResults = await Promise.all(batchPromises);
                transactions.push(...batchResults);

                if (progressCallback) {
                    progressCallback(transactions.length, targetCount);
                }

                // Small delay between batches
                if (batchIndex < totalBatches - 1) {
                    await this.delay(50);
                }
            } catch (error) {
                console.error(`Error in transaction batch ${batchIndex + 1}:`, error);
                throw error;
            }
        }

        console.log(`✅ Generated ${transactions.length} comprehensive financial transactions`);

        // Generate summary statistics
        this.logTransactionSummary(transactions);

        return transactions;
    }

    /**
     * Log transaction summary statistics
     */
    private logTransactionSummary(transactions: Transaction[]): void {
        const summary = {
            total: transactions.length,
            byType: {} as Record<string, number>,
            byPaymentMethod: {} as Record<string, number>,
            totalRevenue: 0,
            totalRefunds: 0,
            totalTips: 0,
            totalCommissions: 0
        };

        transactions.forEach(tx => {
            // Count by type
            summary.byType[tx.type] = (summary.byType[tx.type] || 0) + 1;

            // Count by payment method
            if (tx.paymentMethod) {
                summary.byPaymentMethod[tx.paymentMethod] = (summary.byPaymentMethod[tx.paymentMethod] || 0) + 1;
            }

            // Sum amounts by type
            const amount = Number(tx.amount);
            switch (tx.type) {
                case 'PAYMENT':
                case 'DEPOSIT':
                    summary.totalRevenue += amount;
                    break;
                case 'REFUND':
                    summary.totalRefunds += Math.abs(amount);
                    break;
                case 'TIP':
                    summary.totalTips += amount;
                    break;
                case 'COMMISSION':
                    summary.totalCommissions += amount;
                    break;
            }
        });

        console.log('\n📊 Transaction Summary:');
        console.log(`  Total Transactions: ${summary.total}`);
        console.log(`  Revenue: $${summary.totalRevenue.toFixed(2)}`);
        console.log(`  Tips: $${summary.totalTips.toFixed(2)}`);
        console.log(`  Refunds: $${summary.totalRefunds.toFixed(2)}`);
        console.log(`  Commissions: $${summary.totalCommissions.toFixed(2)}`);

        console.log('\n  By Type:');
        Object.entries(summary.byType).forEach(([type, count]) => {
            console.log(`    ${type}: ${count}`);
        });

        console.log('\n  By Payment Method:');
        Object.entries(summary.byPaymentMethod).forEach(([method, count]) => {
            console.log(`    ${method}: ${count}`);
        });
    }
}