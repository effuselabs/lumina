#!/usr/bin/env tsx
/**
 * Test Linear Integration
 * 
 * Simple test script to verify Linear integration is working
 */

import { createLinearBlockerTracker } from '../lib/daily-status-blocker-tracker-linear';
import { createLinearDecisionTracker } from '../lib/daily-status-decision-tracker-linear';

async function testLinearIntegration() {
    console.log('🧪 Testing Linear Integration...\n');

    try {
        // Test blocker creation with Linear issue
        console.log('1. Testing blocker creation with Linear issue...');
        const blockerTracker = await createLinearBlockerTracker();

        const blockerResult = await blockerTracker.addBlockerWithLinear({
            title: 'Test blocker for Linear integration',
            description: 'This is a test blocker to verify Linear integration works',
            priority: 'high',
            impact: 'Testing Linear integration functionality',
            nextSteps: ['Verify Linear issue is created', 'Check issue details']
        }, {
            createLinearIssue: true
        });

        console.log(`✅ Blocker created: ${blockerResult.blockerId}`);
        if (blockerResult.linearIssue) {
            console.log(`🔗 Linear issue: ${blockerResult.linearIssue.identifier}`);
        }
        console.log('');

        // Test decision creation with Linear linking
        console.log('2. Testing decision creation with Linear issue...');
        const decisionTracker = await createLinearDecisionTracker();

        const decisionResult = await decisionTracker.addDecisionWithLinear({
            title: 'Test decision for Linear integration',
            context: 'Testing the Linear integration functionality',
            decision: 'Use Linear integration for documentation workflow',
            rationale: 'Provides seamless tracking between daily status and Linear issues',
            alternatives: ['Manual Linear issue creation', 'No Linear integration'],
            impact: ['Improved workflow efficiency', 'Better issue tracking'],
            status: 'approved'
        }, {
            createNewIssue: true
        });

        console.log(`✅ Decision created: ${decisionResult.decisionId}`);
        if (decisionResult.linearIssue) {
            console.log(`📝 Linear issue: ${decisionResult.linearIssue.identifier}`);
        }
        console.log('');

        // Test listing active blockers
        console.log('3. Testing blocker listing...');
        const activeBlockers = await blockerTracker.getActiveBlockers(7);
        console.log(`📋 Found ${activeBlockers.length} active blockers`);

        activeBlockers.slice(0, 3).forEach(blocker => {
            console.log(`   - ${blocker.title} (${blocker.id})`);
            if (blocker.linearIssue) {
                console.log(`     🔗 Linear: ${blocker.linearIssue}`);
            }
        });
        console.log('');

        // Test report generation
        console.log('4. Testing report generation...');
        const report = await blockerTracker.generateBlockerReportWithLinear(7);
        console.log('📊 Report generated successfully');
        console.log(`   Report length: ${report.length} characters`);
        console.log('');

        console.log('🎉 All Linear integration tests passed!');
        console.log('\n📝 Next steps:');
        console.log('   - Try: npm run blocker:add "Your blocker title" --create-linear-issue');
        console.log('   - Try: npm run decision:add "Your decision title" --create-linear-issue');
        console.log('   - Try: npm run blocker:list');
        console.log('   - Try: npm run linear:report');

    } catch (error) {
        console.error('❌ Linear integration test failed:', error);
        process.exit(1);
    }
}

// Run the test
testLinearIntegration();