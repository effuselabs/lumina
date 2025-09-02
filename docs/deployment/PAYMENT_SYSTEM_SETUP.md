# Payment System Deployment Guide

## Overview

This guide covers the complete setup and deployment of Lumina's payment processing system, including Stripe integration, webhook configuration, and security considerations.

## Prerequisites

### Required Accounts
- [ ] Stripe account (business account recommended for production)
- [ ] Domain with SSL certificate for webhook endpoints
- [ ] Database with transaction tables (handled by Prisma migrations)

### Required Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...

# Database (if not already configured)
DATABASE_URL=postgresql://...

# NextAuth (if not already configured)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Stripe Account Setup

### 1. Create Stripe Account

1. Visit [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Complete business verification (required for live payments)
3. Configure business details and banking information
4. Enable required payment methods (cards, digital wallets)

### 2. API Keys Configuration

1. Navigate to **Developers > API keys** in Stripe Dashboard
2. Copy your **Publishable key** and **Secret key**
3. For production, use live keys; for development, use test keys
4. Store keys securely in environment variables

```bash
# Test Environment
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Production Environment
STRIPE_SECRET_KEY=sk_live_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51...
```

### 3. Webhook Configuration

1. Navigate to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Configure webhook endpoint:
   - **URL**: `https://your-domain.com/api/payments/webhook`
   - **Events**: Select the following events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `payment_intent.requires_action`
     - `charge.dispute.created`
4. Copy the **Signing secret** and add to environment variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Database Setup

### 1. Run Prisma Migrations

Ensure your database includes the transaction tables:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Or if using migrations
npx prisma migrate deploy
```

### 2. Verify Database Schema

Ensure the following tables exist:
- `Transaction` - Main transaction records
- `Staff` - Staff with employment type and commission rates
- `Appointment` - Appointments linked to transactions
- `Business` - Business context for multi-tenancy

## Application Deployment

### 1. Environment Configuration

Create environment files for each environment:

**Development (.env.local):**
```bash
# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://localhost:5432/lumina_dev

# Auth
NEXTAUTH_SECRET=dev-secret-key
NEXTAUTH_URL=http://localhost:3000
```

**Production (.env.production):**
```bash
# Stripe Live Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://prod-db-url/lumina_prod

# Auth
NEXTAUTH_SECRET=secure-production-secret
NEXTAUTH_URL=https://your-production-domain.com
```

### 2. Build and Deploy

**For Railway:**
```bash
# Install dependencies
npm install

# Build application
npm run build

# Deploy to Railway
railway up
```

**For Vercel:**
```bash
# Install dependencies
npm install

# Build application
npm run build

# Deploy to Vercel
vercel --prod
```

### 3. Environment Variables in Deployment Platform

Configure environment variables in your deployment platform:

**Railway:**
1. Go to Project Settings > Variables
2. Add all required environment variables
3. Set appropriate environments (Development, Production)

**Vercel:**
1. Go to Project Settings > Environment Variables
2. Add all required environment variables
3. Set appropriate environments (Development, Preview, Production)

## Security Configuration

### 1. SSL Certificate

Ensure your domain has a valid SSL certificate:
- Required for Stripe webhooks
- Required for PCI compliance
- Use Let's Encrypt or your hosting provider's SSL

### 2. CORS Configuration

Stripe Elements requires proper CORS configuration:
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/payments/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://js.stripe.com'
          }
        ]
      }
    ]
  }
}
```

### 3. Content Security Policy

Update CSP to allow Stripe resources:
```javascript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.stripe.com;
  frame-src https://js.stripe.com;
`
```

## Testing Setup

### 1. Test Environment

Set up a dedicated test environment:
```bash
# Test database
DATABASE_URL=postgresql://localhost:5432/lumina_test

# Stripe test keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2. Test Data

Create test data for payment testing:
```sql
-- Test business
INSERT INTO "Business" (id, name, email) VALUES 
('test-business', 'Test Salon', 'test@example.com');

-- Test staff with different employment types
INSERT INTO "Staff" (id, "businessId", "displayName", "employmentType", "commissionRate") VALUES 
('test-staff-commission', 'test-business', 'Commission Staff', 'COMMISSION', 40.0),
('test-staff-rental', 'test-business', 'Rental Staff', 'CHAIR_RENTAL', NULL),
('test-staff-hybrid', 'test-business', 'Hybrid Staff', 'HYBRID', 30.0);
```

### 3. Webhook Testing

Use Stripe CLI for local webhook testing:
```bash
# Install Stripe CLI
# Follow instructions at https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/payments/webhook

# Test webhook events
stripe trigger payment_intent.succeeded
```

## Production Checklist

### Pre-deployment
- [ ] Stripe live keys configured
- [ ] Webhook endpoints accessible from Stripe
- [ ] SSL certificate installed and valid
- [ ] Database migrations applied
- [ ] Environment variables set correctly
- [ ] CORS and CSP configured for Stripe

### Post-deployment
- [ ] Test payment flow with test cards
- [ ] Verify webhook events are received
- [ ] Check transaction logging
- [ ] Validate commission calculations
- [ ] Test refund processing
- [ ] Verify business data isolation

### Monitoring
- [ ] Set up error monitoring (Sentry)
- [ ] Configure payment failure alerts
- [ ] Monitor webhook delivery success
- [ ] Track transaction processing times
- [ ] Set up financial reconciliation reports

## Troubleshooting

### Common Issues

**Webhook Signature Verification Fails**
- Verify webhook secret is correct
- Check that raw request body is used for verification
- Ensure webhook endpoint is accessible from Stripe

**Payment Intent Creation Fails**
- Verify Stripe API keys are correct
- Check that amount is in cents (for USD)
- Ensure business context is properly set

**Commission Calculations Incorrect**
- Verify staff employment type and commission rate
- Check that appointment data includes correct staff assignment
- Ensure transaction service calculations are accurate

### Support Resources
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)
- [Lumina Payment System Documentation](../features/payment-system/README.md)

This deployment guide ensures a secure and reliable payment processing system for your Lumina installation.