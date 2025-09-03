#!/usr/bin/env tsx

/**
 * Decision Management CLI
 * 
 * Command-line interface for managing architectural decisions
 */

import { ArchitecturalDecision, decisionLog } from '../lib/decision-log';

interface CLIArgs {
    command: 'add' | 'list' | 'update' | 'summary' | 'template';
    title?: string;
    id?: string;
    status?: ArchitecturalDecision['status'];
    days?: number;
    interactive?: boolean;
}

async function main() {
    const args = parseArgs();

    try {
        switch (args.command) {
            case 'add':
                await addDecision(args);
                break;
            case 'list':
                await listDecisions(args);
                break;
            case 'update':
                await updateDecision(args);
                break;
            case 'summary':
                await generateSummary(args);
                break;
            case 'template':
                await createTemplate(args);
                break;
            default:
                showHelp();
        }
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

function parseArgs(): CLIArgs {
    const args = process.argv.slice(2);
    const parsed: CLIArgs = { command: 'list' };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case 'add':
            case 'list':
            case 'update':
            case 'summary':
            case 'template':
                parsed.command = arg;
                break;
            case '--title':
                parsed.title = nextArg;
                i++;
                break;
            case '--id':
                parsed.id = nextArg;
                i++;
                break;
            case '--status':
                parsed.status = nextArg as ArchitecturalDecision['status'];
                i++;
                break;
            case '--days':
                parsed.days = parseInt(nextArg);
                i++;
                break;
            case '--interactive':
                parsed.interactive = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }

    return parsed;
}

async function addDecision(args: CLIArgs) {
    if (!args.title) {
        console.error('❌ Title is required for adding a decision. Use --title "Decision Title"');
        process.exit(1);
    }

    console.log('📝 Creating new architectural decision...');

    const template = decisionLog.createDecisionTemplate(args.title);

    if (args.interactive) {
        // In a real implementation, this would use a library like inquirer for interactive prompts
        console.log('🔄 Interactive mode not implemented yet. Creating template decision.');
    }

    const decision: Omit<ArchitecturalDecision, 'id'> = {
        ...template,
        title: args.title,
        date: new Date(),
        status: 'proposed',
        context: 'Please update this context with the actual situation that led to this decision.',
        decision: 'Please update this with the actual decision made.',
        rationale: 'Please update this with the rationale for the decision.',
        alternatives: [
            {
                name: 'Alternative 1',
                description: 'Please describe the first alternative considered.',
                rejectionReason: 'Please explain why this alternative was rejected.'
            }
        ],
        impact: 'Please describe the impact of this decision on the system and development process.',
        relatedIssues: []
    };

    const id = await decisionLog.addDecision(decision);
    console.log(`✅ Decision ${id} created successfully`);
    console.log(`📝 Please edit docs/onboarding/DECISION_LOG.md to complete the decision details`);
}

async function listDecisions(args: CLIArgs) {
    console.log('📋 Listing architectural decisions...');

    const decisions = args.days
        ? await decisionLog.getRecentDecisions(args.days)
        : await decisionLog.getAllDecisions();

    if (decisions.length === 0) {
        console.log('No decisions found.');
        return;
    }

    console.log(`\nFound ${decisions.length} decision${decisions.length !== 1 ? 's' : ''}:\n`);

    for (const decision of decisions) {
        const statusEmoji = {
            'proposed': '💭',
            'accepted': '✅',
            'deprecated': '⚠️',
            'superseded': '🔄'
        }[decision.status] || '❓';

        console.log(`${statusEmoji} ${decision.id}: ${decision.title}`);
        console.log(`   Status: ${decision.status} | Date: ${decision.date.toDateString()}`);
        console.log(`   Impact: ${decision.impact.split('\n')[0].substring(0, 80)}...`);
        console.log('');
    }
}

async function updateDecision(args: CLIArgs) {
    if (!args.id) {
        console.error('❌ Decision ID is required for updating. Use --id ADR-XXX');
        process.exit(1);
    }

    if (!args.status) {
        console.error('❌ Status is required for updating. Use --status [proposed|accepted|deprecated|superseded]');
        process.exit(1);
    }

    console.log(`🔄 Updating decision ${args.id} to status: ${args.status}`);

    await decisionLog.updateDecisionStatus(args.id, args.status);
    console.log(`✅ Decision ${args.id} updated successfully`);
}

async function generateSummary(args: CLIArgs) {
    const days = args.days || 30;
    console.log(`📊 Generating decision summary for last ${days} days...`);

    const summary = await decisionLog.generateDecisionSummary(days);
    console.log('\n' + summary);
}

async function createTemplate(args: CLIArgs) {
    if (!args.title) {
        console.error('❌ Title is required for creating a template. Use --title "Decision Title"');
        process.exit(1);
    }

    const template = decisionLog.createDecisionTemplate(args.title);

    console.log('📋 Decision Template:');
    console.log('');
    console.log(`## ADR-XXX: ${template.title}`);
    console.log('');
    console.log(`**Date**: ${template.date?.toLocaleDateString()}`);
    console.log(`**Status**: ${template.status}`);
    console.log(`**Context**: ${template.context}`);
    console.log('');
    console.log(`**Decision**: ${template.decision}`);
    console.log('');
    console.log('**Rationale**:');
    console.log(template.rationale);
    console.log('');
    console.log('**Alternatives Considered**:');
    template.alternatives?.forEach((alt, index) => {
        console.log(`${index + 1}. **${alt.name}**: ${alt.description}`);
        console.log(`   - ${alt.rejectionReason}`);
    });
    console.log('');
    console.log('**Impact**:');
    console.log(template.impact);
    console.log('');
    console.log('**Related Issues**: [Add Linear issues or other references]');
}

function showHelp() {
    console.log(`
📋 Decision Management CLI

Usage: tsx scripts/manage-decisions.ts <command> [options]

Commands:
  add         Add a new architectural decision
  list        List existing decisions
  update      Update decision status
  summary     Generate decision summary
  template    Show decision template
  
Options:
  --title <title>     Decision title (required for add/template)
  --id <id>          Decision ID (required for update)
  --status <status>  Decision status (required for update)
                     Values: proposed, accepted, deprecated, superseded
  --days <number>    Number of days for recent decisions (default: 30)
  --interactive      Use interactive mode (for add command)
  --help, -h         Show this help message

Examples:
  # Add a new decision
  tsx scripts/manage-decisions.ts add --title "Use React Query for State Management"
  
  # List recent decisions
  tsx scripts/manage-decisions.ts list --days 7
  
  # Update decision status
  tsx scripts/manage-decisions.ts update --id ADR-001 --status accepted
  
  # Generate summary
  tsx scripts/manage-decisions.ts summary --days 30
  
  # Show template
  tsx scripts/manage-decisions.ts template --title "Example Decision"
`);
}

// Run the CLI if called directly
if (require.main === module) {
    main().catch(console.error);
}

export { main as runDecisionCLI };
