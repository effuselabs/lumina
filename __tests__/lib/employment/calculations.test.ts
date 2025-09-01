import {
    calculateChairRental,
    calculateCommissionEarnings,
    calculateEmploymentEarnings,
    calculateHybridEarnings,
    formatCurrency,
    formatPercentage,
    generateCalculationPreview,
} from '@/lib/employment/calculations';

describe('Employment Calculations', () => {
    describe('calculateCommissionEarnings', () => {
        it('calculates basic commission correctly', () => {
            const result = calculateCommissionEarnings(1000, 50);

            expect(result.grossRevenue).toBe(1000);
            expect(result.commissionRate).toBe(50);
            expect(result.commissionAmount).toBe(500);
            expect(result.baseSalary).toBe(0);
            expect(result.totalEarnings).toBe(500);
        });

        it('includes base salary in calculations', () => {
            const result = calculateCommissionEarnings(1000, 50, 200);

            expect(result.commissionAmount).toBe(500);
            expect(result.baseSalary).toBe(200);
            expect(result.totalEarnings).toBe(700);
        });

        it('respects minimum earnings', () => {
            const result = calculateCommissionEarnings(100, 50, 0, 300);

            expect(result.commissionAmount).toBe(50);
            expect(result.totalEarnings).toBe(300); // minimum earnings applied
        });
    });

    describe('calculateChairRental', () => {
        it('calculates weekly rental correctly', () => {
            const result = calculateChairRental(1000, 200, 'WEEKLY', 1);

            expect(result.grossRevenue).toBe(1000);
            expect(result.rentalAmount).toBe(200);
            expect(result.rentalPeriod).toBe('WEEKLY');
            expect(result.periodsWorked).toBe(1);
            expect(result.totalRental).toBe(200);
            expect(result.netEarnings).toBe(800);
        });

        it('calculates multiple periods correctly', () => {
            const result = calculateChairRental(2000, 150, 'WEEKLY', 2);

            expect(result.totalRental).toBe(300);
            expect(result.netEarnings).toBe(1700);
        });

        it('prevents negative earnings', () => {
            const result = calculateChairRental(100, 200, 'WEEKLY', 1);

            expect(result.netEarnings).toBe(0); // Should not go negative
        });
    });

    describe('calculateHybridEarnings', () => {
        it('calculates hybrid model correctly', () => {
            const result = calculateHybridEarnings(1000, 30, 100, 'WEEKLY', 1, 200);

            expect(result.grossRevenue).toBe(1000);
            expect(result.commissionAmount).toBe(300); // 30% of 1000
            expect(result.totalRental).toBe(100);
            expect(result.baseSalary).toBe(200);
            expect(result.totalEarnings).toBe(500); // commission + base salary
            expect(result.businessRetention).toBe(600); // (1000 - 500) + 100
        });

        it('handles zero base salary', () => {
            const result = calculateHybridEarnings(1000, 40, 150, 'WEEKLY', 1, 0);

            expect(result.commissionAmount).toBe(400);
            expect(result.baseSalary).toBe(0);
            expect(result.totalEarnings).toBe(400);
            expect(result.businessRetention).toBe(750); // (1000 - 400) + 150
        });
    });

    describe('calculateEmploymentEarnings', () => {
        it('handles commission employment type', () => {
            const result = calculateEmploymentEarnings({
                grossRevenue: 1000,
                employmentType: 'COMMISSION',
                commissionRate: 60,
                baseSalary: 300,
            });

            expect(result.commissionEarnings).toBe(600);
            expect(result.chairRentalDue).toBe(0);
            expect(result.netEarnings).toBe(900); // 600 + 300
            expect(result.businessRetention).toBe(100); // 1000 - 900
        });

        it('handles chair rental employment type', () => {
            const result = calculateEmploymentEarnings({
                grossRevenue: 1500,
                employmentType: 'CHAIR_RENTAL',
                chairRentalAmount: 250,
                chairRentalPeriod: 'WEEKLY',
                periodsWorked: 1,
            });

            expect(result.commissionEarnings).toBe(0);
            expect(result.chairRentalDue).toBe(250);
            expect(result.netEarnings).toBe(1250); // 1500 - 250
            expect(result.businessRetention).toBe(250); // rental amount
        });

        it('handles hybrid employment type', () => {
            const result = calculateEmploymentEarnings({
                grossRevenue: 2000,
                employmentType: 'HYBRID',
                commissionRate: 35,
                chairRentalAmount: 200,
                chairRentalPeriod: 'WEEKLY',
                baseSalary: 400,
                periodsWorked: 1,
            });

            expect(result.commissionEarnings).toBe(700); // 35% of 2000
            expect(result.chairRentalDue).toBe(200);
            expect(result.netEarnings).toBe(1100); // 700 + 400
            expect(result.businessRetention).toBe(1100); // 2000 - 1100 + 200
        });
    });

    describe('generateCalculationPreview', () => {
        it('generates preview for multiple revenue scenarios', () => {
            const config = {
                employmentType: 'COMMISSION' as const,
                commissionRate: 50,
                baseSalary: 200,
            };

            const preview = generateCalculationPreview(config, [500, 1000, 1500]);

            expect(preview).toHaveLength(3);
            expect(preview[0].revenue).toBe(500);
            expect(preview[0].result.netEarnings).toBe(450); // 250 + 200
            expect(preview[1].revenue).toBe(1000);
            expect(preview[1].result.netEarnings).toBe(700); // 500 + 200
            expect(preview[2].revenue).toBe(1500);
            expect(preview[2].result.netEarnings).toBe(950); // 750 + 200
        });
    });

    describe('formatting functions', () => {
        it('formats currency correctly', () => {
            expect(formatCurrency(1234.56)).toBe('$1,234.56');
            expect(formatCurrency(0)).toBe('$0.00');
            expect(formatCurrency(1000000)).toBe('$1,000,000.00');
        });

        it('formats percentage correctly', () => {
            expect(formatPercentage(50)).toBe('50.0%');
            expect(formatPercentage(33.333)).toBe('33.3%');
            expect(formatPercentage(0)).toBe('0.0%');
        });
    });
});