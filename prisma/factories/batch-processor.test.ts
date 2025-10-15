/**
 * Tests for enhanced batch processor functionality
 */

import { PrismaClient } from '@prisma/client';
import { BatchProcessor } from './batch-processor';
import { PerformanceMonitor } from './performance-monitor';

// Mock Prisma client for testing
const mockPrisma = {
    $transaction: jest.fn(),
    client: {
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
    }
} as unknown as PrismaClient;

describe('BatchProcessor Enhanced Features', () => {
    let batchProcessor: BatchProcessor;
    let performanceMonitor: PerformanceMonitor;

    beforeEach(() => {
        batchProcessor = new BatchProcessor(mockPrisma, {
            batchSize: 10,
            maxConcurrency: 2,
            enableMemoryMonitoring: true,
            enableProgressLogging: true,
            enableRollback: true
        });

        performanceMonitor = new PerformanceMonitor();

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('Enhanced Batch Processing', () => {
        test('should process batches with performance monitoring', async () => {
            const testData = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `Item ${i}` }));
            const mockProcessor = jest.fn().mockImplementation((batch) =>
                Promise.resolve(batch.map((item: any) => ({ id: item.id, created: true })))
            );

            mockPrisma.$transaction = jest.fn().mockImplementation((callback) => callback(mockPrisma));

            const result = await batchProcessor.processBatchEnhanced(
                testData,
                mockProcessor,
                {
                    batchSize: 10,
                    enableMemoryMonitoring: true,
                    enableProgressLogging: true
                }
            );

            expect(result.totalProcessed).toBe(25);
            expect(result.totalErrors).toBe(0);
            expect(result.duration).toBeGreaterThan(0);
            expect(result.memoryUsage).toBeDefined();
            expect(mockProcessor).toHaveBeenCalledTimes(3); // 3 batches for 25 items
        });

        test('should handle errors gracefully with rollback', async () => {
            const testData = Array.from({ length: 15 }, (_, i) => ({ id: i, name: `Item ${i}` }));
            const mockProcessor = jest.fn()
                .mockImplementationOnce((batch) => Promise.resolve(batch.map((item: any) => ({ id: item.id, created: true }))))
                .mockRejectedValueOnce(new Error('Batch processing failed'))
                .mockImplementationOnce((batch) => Promise.resolve(batch.map((item: any) => ({ id: item.id, created: true }))));

            mockPrisma.$transaction = jest.fn().mockImplementation((callback) => callback(mockPrisma));

            const result = await batchProcessor.processBatchEnhanced(
                testData,
                mockProcessor,
                {
                    batchSize: 10,
                    rollbackOnError: false, // Continue processing despite errors
                    enableRollback: true
                }
            );

            expect(result.totalErrors).toBe(1);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].batchIndex).toBe(1);
        });
    });

    describe('Memory Management', () => {
        test('should monitor memory usage during processing', async () => {
            const testData = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }));
            const mockProcessor = jest.fn().mockResolvedValue([{ id: 1, created: true }]);

            mockPrisma.$transaction = jest.fn().mockImplementation((callback) => callback(mockPrisma));

            const result = await batchProcessor.processBatchEnhanced(
                testData,
                mockProcessor,
                {
                    batchSize: 10,
                    enableMemoryMonitoring: true,
                    memoryThresholdMB: 100
                }
            );

            expect(result.memoryUsage).toBeDefined();
            expect(result.memoryUsage!.heapUsed).toBeGreaterThan(0);
        });
    });

    describe('Progress Tracking', () => {
        test('should track progress accurately', async () => {
            const testData = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Item ${i}` }));
            const mockProcessor = jest.fn().mockImplementation((batch) =>
                Promise.resolve(batch.map((item: any) => ({ id: item.id, created: true })))
            );
            const progressCallback = jest.fn();

            mockPrisma.$transaction = jest.fn().mockImplementation((callback) => callback(mockPrisma));

            await batchProcessor.processBatchEnhanced(
                testData,
                mockProcessor,
                {
                    batchSize: 10,
                    progressCallback,
                    enableProgressLogging: true
                }
            );

            expect(progressCallback).toHaveBeenCalledTimes(3); // 3 batches
            expect(progressCallback).toHaveBeenLastCalledWith(30, 30);
        });
    });

    describe('Enhanced CRUD Operations', () => {
        test('should create entities in batches with enhanced features', async () => {
            const testData = Array.from({ length: 20 }, (_, i) => ({ name: `Entity ${i}` }));

            mockPrisma.client.create = jest.fn().mockResolvedValue({ id: 1, name: 'Entity 1' });
            mockPrisma.$transaction = jest.fn().mockImplementation((callback) => callback(mockPrisma));

            const result = await batchProcessor.createInBatchesEnhanced(
                'client',
                testData,
                {
                    batchSize: 5,
                    enableRollback: true
                }
            );

            expect(result.totalProcessed).toBe(20);
            expect(result.totalErrors).toBe(0);
        });

        test('should validate batch integrity', async () => {
            mockPrisma.client.count = jest.fn().mockResolvedValue(50);

            const result = await batchProcessor.validateBatchIntegrityEnhanced(
                'client',
                50,
                'business-id-123',
                [
                    {
                        name: 'Foreign Key Check',
                        check: async () => true,
                        description: 'All foreign keys are valid'
                    }
                ]
            );

            expect(result.isValid).toBe(true);
            expect(result.actualCount).toBe(50);
            expect(result.details).toHaveLength(2); // Count check + custom check
        });
    });

    describe('Performance Monitoring Integration', () => {
        test('should integrate with performance monitor', () => {
            performanceMonitor.startOperation('test-batch-operation');
            performanceMonitor.updateProgress('test-batch-operation', 25);
            performanceMonitor.recordError('test-batch-operation');

            const metrics = performanceMonitor.endOperation('test-batch-operation');

            expect(metrics).toBeDefined();
            expect(metrics!.itemsProcessed).toBe(25);
            expect(metrics!.errors).toBe(1);
            expect(metrics!.duration).toBeGreaterThan(0);
        });

        test('should generate performance report', () => {
            performanceMonitor.startOperation('operation-1');
            performanceMonitor.updateProgress('operation-1', 100);
            performanceMonitor.endOperation('operation-1');

            performanceMonitor.startOperation('operation-2');
            performanceMonitor.updateProgress('operation-2', 200);
            performanceMonitor.recordError('operation-2');
            performanceMonitor.endOperation('operation-2');

            const report = performanceMonitor.generateReport();

            expect(report).toContain('Seed Performance Report');
            expect(report).toContain('operation-1');
            expect(report).toContain('operation-2');
            expect(report).toContain('Total Items: 300');
        });
    });

    describe('Streaming Operations', () => {
        test('should process streaming data efficiently', async () => {
            async function* dataGenerator() {
                for (let i = 0; i < 100; i++) {
                    yield { id: i, name: `Stream Item ${i}` };
                }
            }

            const mockProcessor = jest.fn().mockResolvedValue({ processed: true });

            const result = await batchProcessor.processStreamEnhanced(
                dataGenerator(),
                mockProcessor,
                {
                    batchSize: 20,
                    enableMemoryMonitoring: true
                }
            );

            expect(result.totalProcessed).toBe(100);
            expect(result.totalErrors).toBe(0);
            expect(mockProcessor).toHaveBeenCalledTimes(100);
        });
    });

    describe('Rollback Operations', () => {
        test('should perform enhanced rollback with detailed tracking', async () => {
            const mockRecords = Array.from({ length: 25 }, (_, i) => ({ id: `record-${i}` }));

            mockPrisma.client.findMany = jest.fn().mockResolvedValue(mockRecords);
            mockPrisma.client.deleteMany = jest.fn().mockResolvedValue({ count: 10 });

            const result = await batchProcessor.rollbackBatchEnhanced(
                'client',
                'business-id-123',
                new Date('2024-01-01'),
                {
                    batchSize: 10,
                    progressCallback: jest.fn()
                }
            );

            expect(result.deletedCount).toBe(30); // 3 batches of 10
            expect(result.duration).toBeGreaterThan(0);
            expect(result.errors).toHaveLength(0);
        });
    });
});