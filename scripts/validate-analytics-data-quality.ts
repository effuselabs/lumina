#!/usr/bin/env tsx

/**
 * Analytics and Reporting Data Quality Validation Script
 *
 * This script runs comprehensive validation tests to ensure all dashboard widgets
 * display meaningful data and that analytics calculations are accurate.
 *
 * Requirements: 1.2, 1.3, 2.3, 3.2
 */

import { execSync } from 'child_process';
import { subDays } from 'date-fns';
import { DashboardDataService } from '../lib/dashboard-data';
import { prisma } from '../lib/prisma';

interface ValidationResult {
  testSuite: string;
  passed: boolean;
  duration: number;
  errors?: string[];
}

interface ValidationSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: ValidationResult[];
}

class AnalyticsDataQualityValidator {
  private results: ValidationResult[] = [];

  async validateDataQuality(): Promise<ValidationSummary> {
    console.log(
      '🔍 Starting Analytics and Reporting Data Quality Validation...\n'
    );

    // Check if seed data exists
    await this.checkSeedDataExists();

    // Run test suites
    await this.runTestSuite(
      'Analytics Data Quality',
      '__tests__/analytics/data-quality-validation.test.ts'
    );
    await this.runTestSuite(
      'Dashboard API Endpoints',
      '__tests__/api/dashboard-endpoints.test.ts'
    );
    await this.runTestSuite(
      'Report Types Validation',
      '__tests__/reports/report-types-validation.test.ts'
    );
    await this.runTestSuite(
      'Calculation Accuracy',
      '__tests__/analytics/calculation-accuracy.test.ts'
    );

    // Generate summary
    const summary = this.generateSummary();
    this.printSummary(summary);

    return summary;
  }

  private async checkSeedDataExists(): Promise<void> {
    console.log('📊 Checking seed data availability...');

    try {
      const business = await prisma.business.findFirst({
        include: {
          clients: true,
          staff: true,
          services: true,
          appointments: true,
        },
      });

      if (!business) {
        throw new Error('No business found in database');
      }

      console.log(`✅ Found business: ${business.name}`);
      console.log(`   - Clients: ${business.clients.length}`);
      console.log(`   - Staff: ${business.staff.length}`);
      console.log(`   - Services: ${business.services.length}`);
      console.log(`   - Appointments: ${business.appointments.length}`);

      // Validate minimum data requirements
      if (business.clients.length < 10) {
        console.warn(
          `⚠️  Warning: Only ${business.clients.length} clients found. Recommend at least 50 for comprehensive testing.`
        );
      }

      if (business.staff.length < 3) {
        console.warn(
          `⚠️  Warning: Only ${business.staff.length} staff found. Recommend at least 6 for comprehensive testing.`
        );
      }

      if (business.services.length < 10) {
        console.warn(
          `⚠️  Warning: Only ${business.services.length} services found. Recommend at least 30 for comprehensive testing.`
        );
      }

      if (business.appointments.length < 50) {
        console.warn(
          `⚠️  Warning: Only ${business.appointments.length} appointments found. Recommend at least 500 for comprehensive testing.`
        );
      }

      // Check data distribution
      await this.validateDataDistribution(business.id);

      console.log('');
    } catch (error) {
      console.error('❌ Seed data validation failed:', error);
      throw new Error(
        'Please run comprehensive seed data generation before validation'
      );
    }
  }

  private async validateDataDistribution(businessId: string): Promise<void> {
    const dataService = new DashboardDataService(businessId);
    const dateRange = {
      from: subDays(new Date(), 30),
      to: new Date(),
    };

    try {
      // Check revenue data distribution
      const revenueData = await dataService.getRevenueData(dateRange);
      const daysWithRevenue = revenueData.filter(day => day.revenue > 0).length;

      if (daysWithRevenue === 0) {
        console.warn('⚠️  Warning: No revenue data found in the last 30 days');
      } else {
        console.log(
          `✅ Revenue data: ${daysWithRevenue}/${revenueData.length} days with revenue`
        );
      }

      // Check client metrics
      const clientMetrics = await dataService.getClientMetrics(dateRange);
      console.log(
        `✅ Client metrics: ${clientMetrics.totalClients} total, ${clientMetrics.newClients} new, ${clientMetrics.returningClients} returning`
      );

      // Check staff performance
      const staffPerformance = await dataService.getStaffPerformance(dateRange);
      const activeStaff = staffPerformance.filter(
        s => s.appointmentCount > 0
      ).length;
      console.log(
        `✅ Staff performance: ${activeStaff}/${staffPerformance.length} staff with appointments`
      );

      // Check service analytics
      const serviceAnalytics = await dataService.getServiceAnalytics(dateRange);
      const popularServices = serviceAnalytics.filter(
        s => s.bookingCount > 0
      ).length;
      console.log(
        `✅ Service analytics: ${popularServices}/${serviceAnalytics.length} services with bookings`
      );
    } catch (error) {
      console.warn('⚠️  Warning: Could not validate data distribution:', error);
    }
  }

  private async runTestSuite(name: string, testFile: string): Promise<void> {
    console.log(`🧪 Running ${name} tests...`);

    const startTime = Date.now();
    let passed = false;
    const errors: string[] = [];

    try {
      // Run Jest test for specific file
      const command = `npx jest ${testFile} --verbose --no-cache --forceExit`;
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000, // 2 minutes timeout
      });

      // Check if tests passed
      if (output.includes('PASS') && !output.includes('FAIL')) {
        passed = true;
        console.log(`✅ ${name} tests passed`);
      } else {
        console.log(`❌ ${name} tests failed`);
        errors.push('Test execution failed');
      }
    } catch (error: any) {
      console.log(`❌ ${name} tests failed`);

      if (error.stdout) {
        const stdout = error.stdout.toString();
        const stderr = error.stderr?.toString() || '';

        // Extract error messages
        const errorLines = (stdout + stderr)
          .split('\n')
          .filter(
            (line: any) =>
              line.includes('Error:') ||
              line.includes('FAIL') ||
              line.includes('Expected')
          )
          .slice(0, 5); // Limit to first 5 errors

        errors.push(...errorLines);
      } else {
        errors.push(error.message || 'Unknown error');
      }
    }

    const duration = Date.now() - startTime;

    this.results.push({
      testSuite: name,
      passed,
      duration,
      errors: errors.length > 0 ? errors : undefined,
    });

    console.log(`   Duration: ${duration}ms\n`);
  }

  private generateSummary(): ValidationSummary {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      results: this.results,
    };
  }

  private printSummary(summary: ValidationSummary): void {
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Test Suites: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests}`);
    console.log(`Failed: ${summary.failedTests}`);
    console.log(`Total Duration: ${summary.totalDuration}ms`);
    console.log('');

    // Print detailed results
    summary.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testSuite} (${result.duration}ms)`);

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   ❌ ${error}`);
        });
      }
    });

    console.log('');

    // Print recommendations
    if (summary.failedTests > 0) {
      console.log('🔧 RECOMMENDATIONS');
      console.log('-'.repeat(30));
      console.log('• Check that comprehensive seed data has been generated');
      console.log('• Verify database connections and permissions');
      console.log('• Review failed test output for specific issues');
      console.log('• Ensure all required dependencies are installed');
      console.log('');
    }

    // Print data quality assessment
    this.printDataQualityAssessment(summary);
  }

  private printDataQualityAssessment(summary: ValidationSummary): void {
    console.log('📊 DATA QUALITY ASSESSMENT');
    console.log('-'.repeat(30));

    const passRate = (summary.passedTests / summary.totalTests) * 100;

    if (passRate === 100) {
      console.log(
        '🎉 EXCELLENT: All analytics and reporting data quality tests passed!'
      );
      console.log('   • Dashboard widgets display meaningful data');
      console.log('   • Revenue patterns and distributions are realistic');
      console.log('   • Analytics calculations are mathematically accurate');
      console.log(
        '   • All report types (P&L, commission, client, service) work correctly'
      );
      console.log('   • API endpoints return proper structured data');
    } else if (passRate >= 75) {
      console.log('✅ GOOD: Most data quality tests passed');
      console.log('   • Core analytics functionality is working');
      console.log('   • Some minor issues may need attention');
    } else if (passRate >= 50) {
      console.log('⚠️  FAIR: Significant data quality issues detected');
      console.log('   • Core functionality may be compromised');
      console.log('   • Review failed tests and fix underlying issues');
    } else {
      console.log('❌ POOR: Major data quality problems detected');
      console.log('   • Analytics and reporting may not be reliable');
      console.log('   • Comprehensive review and fixes required');
    }

    console.log('');
  }
}

// Main execution
async function main() {
  try {
    const validator = new AnalyticsDataQualityValidator();
    const summary = await validator.validateDataQuality();

    // Exit with appropriate code
    process.exit(summary.failedTests > 0 ? 1 : 0);
  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { AnalyticsDataQualityValidator };
