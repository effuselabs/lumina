# Development Environment Setup

This guide will help you set up the Lumina development environment using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js 18+](https://nodejs.org/) (for local development without Docker)
- [Git](https://git-scm.com/)

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lumina
   ```

2. **Start the development environment**
   ```bash
   npm run docker:dev
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Redis cache on port 6379
   - Next.js application on port 3000
   - Prisma Studio on port 5555

3. **Initialize the database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Access the application**
   - Application: http://localhost:3000
   - Authentication: http://localhost:3000/auth/signin
   - Prisma Studio: http://localhost:5555
   - Health Check: http://localhost:3000/api/health

## Local Development (without Docker)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Sign in with demo accounts**
   Use the demo accounts listed below to explore the application

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Database
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Docker
- `npm run docker:dev` - Start development environment with Docker
- `npm run docker:dev:detached` - Start in detached mode
- `npm run docker:down` - Stop Docker containers
- `npm run docker:clean` - Stop and remove all containers and volumes

## Demo Accounts

After seeding the database, you can use these demo accounts to explore the application:

**Business Owner:**
- Email: owner@lumina-demo.com
- Password: demo123
- Access: Full business management capabilities

**Senior Hair Stylist:**
- Email: mike@lumina-demo.com
- Password: demo123
- Services: Hair cuts, styling, color, eyebrow shaping

**Nail Technician & Colorist:**
- Email: emma@lumina-demo.com
- Password: demo123
- Services: Manicures, pedicures, gel nails, hair color, highlights

**Demo Business:** Lumina Demo Salon
- Pre-configured services with realistic pricing
- Sample clients with contact information
- Upcoming appointments for testing
- Staff schedules and availability patterns

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://lumina:lumina_dev_password@localhost:5432/lumina_dev"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe (for payments)
STRIPE_SECRET_KEY="your-stripe-secret-key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

## Troubleshooting

### Docker Issues

1. **Port conflicts**: Make sure ports 3000, 5432, 6379, and 5555 are available
2. **Permission issues**: On Linux/Mac, you might need to run Docker commands with `sudo`
3. **Build failures**: Try cleaning Docker cache with `docker system prune -a`

### Database Issues

1. **Connection errors**: Ensure PostgreSQL is running and accessible
2. **Migration failures**: Try resetting the database with `npm run db:reset`
3. **Prisma client issues**: Regenerate the client with `npm run db:generate`

### Development Issues

1. **Module not found**: Delete `node_modules` and run `npm install`
2. **Type errors**: Run `npm run type-check` to see detailed TypeScript errors
3. **Lint errors**: Run `npm run lint:fix` to auto-fix common issues

## Git Hooks

Pre-commit hooks are automatically set up with Husky to:
- Run lint-staged for code formatting
- Perform TypeScript type checking
- Ensure code quality before commits

## Next Steps

After setting up the development environment:

1. Review the [Git Workflow Guide](./GIT_WORKFLOW.md) for branching strategy
2. Read the [Contributing Guide](../CONTRIBUTING.md) for development standards
3. Check the [Authentication Documentation](./AUTHENTICATION.md) for auth system details
4. Explore the [Brand Guidelines](./BRAND_STYLEGUIDE.md) for design system
5. Review the [Changelog](../CHANGELOG.md) for recent updates