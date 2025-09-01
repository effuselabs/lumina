# Workflow Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for workflow automation issues in the Lumina development environment. It covers Agent Hooks, Linear integration, documentation sync, and performance monitoring systems.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Agent Hook Issues](#agent-hook-issues)
3. [Linear Integration Problems](#linear-integration-problems)
4. [Documentation Sync Issues](#documentation-sync-issues)
5. [Performance and Monitoring](#performance-and-monitoring)
6. [System Health Checks](#system-health-checks)
7. [Recovery Procedures](#recovery-procedures)
8. [Preventive Measures](#preventive-measures)

## Quick Diagnostics

### System Status Check

Run this quick diagnostic to check overall system health:

```bash
# Check environment variables
echo "LINEAR_API_TOKEN: ${LINEAR_API_TOKEN:0:10}..."
echo "WORKFLOW_WEBHOOK_URL: $WORKFLOW_WEBHOOK_URL"

# Test Linear API connectivity
curl -s -H "Authorization: Bearer $LINEAR_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "{ viewer { id name } }"}' \
     https://api.linear.app/graphql | jq '.data.viewer.name'

# Check Kiro Agent Hook status
# (This would be done through Kiro IDE interface)
```

### Common Symptoms and Quick Fixes

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| Agent Hooks not triggering | Hook disabled or misconfigured | Check Kiro IDE Agent Hook settings |
| Linear issues not updating | API token expired or invalid | Refresh Linear API token |
| Documentation sync failing | File permission issues | Check file system permissions |
| Performance alerts firing | System overload or configuration issue | Check system resources and thresholds |
| Webhook failures | Network connectivity or endpoint issues | Verify webhook URL and connectivity |

## Agent Hook Issues

### Agent Hook Not Triggering

**Symptoms**:
- Expected hooks don't execute on file save
- No log entries for hook execution
- Manual triggers don't work

**Diagnostic Steps**:

1. **Check Hook Configuration**:
   ```json
   // Verify hook configuration in Kiro IDE
   {
     "name": "Documentation Sync",
     "enabled": true,
     "trigger": "file_save",
     "filePatterns": ["**/*.ts", "**/*.tsx"]
   }
   ```

2. **Verify File Patterns**:
   ```bash
   # Test if file matches patterns
   echo "components/ui/button.tsx" | grep -E "\.(ts|tsx)$"
   ```

3. **Check Permissions**:
   ```bash
   # Verify file system permissions
   ls -la components/ui/button.tsx
   ```

**Solutions**:

- **Enable Hook**: Ensure hook is enabled in Kiro IDE settings
- **Fix Patterns**: Update file patterns to match target files
- **Permissions**: Fix file system permissions if needed
- **Restart Kiro**: Restart Kiro IDE to reload hook configurations

### Hook Execution Failures

**Symptoms**:
- Hook triggers but fails during execution
- Error messages in logs
- Partial completion of hook actions

**Diagnostic Steps**:

1. **Check Hook Logs**:
   ```bash
   # View recent hook execution logs
   tail -f ~/.kiro/logs/agent-hooks.log
   ```

2. **Test Hook Logic**:
   ```typescript
   // Test hook logic manually
   import { documentationSyncHook } from './hooks/documentation-sync';
   
   try {
     await documentationSyncHook.execute('path/to/file.ts');
   } catch (error) {
     console.error('Hook execution failed:', error);
   }
   ```

**Solutions**:

- **Fix Dependencies**: Ensure all required dependencies are available
- **Handle Errors**: Improve error handling in hook logic
- **Resource Limits**: Check if system resources are sufficient
- **API Limits**: Verify API rate limits aren't exceeded

### Hook Performance Issues

**Symptoms**:
- Slow hook execution
- Timeouts during hook processing
- System becomes unresponsive

**Diagnostic Steps**:

1. **Monitor Execution Time**:
   ```typescript
   const startTime = Date.now();
   await hookFunction();
   const executionTime = Date.now() - startTime;
   console.log(`Hook executed in ${executionTime}ms`);
   ```

2. **Check System Resources**:
   ```bash
   # Monitor CPU and memory usage
   top -p $(pgrep -f kiro)
   ```

**Solutions**:

- **Optimize Logic**: Improve hook algorithm efficiency
- **Async Processing**: Use asynchronous processing for heavy operations
- **Batch Operations**: Process multiple files in batches
- **Caching**: Implement caching for repeated operations

## Linear Integration Problems

### API Authentication Issues

**Symptoms**:
- "Unauthorized" errors in logs
- Linear API calls failing
- Issues not syncing

**Diagnostic Steps**:

1. **Test API Token**:
   ```bash
   curl -H "Authorization: Bearer $LINEAR_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"query": "{ viewer { id name email } }"}' \
        https://api.linear.app/graphql
   ```

2. **Check Token Permissions**:
   ```graphql
   query {
     viewer {
       id
       name
       email
       organization {
         name
       }
     }
   }
   ```

**Solutions**:

- **Refresh Token**: Generate new Linear API token
- **Check Permissions**: Ensure token has required permissions
- **Update Environment**: Update environment variables with new token
- **Verify Scope**: Confirm token scope includes required operations

### Issue Creation Failures

**Symptoms**:
- Issues not being created automatically
- "Invalid input" errors
- Missing required fields errors

**Diagnostic Steps**:

1. **Validate Issue Data**:
   ```typescript
   const issueData = {
     title: "Test Issue",
     description: "Test description",
     teamId: process.env.LINEAR_TEAM_ID,
     projectId: process.env.LINEAR_PROJECT_ID
   };
   
   // Validate required fields
   console.log('Issue data:', issueData);
   ```

2. **Test Issue Creation**:
   ```graphql
   mutation CreateIssue($input: IssueCreateInput!) {
     issueCreate(input: $input) {
       success
       issue {
         id
         title
       }
       error
     }
   }
   ```

**Solutions**:

- **Required Fields**: Ensure all required fields are provided
- **Valid IDs**: Verify team and project IDs are correct
- **Field Validation**: Check field formats and constraints
- **Error Handling**: Improve error handling and logging

### Sync Delays and Failures

**Symptoms**:
- Issues update with significant delay
- Some updates not syncing
- Inconsistent sync behavior

**Diagnostic Steps**:

1. **Check Sync Queue**:
   ```typescript
   // Monitor sync queue status
   const queueStatus = await syncQueue.getStatus();
   console.log('Pending syncs:', queueStatus.pending);
   console.log('Failed syncs:', queueStatus.failed);
   ```

2. **Test Webhook Delivery**:
   ```bash
   # Test webhook endpoint
   curl -X POST $WORKFLOW_WEBHOOK_URL \
        -H "Content-Type: application/json" \
        -d '{"test": true}'
   ```

**Solutions**:

- **Retry Logic**: Implement exponential backoff for failed syncs
- **Queue Management**: Clear stuck items from sync queue
- **Webhook Config**: Verify webhook configuration and accessibility
- **Rate Limiting**: Implement proper rate limiting for API calls

## Documentation Sync Issues

### File Detection Problems

**Symptoms**:
- Documentation requirements not detected
- Wrong files being analyzed
- Missing documentation not flagged

**Diagnostic Steps**:

1. **Test File Pattern Matching**:
   ```bash
   # Test glob patterns
   find . -name "*.ts" -not -path "./node_modules/*" | head -10
   ```

2. **Check File Analysis Logic**:
   ```typescript
   import { analyzeFileForDocumentation } from './lib/documentation-analyzer';
   
   const analysis = await analyzeFileForDocumentation('lib/auth.ts');
   console.log('Documentation required:', analysis.requiresDocumentation);
   console.log('Missing docs:', analysis.missingDocumentation);
   ```

**Solutions**:

- **Update Patterns**: Fix file pattern matching logic
- **Improve Analysis**: Enhance code analysis for documentation detection
- **Exclude Files**: Add proper exclusion patterns for generated files
- **Validation Logic**: Improve documentation validation rules

### Documentation Validation Errors

**Symptoms**:
- False positives for missing documentation
- Incorrect documentation quality assessments
- Validation logic errors

**Diagnostic Steps**:

1. **Test Validation Logic**:
   ```typescript
   import { validateDocumentation } from './lib/documentation-validator';
   
   const result = await validateDocumentation('docs/API.md');
   console.log('Validation result:', result);
   ```

2. **Check Documentation Standards**:
   ```markdown
   <!-- Verify documentation follows standards -->
   # API Documentation
   
   ## Overview
   [Required overview section]
   
   ## Methods
   [Required methods documentation]
   ```

**Solutions**:

- **Fix Validation Rules**: Update validation logic to reduce false positives
- **Improve Standards**: Clarify documentation standards and requirements
- **Better Parsing**: Enhance markdown and code comment parsing
- **User Feedback**: Collect feedback on validation accuracy

## Performance and Monitoring

### High Resource Usage

**Symptoms**:
- High CPU or memory usage
- System slowdowns
- Timeout errors

**Diagnostic Steps**:

1. **Monitor Resource Usage**:
   ```bash
   # Check system resources
   htop
   
   # Monitor specific processes
   ps aux | grep -E "(kiro|node)"
   
   # Check memory usage
   free -h
   ```

2. **Profile Performance**:
   ```typescript
   // Add performance monitoring
   const startTime = process.hrtime.bigint();
   await performOperation();
   const endTime = process.hrtime.bigint();
   const duration = Number(endTime - startTime) / 1000000; // Convert to ms
   console.log(`Operation took ${duration}ms`);
   ```

**Solutions**:

- **Optimize Algorithms**: Improve algorithm efficiency
- **Memory Management**: Fix memory leaks and optimize usage
- **Async Processing**: Use asynchronous processing to prevent blocking
- **Resource Limits**: Set appropriate resource limits

### Monitoring System Failures

**Symptoms**:
- Missing performance metrics
- Alerting system not working
- Dashboard showing no data

**Diagnostic Steps**:

1. **Check Monitoring Services**:
   ```typescript
   import { workflowMonitoringDashboard } from './lib/workflow-monitoring-dashboard';
   
   const dashboardData = await workflowMonitoringDashboard.getDashboardData();
   console.log('Dashboard status:', dashboardData.healthStatus);
   ```

2. **Test Alert Channels**:
   ```typescript
   import { workflowAlertingSystem } from './lib/workflow-alerting-system';
   
   const testResult = await workflowAlertingSystem.testChannel('console');
   console.log('Alert test result:', testResult);
   ```

**Solutions**:

- **Restart Services**: Restart monitoring and alerting services
- **Fix Configuration**: Correct monitoring configuration issues
- **Check Dependencies**: Ensure all monitoring dependencies are available
- **Data Collection**: Verify data collection is working properly

## System Health Checks

### Daily Health Check Script

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Lumina Workflow Health Check ==="
echo "Date: $(date)"
echo

# Check environment variables
echo "1. Environment Configuration:"
echo "   LINEAR_API_TOKEN: ${LINEAR_API_TOKEN:+SET} ${LINEAR_API_TOKEN:-NOT SET}"
echo "   WORKFLOW_WEBHOOK_URL: ${WORKFLOW_WEBHOOK_URL:-NOT SET}"
echo

# Test Linear API
echo "2. Linear API Connectivity:"
if curl -s -H "Authorization: Bearer $LINEAR_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"query": "{ viewer { id } }"}' \
        https://api.linear.app/graphql | grep -q '"id"'; then
    echo "   ✅ Linear API accessible"
else
    echo "   ❌ Linear API connection failed"
fi
echo

# Check disk space
echo "3. System Resources:"
echo "   Disk usage:"
df -h | grep -E "(/$|/home)" | while read line; do
    echo "     $line"
done
echo

# Check recent errors
echo "4. Recent Errors:"
if [ -f ~/.kiro/logs/agent-hooks.log ]; then
    error_count=$(grep -c "ERROR" ~/.kiro/logs/agent-hooks.log | tail -100)
    echo "   Recent errors in agent hooks: $error_count"
else
    echo "   No agent hook logs found"
fi
echo

echo "=== Health Check Complete ==="
```

### Weekly Performance Review

```typescript
// weekly-performance-review.ts
import { workflowMonitoringDashboard } from './lib/workflow-monitoring-dashboard';
import { hybridModelPerformanceMonitor } from './lib/hybrid-model-performance-monitor';

async function generateWeeklyReport() {
  console.log('=== Weekly Performance Review ===');
  console.log(`Date: ${new Date().toISOString()}`);
  
  // Workflow metrics
  const dashboardData = await workflowMonitoringDashboard.getDashboardData();
  console.log('\n1. Workflow Automation:');
  console.log(`   Overall Health: ${dashboardData.healthStatus.overall}`);
  console.log(`   Success Rate: ${dashboardData.healthStatus.successRate.toFixed(1)}%`);
  console.log(`   Active Alerts: ${dashboardData.healthStatus.activeAlerts}`);
  
  // Financial calculation performance
  const financialMetrics = hybridModelPerformanceMonitor.getPerformanceSummary();
  console.log('\n2. Financial Calculations:');
  console.log(`   Overall Health: ${financialMetrics.overallHealth}`);
  console.log(`   Success Rate: ${financialMetrics.successRate.toFixed(1)}%`);
  console.log(`   Accuracy Rate: ${financialMetrics.accuracyRate.toFixed(1)}%`);
  
  // Recommendations
  if (dashboardData.recommendations.length > 0) {
    console.log('\n3. Recommendations:');
    dashboardData.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n=== Review Complete ===');
}

// Run weekly review
generateWeeklyReport().catch(console.error);
```

## Recovery Procedures

### Agent Hook Recovery

If Agent Hooks stop working completely:

1. **Restart Kiro IDE**:
   - Close Kiro IDE completely
   - Clear cache if necessary
   - Restart application

2. **Reset Hook Configuration**:
   ```bash
   # Backup current configuration
   cp -r ~/.kiro/hooks ~/.kiro/hooks.backup
   
   # Reset to default configuration
   rm -rf ~/.kiro/hooks
   # Reconfigure hooks through Kiro IDE
   ```

3. **Verify System Dependencies**:
   ```bash
   # Check Node.js version
   node --version
   
   # Check npm packages
   npm list --depth=0
   
   # Reinstall if necessary
   npm install
   ```

### Linear Integration Recovery

If Linear integration fails completely:

1. **Regenerate API Token**:
   - Go to Linear Settings > API
   - Generate new personal API token
   - Update environment variables

2. **Clear Sync Queue**:
   ```typescript
   // Clear stuck sync operations
   import { linearSyncQueue } from './lib/linear-sync-queue';
   await linearSyncQueue.clear();
   ```

3. **Resync Project Data**:
   ```typescript
   // Force full project resync
   import { linearSyncService } from './lib/linear-sync-service';
   await linearSyncService.fullResync();
   ```

### Database Recovery

If workflow data becomes corrupted:

1. **Backup Current Data**:
   ```bash
   # Backup workflow tables
   pg_dump -t workflow_metrics -t agent_hook_logs lumina_db > workflow_backup.sql
   ```

2. **Reset Workflow Tables**:
   ```sql
   -- Clear workflow data (if necessary)
   TRUNCATE TABLE workflow_metrics CASCADE;
   TRUNCATE TABLE agent_hook_logs CASCADE;
   ```

3. **Reinitialize Monitoring**:
   ```typescript
   // Reinitialize monitoring systems
   import { workflowQualityMonitor } from './lib/workflow-quality-monitor';
   workflowQualityMonitor.resetMetrics();
   ```

## Preventive Measures

### Regular Maintenance

1. **Weekly Tasks**:
   - Review workflow performance metrics
   - Check for failed Agent Hook executions
   - Verify Linear API token validity
   - Clean up old log files

2. **Monthly Tasks**:
   - Update Agent Hook configurations
   - Review and optimize performance thresholds
   - Backup workflow configuration
   - Update documentation

3. **Quarterly Tasks**:
   - Comprehensive system health review
   - Update monitoring and alerting rules
   - Review and improve troubleshooting procedures
   - Team training on new features

### Monitoring Setup

1. **Automated Alerts**:
   ```typescript
   // Set up critical alerts
   workflowAlertingSystem.addRule({
     id: 'critical_failure_rate',
     name: 'Critical Failure Rate',
     condition: {
       type: 'threshold',
       metric: 'failure_rate',
       operator: 'gt',
       value: 5 // 5% failure rate
     },
     severity: 'critical',
     channels: ['email', 'webhook']
   });
   ```

2. **Health Check Automation**:
   ```bash
   # Add to crontab for daily health checks
   0 9 * * * /path/to/daily-health-check.sh >> /var/log/workflow-health.log 2>&1
   ```

### Best Practices

1. **Configuration Management**:
   - Keep configurations in version control
   - Document all configuration changes
   - Test configurations before applying

2. **Error Handling**:
   - Implement comprehensive error handling
   - Log errors with sufficient context
   - Provide clear error messages

3. **Performance Optimization**:
   - Monitor performance metrics regularly
   - Optimize based on actual usage patterns
   - Set realistic performance thresholds

4. **Documentation**:
   - Keep troubleshooting guide updated
   - Document new issues and solutions
   - Share knowledge with team members

## Support Resources

### Internal Resources

- **Team Documentation**: [Agent Hook Workflows](./AGENT_HOOK_WORKFLOWS.md)
- **Performance Guide**: [Hybrid Business Model Guide](./HYBRID_BUSINESS_MODEL_GUIDE.md)
- **Training Materials**: [Linear Integration](./project-management/LINEAR_INTEGRATION.md)

### External Resources

- **Kiro IDE Documentation**: [docs.kiro.dev](https://docs.kiro.dev)
- **Linear API Documentation**: [developers.linear.app](https://developers.linear.app)
- **Node.js Performance**: [nodejs.org/en/docs/guides](https://nodejs.org/en/docs/guides)

### Getting Help

1. **Check Documentation**: Review relevant documentation first
2. **Search Logs**: Look for error messages and patterns
3. **Team Support**: Ask team members for assistance
4. **Create Issues**: Document problems in Linear for tracking
5. **External Support**: Contact vendor support if needed

Remember: When in doubt, document the issue and ask for help. It's better to get assistance early than to spend hours troubleshooting alone.