# Linear Integration Training Guide

## Overview

This training guide provides comprehensive instructions for using the enhanced Linear integration in the Lumina development workflow. The integration includes automated synchronization, Agent Hook workflows, and project management automation.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Linear Project Structure](#linear-project-structure)
3. [Automated Workflows](#automated-workflows)
4. [Issue Management](#issue-management)
5. [Development Workflow](#development-workflow)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

Before using the Linear integration, ensure you have:

1. **Linear Account**: Access to the Lumina Linear workspace
2. **API Token**: Personal Linear API token for authentication
3. **Team Membership**: Member of the "Lumina Product" team
4. **Project Access**: Access to the "UseLumina.app" project
5. **Kiro IDE**: Latest version with Agent Hook support

### Initial Setup

1. **Configure API Token**:
   ```bash
   # Add to your environment variables
   LINEAR_API_TOKEN=your_personal_api_token_here
   LINEAR_TEAM_ID=lumina-team-id
   LINEAR_PROJECT_ID=lumina-project-id
   ```

2. **Verify Connection**:
   ```bash
   # Test Linear API connection
   curl -H "Authorization: Bearer $LINEAR_API_TOKEN" \
        -H "Content-Type: application/json" \
        https://api.linear.app/graphql \
        -d '{"query": "{ viewer { id name email } }"}'
   ```

3. **Enable Agent Hooks**:
   - Open Kiro IDE settings
   - Navigate to Agent Hooks section
   - Enable Linear synchronization hooks

## Linear Project Structure

### Team Organization

**Team**: Lumina Product
- **Purpose**: Main development team for Lumina SaaS platform
- **Members**: All developers, designers, and product managers
- **Scope**: All product development work

### Project Structure

**Project**: UseLumina.app
- **Purpose**: Main product development project
- **Epics**: Organized by major feature areas
- **Milestones**: Aligned with development sprints and releases

### Label System

#### Type Labels
- `Type: Bug` - Unexpected errors or incorrect behavior
- `Type: Feature` - New functionality or user-facing changes
- `Type: Task` - Development tasks not directly user-facing
- `Type: Integration` - Third-party service integrations

#### Priority Labels
- `P1: Critical` - Blocks development or user functionality
- `P2: High` - Major features or core functionality bugs
- `P3: Medium` - Standard features or minor bugs
- `P4: Low` - Nice-to-have features or cosmetic issues

#### Status Labels
- `Status: To Do` - Ready to be worked on
- `Status: In Progress` - Actively being developed
- `Status: In Review` - Code review in progress
- `Status: Done` - Completed and merged

#### Module Labels
- `Module: Auth` - Authentication and user management
- `Module: Booking` - Appointment scheduling and calendar
- `Module: CRM` - Client and staff management
- `Module: Financials` - POS, reporting, and payroll
- `Module: Dashboard` - Main dashboard and analytics

### Epic Organization

#### Foundation Epic
- Database architecture
- Authentication system
- UI design system
- CI/CD pipeline
- Testing framework

#### Core Features Epic
- Business onboarding
- Service management
- Booking engine
- Client management
- Staff management

#### Financial System Epic
- Payment processing
- POS interface
- Hybrid employment models
- Financial reporting
- Payroll calculations

#### Analytics & Insights Epic
- Dashboard widgets
- Data aggregation
- Reporting services
- Performance monitoring

## Automated Workflows

### 1. Issue Creation Automation

**Trigger**: New development tasks identified
**Action**: Automatically creates Linear issues with proper labels and assignments

**Example**:
```typescript
// When a new task is added to the development plan
const newIssue = await createLinearIssue({
  title: "Implement hybrid employment UI components",
  description: "Create UI components for employment type selection...",
  labels: ["Type: Feature", "Module: Financials", "P2: High"],
  assignee: "developer-id",
  project: "UseLumina.app"
});
```

### 2. Status Synchronization

**Trigger**: Code commits, PR merges, task completion
**Action**: Updates Linear issue status automatically

**Workflow**:
1. Developer starts work → Issue moves to "In Progress"
2. PR opened → Issue moves to "In Review"
3. PR merged → Issue moves to "Done"
4. Deployment complete → Issue marked as "Released"

### 3. Progress Tracking

**Trigger**: Development milestone completion
**Action**: Updates project progress and creates status reports

**Features**:
- Automatic progress calculation
- Milestone tracking
- Sprint velocity metrics
- Burndown chart updates

## Issue Management

### Creating Issues

#### Manual Issue Creation

1. **Navigate to Linear**:
   - Go to linear.app
   - Select "Lumina Product" team
   - Click "New Issue"

2. **Fill Issue Details**:
   ```
   Title: [Clear, descriptive title]
   Description: [Detailed description with acceptance criteria]
   Labels: [Appropriate type, priority, module labels]
   Assignee: [Team member responsible]
   Project: UseLumina.app
   ```

3. **Add Context**:
   - Link to related issues
   - Reference design documents
   - Include technical specifications

#### Automated Issue Creation

Issues are automatically created for:
- Documentation updates needed
- Steering compliance violations
- Test failures requiring attention
- Performance issues detected

### Issue Templates

#### Bug Report Template
```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser: [Browser and version]
- OS: [Operating system]
- Version: [App version]

## Additional Context
[Screenshots, logs, or other relevant information]
```

#### Feature Request Template
```markdown
## Feature Description
[Clear description of the requested feature]

## User Story
As a [type of user], I want [goal] so that [benefit].

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Technical Requirements
[Technical specifications or constraints]

## Design Considerations
[UI/UX considerations or mockups]

## Priority Justification
[Why this feature is important]
```

### Issue Lifecycle

1. **Creation**: Issue created with appropriate labels
2. **Triage**: Priority and assignment determined
3. **Planning**: Added to sprint/milestone
4. **Development**: Status updated as work progresses
5. **Review**: Code review and testing
6. **Completion**: Issue closed and documented
7. **Release**: Feature deployed to production

## Development Workflow

### Standard Workflow

1. **Issue Assignment**:
   - Pick issue from "To Do" status
   - Move to "In Progress"
   - Create feature branch: `feat/LUM-123-feature-name`

2. **Development**:
   - Implement feature according to acceptance criteria
   - Write tests for new functionality
   - Update documentation as needed

3. **Code Review**:
   - Open pull request
   - Issue automatically moves to "In Review"
   - Address review feedback

4. **Completion**:
   - Merge pull request
   - Issue automatically moves to "Done"
   - Deploy to staging for testing

### Branch Naming Convention

```bash
# Feature branches
feat/LUM-123-implement-booking-system

# Bug fix branches
fix/LUM-456-resolve-payment-error

# Hotfix branches
hotfix/LUM-789-critical-security-fix

# Documentation branches
docs/LUM-101-update-api-documentation
```

### Commit Message Format

```bash
# Format: type(scope): description [LUM-123]
feat(booking): add real-time availability checking [LUM-123]
fix(payments): resolve Stripe webhook handling [LUM-456]
docs(api): update authentication endpoints [LUM-101]
test(financials): add hybrid model calculation tests [LUM-789]
```

### Pull Request Guidelines

1. **Title Format**: `[LUM-123] Feature: Implement booking system`
2. **Description**: Include issue link and summary of changes
3. **Checklist**: Use PR template checklist
4. **Labels**: Apply appropriate labels
5. **Reviewers**: Assign relevant team members

## Troubleshooting

### Common Issues

#### 1. Linear Sync Not Working

**Symptoms**: Issues not updating automatically
**Causes**:
- Invalid API token
- Network connectivity issues
- Agent Hook disabled

**Solutions**:
```bash
# Check API token
echo $LINEAR_API_TOKEN

# Test API connection
curl -H "Authorization: Bearer $LINEAR_API_TOKEN" \
     https://api.linear.app/graphql \
     -d '{"query": "{ viewer { id } }"}'

# Restart Agent Hooks in Kiro IDE
```

#### 2. Issue Creation Failures

**Symptoms**: Automated issues not being created
**Causes**:
- Missing required fields
- Invalid team/project IDs
- Permission issues

**Solutions**:
- Verify team and project IDs
- Check user permissions in Linear
- Review Agent Hook logs

#### 3. Status Sync Delays

**Symptoms**: Issue status not updating immediately
**Causes**:
- API rate limiting
- Network latency
- Webhook delays

**Solutions**:
- Wait for next sync cycle (5 minutes)
- Manually trigger sync if needed
- Check webhook configuration

### Debugging Steps

1. **Check Agent Hook Logs**:
   ```bash
   # View Kiro IDE logs
   tail -f ~/.kiro/logs/agent-hooks.log
   ```

2. **Verify Linear API Access**:
   ```bash
   # Test API query
   curl -X POST \
        -H "Authorization: Bearer $LINEAR_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"query": "{ issues(first: 1) { nodes { id title } } }"}' \
        https://api.linear.app/graphql
   ```

3. **Check Webhook Configuration**:
   - Verify webhook URL is accessible
   - Check webhook authentication
   - Review webhook payload format

### Getting Help

1. **Documentation**: Check this guide and related documentation
2. **Team Support**: Ask in team chat or during standup
3. **Linear Support**: Contact Linear support for API issues
4. **Issue Tracking**: Create Linear issue for integration bugs

## Best Practices

### Issue Management

1. **Clear Titles**: Use descriptive, searchable titles
2. **Detailed Descriptions**: Include context and acceptance criteria
3. **Proper Labels**: Apply consistent labeling for filtering
4. **Regular Updates**: Keep issues updated with progress
5. **Link Related Issues**: Connect dependent or related issues

### Development Workflow

1. **Small Issues**: Break large features into smaller, manageable issues
2. **Clear Acceptance Criteria**: Define what "done" means
3. **Regular Commits**: Make frequent, small commits with clear messages
4. **Code Review**: Always get code reviewed before merging
5. **Testing**: Include tests with all new functionality

### Project Management

1. **Sprint Planning**: Plan issues for upcoming sprints
2. **Priority Management**: Keep priorities updated and realistic
3. **Progress Tracking**: Monitor sprint progress regularly
4. **Retrospectives**: Review and improve processes regularly
5. **Documentation**: Keep project documentation updated

### Communication

1. **Issue Comments**: Use comments for status updates and questions
2. **Mentions**: Use @mentions to notify relevant team members
3. **Status Updates**: Provide regular updates on complex issues
4. **Blockers**: Clearly communicate any blockers or dependencies
5. **Completion**: Summarize work done when closing issues

## Advanced Features

### Custom Queries

Use Linear's GraphQL API for custom queries:

```graphql
query GetTeamIssues($teamId: String!) {
  team(id: $teamId) {
    issues(first: 50) {
      nodes {
        id
        title
        state {
          name
        }
        assignee {
          name
        }
        labels {
          nodes {
            name
          }
        }
      }
    }
  }
}
```

### Automation Rules

Set up custom automation rules in Linear:

1. **Auto-assign**: Assign issues based on labels
2. **Status transitions**: Automatic status changes
3. **Notifications**: Custom notification rules
4. **Integrations**: Connect with other tools

### Reporting and Analytics

Generate reports using Linear data:

- Sprint velocity tracking
- Issue completion rates
- Team performance metrics
- Project progress reports

## Training Exercises

### Exercise 1: Create and Manage an Issue

1. Create a new feature issue
2. Add appropriate labels and description
3. Assign to yourself
4. Move through the workflow states
5. Close the issue

### Exercise 2: Use Automated Workflows

1. Create a feature branch
2. Make commits with proper format
3. Open a pull request
4. Observe automatic status updates
5. Merge and verify completion

### Exercise 3: Troubleshoot Integration

1. Simulate a sync failure
2. Check logs and identify the issue
3. Apply appropriate fix
4. Verify resolution

## Resources

### Documentation Links

- [Linear API Documentation](https://developers.linear.app/)
- [GraphQL Playground](https://api.linear.app/graphql)
- [Webhook Documentation](https://developers.linear.app/docs/webhooks)
- [Kiro Agent Hooks Guide](./AGENT_HOOK_WORKFLOWS.md)

### Team Resources

- Linear Workspace: [Lumina Product Team](https://linear.app/lumina)
- Project Dashboard: [UseLumina.app](https://linear.app/lumina/project/uselumina)
- Team Chat: Development channel
- Weekly Standup: Monday 9 AM

### Support Contacts

- **Technical Issues**: Development team lead
- **Process Questions**: Product manager
- **Linear Account Issues**: Workspace admin
- **Integration Bugs**: Create Linear issue with "Type: Bug" label