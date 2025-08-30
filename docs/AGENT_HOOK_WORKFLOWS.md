# Agent Hook Workflows Documentation

## Overview

This document provides comprehensive documentation for the Agent Hook workflows implemented in the Lumina development environment. These workflows automate documentation synchronization, steering compliance checking, and Linear project management integration.

## Table of Contents

1. [Agent Hook Types](#agent-hook-types)
2. [Documentation Sync Agent Hook](#documentation-sync-agent-hook)
3. [Steering Compliance Agent Hook](#steering-compliance-agent-hook)
4. [Linear Synchronization Agent Hook](#linear-synchronization-agent-hook)
5. [Manual Documentation Audit Agent Hook](#manual-documentation-audit-agent-hook)
6. [Configuration and Setup](#configuration-and-setup)
7. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

## Agent Hook Types

### 1. Documentation Sync Agent Hook

**Purpose**: Automatically detects when code files are modified and ensures related documentation is updated.

**Trigger**: File save events on TypeScript/React files
**Frequency**: Real-time (on file save)
**Scope**: All `.ts`, `.tsx`, `.js`, `.jsx` files in the project

**Functionality**:
- Analyzes modified code files for documentation requirements
- Checks if related documentation exists and is up-to-date
- Creates Linear issues for missing or outdated documentation
- Validates documentation completeness and accuracy
- Provides suggestions for documentation improvements

**Configuration**:
```json
{
  "name": "Documentation Sync",
  "trigger": "file_save",
  "filePatterns": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  "excludePatterns": ["node_modules/**", "dist/**", ".next/**"],
  "settings": {
    "requireDocumentation": true,
    "createLinearIssues": true,
    "documentationThreshold": 0.85
  }
}
```

### 2. Steering Compliance Agent Hook

**Purpose**: Validates code against steering file patterns and ensures compliance with development standards.

**Trigger**: File save events on code files
**Frequency**: Real-time (on file save)
**Scope**: API routes, components, database files, and configuration files

**Functionality**:
- Checks code against all steering file patterns
- Validates compliance with coding standards and best practices
- Provides automated suggestions for compliance fixes
- Creates Linear issues for compliance violations
- Tracks compliance metrics over time

**Configuration**:
```json
{
  "name": "Steering Compliance",
  "trigger": "file_save",
  "filePatterns": ["app/api/**/*.ts", "components/**/*.tsx", "lib/**/*.ts", "prisma/**/*.prisma"],
  "steeringFiles": [
    ".kiro/steering/coding-approach-and-standards.md",
    ".kiro/steering/security.md",
    ".kiro/steering/api-standards.md",
    ".kiro/steering/database-standards.md",
    ".kiro/steering/ui-standards.md"
  ],
  "settings": {
    "strictMode": true,
    "autoFix": false,
    "createLinearIssues": true
  }
}
```

### 3. Linear Synchronization Agent Hook

**Purpose**: Automatically synchronizes development progress with Linear project management.

**Trigger**: Task completion, code commits, PR merges
**Frequency**: Event-driven
**Scope**: All development tasks and Linear issues

**Functionality**:
- Updates Linear issue status based on development progress
- Creates new Linear issues from development tasks
- Synchronizes labels and milestones with development plan changes
- Tracks progress automation with status updates
- Maintains bidirectional sync between code and project management

**Configuration**:
```json
{
  "name": "Linear Synchronization",
  "trigger": ["task_complete", "commit", "pr_merge"],
  "linearConfig": {
    "teamId": "lumina-team-id",
    "projectId": "lumina-project-id",
    "autoCreateIssues": true,
    "autoUpdateStatus": true,
    "syncLabels": true
  },
  "settings": {
    "bidirectionalSync": true,
    "conflictResolution": "manual"
  }
}
```

### 4. Manual Documentation Audit Agent Hook

**Purpose**: Provides comprehensive documentation reviews and maintenance automation.

**Trigger**: Manual execution or scheduled (quarterly)
**Frequency**: On-demand or quarterly
**Scope**: All project documentation

**Functionality**:
- Performs comprehensive documentation health checks
- Identifies outdated, missing, or inconsistent documentation
- Generates documentation health reports
- Creates automated maintenance tasks in Linear
- Provides recommendations for documentation improvements

**Configuration**:
```json
{
  "name": "Documentation Audit",
  "trigger": "manual",
  "schedule": "quarterly",
  "scope": ["docs/**", "README.md", "**/*.md"],
  "settings": {
    "checkLinks": true,
    "validateCodeExamples": true,
    "checkConsistency": true,
    "generateReport": true
  }
}
```

## Configuration and Setup

### Prerequisites

1. **Kiro IDE**: Agent Hooks require Kiro IDE with Agent Hook support
2. **Linear Integration**: Linear API token and project configuration
3. **File System Access**: Proper permissions for file monitoring
4. **Environment Variables**: Required configuration variables

### Environment Variables

```bash
# Linear Integration
LINEAR_API_TOKEN=your_linear_api_token
LINEAR_TEAM_ID=your_team_id
LINEAR_PROJECT_ID=your_project_id

# Workflow Monitoring
WORKFLOW_WEBHOOK_URL=https://your-webhook-url.com/alerts
WORKFLOW_WEBHOOK_TOKEN=your_webhook_token
WORKFLOW_ALERT_EMAILS=dev@example.com,team@example.com

# SMTP Configuration (for email alerts)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### Installation Steps

1. **Enable Agent Hooks in Kiro**:
   - Open Kiro IDE
   - Navigate to Settings > Agent Hooks
   - Enable Agent Hook functionality

2. **Configure Hook Definitions**:
   - Create hook configuration files in `.kiro/hooks/`
   - Define trigger conditions and actions
   - Set up file patterns and exclusions

3. **Set Up Linear Integration**:
   - Configure Linear API credentials
   - Set up team and project mappings
   - Test Linear connectivity

4. **Configure Monitoring**:
   - Set up webhook endpoints for alerts
   - Configure email notifications
   - Test alerting channels

## Monitoring and Troubleshooting

### Monitoring Dashboard

Access the workflow monitoring dashboard to track:
- Agent Hook execution metrics
- Success/failure rates
- Performance statistics
- Active alerts and issues

### Common Issues and Solutions

#### 1. Agent Hook Not Triggering

**Symptoms**: Hook doesn't execute on expected events
**Causes**: 
- Incorrect file patterns
- Missing permissions
- Hook disabled

**Solutions**:
- Verify file patterns match target files
- Check file system permissions
- Ensure hook is enabled in configuration

#### 2. Linear Synchronization Failures

**Symptoms**: Linear issues not updating, sync errors
**Causes**:
- Invalid API token
- Network connectivity issues
- Rate limiting

**Solutions**:
- Verify Linear API token is valid
- Check network connectivity
- Implement retry logic with backoff

#### 3. Documentation Sync Issues

**Symptoms**: Documentation requirements not detected
**Causes**:
- Incorrect code analysis
- Missing documentation patterns
- File parsing errors

**Solutions**:
- Review code analysis logic
- Update documentation detection patterns
- Check file parsing for syntax errors

#### 4. Performance Issues

**Symptoms**: Slow hook execution, timeouts
**Causes**:
- Large file processing
- Complex analysis logic
- Resource constraints

**Solutions**:
- Optimize file processing algorithms
- Implement async processing
- Add performance monitoring

### Debugging Agent Hooks

1. **Enable Debug Logging**:
   ```json
   {
     "logging": {
       "level": "debug",
       "includeStackTrace": true
     }
   }
   ```

2. **Check Hook Execution Logs**:
   - Review Kiro IDE logs
   - Check system console output
   - Monitor webhook responses

3. **Test Hook Manually**:
   - Use manual trigger for testing
   - Verify hook logic with sample files
   - Check Linear API responses

### Performance Optimization

1. **File Pattern Optimization**:
   - Use specific patterns to reduce scope
   - Exclude unnecessary directories
   - Implement efficient file filtering

2. **Async Processing**:
   - Process large files asynchronously
   - Implement queue-based processing
   - Use worker threads for heavy operations

3. **Caching**:
   - Cache analysis results
   - Store documentation metadata
   - Implement intelligent cache invalidation

## Best Practices

### Hook Development

1. **Keep Hooks Focused**: Each hook should have a single, well-defined purpose
2. **Handle Errors Gracefully**: Implement comprehensive error handling
3. **Provide Clear Feedback**: Give users clear information about hook actions
4. **Test Thoroughly**: Test hooks with various file types and scenarios

### Configuration Management

1. **Use Environment Variables**: Store sensitive configuration in environment variables
2. **Version Control**: Keep hook configurations in version control
3. **Documentation**: Document all configuration options and their effects
4. **Validation**: Validate configuration before hook execution

### Monitoring and Maintenance

1. **Regular Monitoring**: Check hook performance and success rates regularly
2. **Alert Configuration**: Set up appropriate alerts for failures and issues
3. **Performance Tracking**: Monitor execution times and resource usage
4. **Regular Updates**: Keep hook logic updated with project changes

## Support and Resources

### Getting Help

1. **Documentation**: Refer to this documentation for common issues
2. **Logs**: Check Kiro IDE logs for detailed error information
3. **Community**: Reach out to the development team for support
4. **Issues**: Create Linear issues for bugs or feature requests

### Additional Resources

- [Kiro Agent Hook API Documentation](https://docs.kiro.dev/agent-hooks)
- [Linear API Documentation](https://developers.linear.app/)
- [Workflow Monitoring Dashboard](./WORKFLOW_MONITORING.md)
- [Troubleshooting Guide](./WORKFLOW_TROUBLESHOOTING_GUIDE.md)