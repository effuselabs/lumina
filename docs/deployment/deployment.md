# Deployment Guide

This document outlines the deployment process and configuration for the Lumina application.

## Overview

Lumina uses a comprehensive CI/CD pipeline with the following components:

- **CI/CD Platform**: GitHub Actions
- **Deployment Platform**: Railway
- **Monitoring**: Sentry for error tracking
- **Environments**: Development, Staging, Production, Preview (PR-based)

## Environments

### Development

- **Purpose**: Local development environment
- **Database**: Local PostgreSQL via Docker
- **URL**: `http://localhost:3000`
- **Branch**: Any feature branch

### Staging

- **Purpose**: Pre-production testing environment
- **Database**: Railway PostgreSQL (staging)
- **URL**: `https://lumina-staging.railway.app`
- **Branch**: `develop`
- **Auto-deploy**: On push to `develop` branch

### Production

- **Purpose**: Live production environment
- **Database**: Railway PostgreSQL (production)
- **URL**: `https://uselumina.app`
- **Branch**: `main`
- **Auto-deploy**: On push to `main` branch

### Preview

- **Purpose**: PR review and testing
- **Database**: Temporary Railway PostgreSQL
- **URL**: `https://lumina-pr-{number}.railway.app`
- **Branch**: Any PR branch
- **Auto-deploy**: On PR creation/update
- **Auto-cleanup**: On PR close

## CI/CD Pipeline

### Continuous Integration (CI)

The CI pipeline runs on every push and pull request:

1. **Code Quality Checks**
   - TypeScript type checking
   - ESLint linting
   - Prettier formatting check

2. **Testing**
   - Unit tests with Jest
   - Integration tests with React Testing Library
   - End-to-end tests with Playwright
   - Code coverage reporting

3. **Security**
   - npm audit for vulnerabilities
   - Dependency checks

4. **Build Verification**
   - Next.js build test
   - Prisma client generation

### Deployment Pipeline

The deployment pipeline runs on specific triggers:

1. **Pre-deployment Checks**
   - All CI checks must pass
   - Build verification
   - Database migration dry-run

2. **Deployment**
   - Railway deployment
   - Database migrations
   - Environment variable configuration

3. **Post-deployment Verification**
   - Health checks
   - Smoke tests
   - Performance monitoring

4. **Rollback Capability**
   - Automatic rollback on failure
   - Manual rollback via GitHub Actions

## Environment Variables

### Required for All Environments

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe Payments
STRIPE_PUBLIC_KEY=pk_test_or_live_key
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### GitHub Secrets Required

```bash
# Railway
RAILWAY_TOKEN=your-railway-token

# Environment URLs
PROD_BASE_URL=https://uselumina.app
PROD_HEALTH_URL=https://uselumina.app
STAGING_BASE_URL=https://lumina-staging.railway.app
STAGING_HEALTH_URL=https://lumina-staging.railway.app

# Monitoring
CODECOV_TOKEN=your-codecov-token
```

## Deployment Commands

### Manual Deployment

```bash
# Deploy to staging
gh workflow run deploy.yml -f environment=staging

# Deploy to production
gh workflow run deploy.yml -f environment=production
```

### Local Development

```bash
# Start development environment
npm run docker:dev

# Run database migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development server
npm run dev
```

## Monitoring and Alerting

### Health Checks

- **Endpoint**: `/api/health`
- **Frequency**: Every 30 seconds
- **Checks**: Database connectivity, memory usage, response time

### Error Tracking

- **Platform**: Sentry
- **Coverage**: Client-side and server-side errors
- **Features**: Session replay, performance monitoring, release tracking

### Performance Monitoring

- **Metrics**: Core Web Vitals, API response times, database query performance
- **Alerting**: Automatic alerts for performance degradation

## Rollback Procedures

### Automatic Rollback

- Triggered on deployment verification failure
- Reverts to previous stable deployment
- Notifications sent to team

### Manual Rollback

```bash
# Via Railway CLI
railway rollback

# Via GitHub Actions
gh workflow run deploy.yml -f environment=production
# Then select previous deployment in Railway dashboard
```

## Database Migrations

### Production Migrations

```bash
# Migrations run automatically during deployment
railway run npm run db:migrate:prod
```

### Migration Best Practices

1. **Backward Compatibility**: Ensure migrations are backward compatible
2. **Testing**: Test migrations on staging first
3. **Rollback Plan**: Have a rollback plan for destructive changes
4. **Monitoring**: Monitor application after migrations

## Security Considerations

### Environment Security

- All secrets stored in GitHub Secrets
- Environment variables encrypted at rest
- No sensitive data in code or logs

### Deployment Security

- Signed commits required
- Branch protection rules enforced
- Required status checks before merge

### Runtime Security

- Security headers configured
- HTTPS enforced
- Regular dependency updates

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors
   - Verify environment variables
   - Review dependency conflicts

2. **Deployment Failures**
   - Check Railway service logs
   - Verify database connectivity
   - Review environment configuration

3. **Health Check Failures**
   - Check database connection
   - Review memory usage
   - Verify API endpoints

### Support Contacts

- **DevOps**: Check GitHub Actions logs
- **Database**: Review Railway PostgreSQL logs
- **Monitoring**: Check Sentry dashboard
- **Performance**: Review health check metrics

## Maintenance

### Regular Tasks

- Weekly dependency updates
- Monthly security audits
- Quarterly performance reviews
- Database maintenance windows

### Backup Strategy

- **Database**: Daily automated backups via Railway
- **Code**: Git repository with multiple remotes
- **Configuration**: Environment variables backed up securely
