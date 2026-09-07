/**
 * Base factory class with common functionality for all data factories
 */

import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import { BatchProcessingOptions, ValidationResult } from './types';

export abstract class BaseFactory<T> {
  protected prisma: PrismaClient;
  protected businessId: string;

  constructor(prisma: PrismaClient, businessId: string) {
    this.prisma = prisma;
    this.businessId = businessId;
  }

  /**
   * Generate a single entity
   */
  abstract generate(options?: any): Promise<T>;

  /**
   * Generate multiple entities in batches
   */
  async generateBatch(
    count: number,
    options?: any,
    batchOptions?: BatchProcessingOptions
  ): Promise<T[]> {
    const batchSize = batchOptions?.batchSize || 50;
    const maxConcurrency = batchOptions?.maxConcurrency || 5;
    const progressCallback = batchOptions?.progressCallback;

    const results: T[] = [];
    const totalBatches = Math.ceil(count / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      // Create promises for this batch
      const batchPromises: Promise<T>[] = [];
      for (let i = 0; i < batchCount; i++) {
        batchPromises.push(this.generate(options));
      }

      // Process batch with concurrency limit
      const batchResults = await this.processConcurrently(
        batchPromises,
        maxConcurrency
      );

      results.push(...batchResults);

      // Report progress
      if (progressCallback) {
        progressCallback(results.length, count);
      }

      // Small delay to prevent overwhelming the database
      if (batchIndex < totalBatches - 1) {
        await this.delay(10);
      }
    }

    return results;
  }

  /**
   * Process promises with concurrency limit
   */
  protected async processConcurrently<R>(
    promises: Promise<R>[],
    maxConcurrency: number
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < promises.length; i += maxConcurrency) {
      const batch = promises.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Validate entity data before creation
   */
  protected abstract validate(data: any): ValidationResult;

  /**
   * Generate realistic faker data with business context
   */
  protected generatePersonName(): { firstName: string; lastName: string } {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };
  }

  protected generateEmail(firstName: string, lastName: string): string {
    const domains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'icloud.com',
      'aol.com',
    ];
    const domain = faker.helpers.arrayElement(domains);
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    return `${username}@${domain}`;
  }

  protected generatePhone(): string {
    return faker.phone.number({ style: 'national' });
  }

  protected generateAddress(): {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  } {
    return {
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
    };
  }

  /**
   * Generate realistic date within a range
   */
  protected generateDateInRange(startDate: Date, endDate: Date): Date {
    return faker.date.between({ from: startDate, to: endDate });
  }

  /**
   * Generate weighted random selection
   */
  protected weightedRandom<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have the same length');
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = faker.number.float({ min: 0, max: totalWeight });

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Generate business hours aware time
   */
  protected generateBusinessHoursTime(
    date: Date,
    openHour: number = 9,
    closeHour: number = 18
  ): Date {
    const hour = faker.number.int({ min: openHour, max: closeHour - 1 });
    const minute = faker.helpers.arrayElement([0, 15, 30, 45]);

    const result = new Date(date);
    result.setHours(hour, minute, 0, 0);
    return result;
  }

  /**
   * Utility delay function
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate realistic notes or descriptions
   */
  protected generateNotes(type: 'client' | 'appointment' | 'service'): string {
    const clientNotes = [
      'Prefers natural hair colors',
      'Allergic to certain hair products',
      'Likes to chat during appointments',
      'Prefers quiet appointments',
      'Regular client, very punctual',
      'Sensitive scalp',
      'Prefers shorter appointments',
      'Likes to try new styles',
    ];

    const appointmentNotes = [
      'Client requested extra conditioning treatment',
      'Used organic products as requested',
      'Client very happy with results',
      'Recommended follow-up appointment',
      'Client referred by existing customer',
      'First-time client, provided full consultation',
      'Client rescheduled from previous week',
    ];

    const serviceNotes = [
      'Popular during holiday seasons',
      'Requires advanced booking',
      'Often booked with other services',
      'Suitable for all hair types',
      'Requires consultation for new clients',
    ];

    switch (type) {
      case 'client':
        return faker.helpers.arrayElement(clientNotes);
      case 'appointment':
        return faker.helpers.arrayElement(appointmentNotes);
      case 'service':
        return faker.helpers.arrayElement(serviceNotes);
      default:
        return '';
    }
  }

  /**
   * Generate realistic pricing with business logic
   */
  protected generateRealisticPrice(
    basePrice: number,
    variation: number = 0.1
  ): number {
    const modifier = faker.number.float({
      min: 1 - variation,
      max: 1 + variation,
    });
    const price = basePrice * modifier;

    // Round to nearest $5 for realistic pricing
    return Math.round(price / 5) * 5;
  }
}
