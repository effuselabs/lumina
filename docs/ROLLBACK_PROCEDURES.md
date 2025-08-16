# Rollback Procedures

This document outlines the procedures for rolling back deployments in case of issues.

## Overview

Lumina has multiple rollback mechanisms to ensure quick recovery from deployment issues:

1. **Automatic Rollback**: Triggered by failed health checks
2. **Manual Rollback**: Initiated by team members
3. **Database Rollback**: For database migration issues
4. **Emergency Rollback**: For critical production issues

## Automatic Rollback

### Triggers

Automatic rollback is triggered when:

- Health check fails after deployment
- Smoke tests fail
- Critical errors detected by Sentry
- Response time exceeds thresholds

### Process

1. **Detection**: Monitoring systems detect failure
2. **Verification**: Multiple health checks confirm issue
3. **Rollback**: Previous stable version is restored
4. **Notification**: Team is notified via GitHub Actions
5. **Investigation**: Issue is logged for investigation

### Configuration

```yaml
# In .github/workflows/deploy.yml
rollback:
  name: Rollback Deployment
  runs-on: ubuntu-latest
  needs: [setup, deploy, verify-deployment]
  if: failure() && needs.deploy.result == 'success'
```

## Manual Rollback

### When to Use Manual Rollback

- Performance degradation detected
- User-reported issues
- Proactive rollback before issues escalate
- Planned rollback for testing

### Railway Dashboard Rollback

1. **Access Railway Dashboard**

   ```bash
   https://railway.app/dashboard
   ```

2. **Navigate to Service**
   - Select `lumina-prod` or `lumina-staging`
   - Go to "Deployments" tab

3. **Select Previous Deployment**
   - Find the last known good deployment
   - Click "Redeploy" on that version

4. **Monitor Rollback**
   - Watch deployment logs
   - Verify health checks pass
   - Confirm application functionality

### CLI Rollback

```bash
# Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# Login to Railway
railway login --token $RAILWAY_TOKEN

# Connect to service
railway service connect lumina-prod

# Rollback to previous deployment
railway rollback

# Verify rollback
railway logs --tail
```

### GitHub Actions Manual Rollback

```bash
# Trigger manual deployment of previous commit
gh workflow run deploy.yml \
  -f environment=production \
  -r <previous-commit-sha>
```

## Database Rollback

### Migration Rollback

⚠️ **Warning**: Database rollbacks are complex and potentially destructive.

#### Safe Migration Rollback

1. **Identify Migration to Rollback**

   ```bash
   railway run npx prisma migrate status
   ```

2. **Create Rollback Migration**

   ```bash
   # Create a new migration that undoes changes
   railway run npx prisma migrate dev --name rollback-feature-x
   ```

3. **Test Rollback Migration**

   ```bash
   # Test on staging first
   railway service connect lumina-staging
   railway run npx prisma migrate deploy
   ```

4. **Apply to Production**
   ```bash
   railway service connect lumina-prod
   railway run npx prisma migrate deploy
   ```

#### Emergency Database Rollback

For critical issues requiring immediate database rollback:

1. **Stop Application**

   ```bash
   railway service connect lumina-prod
   railway service stop
   ```

2. **Restore from Backup**

   ```bash
   # Contact Railway support for backup restoration
   # Or use automated backup restoration
   railway db restore --backup-id <backup-id>
   ```

3. **Verify Data Integrity**

   ```bash
   railway run npx prisma db pull
   railway run npx prisma generate
   ```

4. **Restart Application**
   ```bash
   railway service start
   ```

### Data Backup Strategy

- **Automated Backups**: Daily backups via Railway
- **Pre-deployment Backups**: Before major migrations
- **Point-in-time Recovery**: Available for last 7 days

## Emergency Rollback

### Critical Production Issues

For immediate production issues:

1. **Immediate Response** (< 2 minutes)

   ```bash
   # Quick rollback via Railway CLI
   railway rollback
   ```

2. **Verification** (< 5 minutes)

   ```bash
   # Check health endpoint
   curl https://uselumina.app/api/health

   # Monitor error rates in Sentry
   # Check user reports
   ```

3. **Communication** (< 10 minutes)
   - Update status page
   - Notify stakeholders
   - Document incident

### Emergency Contacts

- **Primary**: DevOps Team Lead
- **Secondary**: CTO
- **Railway Support**: For infrastructure issues
- **Sentry**: For monitoring issues

## Rollback Testing

### Regular Rollback Drills

Monthly rollback drills to ensure procedures work:

1. **Staging Rollback Test**
   - Deploy test version to staging
   - Perform rollback
   - Verify functionality

2. **Production Rollback Simulation**
   - Use preview environment
   - Simulate production rollback
   - Document any issues

### Rollback Verification Checklist

After any rollback:

- [ ] Health checks passing
- [ ] Database connectivity verified
- [ ] Authentication working
- [ ] Payment processing functional
- [ ] Error rates normal in Sentry
- [ ] User-facing features working
- [ ] Performance metrics normal

## Prevention Strategies

### Deployment Safety

1. **Feature Flags**: Use feature flags for risky changes
2. **Gradual Rollout**: Deploy to percentage of users first
3. **Monitoring**: Comprehensive monitoring and alerting
4. **Testing**: Thorough testing before deployment

### Code Quality

1. **Code Review**: All changes reviewed
2. **Automated Testing**: Comprehensive test suite
3. **Static Analysis**: Code quality checks
4. **Security Scanning**: Regular security audits

## Post-Rollback Actions

### Immediate Actions

1. **Verify System Stability**
   - Monitor for 30 minutes post-rollback
   - Check all critical user journeys
   - Verify data integrity

2. **Document Incident**
   - Record rollback reason
   - Document timeline
   - Note any data loss

### Follow-up Actions

1. **Root Cause Analysis**
   - Investigate original issue
   - Identify prevention measures
   - Update procedures if needed

2. **Fix and Redeploy**
   - Fix underlying issue
   - Test thoroughly
   - Deploy fix when ready

3. **Process Improvement**
   - Update rollback procedures
   - Improve monitoring
   - Enhance testing

## Rollback Metrics

### Success Criteria

- **Rollback Time**: < 5 minutes for automatic, < 15 minutes for manual
- **Data Loss**: Zero data loss for application rollbacks
- **Downtime**: < 2 minutes for rollbacks
- **Detection Time**: < 1 minute for automatic detection

### Monitoring

- Track rollback frequency
- Monitor rollback success rate
- Measure time to recovery
- Document lessons learned

## Training and Documentation

### Team Training

- Regular rollback procedure training
- Emergency response drills
- Documentation updates
- Tool familiarity sessions

### Documentation Maintenance

- Monthly procedure review
- Update contact information
- Verify tool access
- Test emergency procedures
