#!/usr/bin/env tsx
/**
 * Test Blocker Format
 * 
 * Create a test blocker using the actual blocker tracker to see the correct format
 */

import { DailyStatusBlockerTracker } from '../lib/daily-status-blocker-tracker';

async function testBlockerFormat() {
    console.log('🧪 Testing blocker format...\n');

    try {
        const tracker = new DailyStatusBlockerTracker();

        // Add a test blocker using the tracker
        const blockerId = await tracker.addBlocker({
            title: 'Format test blocker',
            description: 'Testing the correct format for blocker parsing',
            priority: 'medium',
            impact: 'Testing format parsing',
            nextSteps: ['Check format', 'Verify parsing']
        });

        console.log(`✅ Test blocker created: ${blockerId}`);

        // Now try to read it back
        const blockers = await tracker.getBlockersFromDate(new Date());
        console.log(`📋 Found ${blockers.length} blockers:`);

        blockers.forEach(blocker => {
            console.log(`- ${blocker.title} (${blocker.id})`);
            console.log(`  Status: ${blocker.status}, Priority: ${blocker.priority}`);
            console.log(`  Linear Issue: ${blocker.linearIssue || 'None'}`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testBlockerFormat();