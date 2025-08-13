# Authentication System

Lumina uses NextAuth.js v5 (Auth.js) with a comprehensive multi-tenant authentication system supporting role-based access control.

## Overview

The authentication system provides:
- **Multi-tenant architecture** - Users can belong to multiple businesses
- **Role-based access control** - Different permissions per business
- **Multiple authentication providers** - Email/password and Google OAuth
- **Secure session management** - JWT tokens with proper expiration
- **Business-scoped data access** - Automatic data isolation

## User Roles

### System-Level Roles
- **SUPER_ADMIN** - Platform administration
- **ADMIN** - Platform management
- **OWNER** - Business owner
- **STAFF** - Staff member
- **CLIENT** - Client/customer

### Business-Level Roles
- **OWNER** - Full business control
- **MANAGER** - Business management
- **STAFF** - Limited business access

## Authentication Providers

### Email/Password
- Secure password hashing with bcrypt (12 rounds)
- Password validation (minimum 8 characters)
- Account registration with business creation for owners

### Google OAuth
- Seamless Google account integration
- Automatic account linking
- Profile information synchronization

## Multi-Tenant Architecture

### Business Association
Users can be associated with multiple businesses with different roles:

```typescript
// User can be Owner of Business A and Staff of Business B
{
  user: {
    id: "user123",
    businesses: [
      { businessId: "biz1", role: "OWNER" },
      { businessId: "biz2", role: "STAFF" }
    ]
  }
}
```

### Data Isolation
All business data is automatically scoped:
- Appointments filtered by business
- Clients isolated per business
- Staff only see their business data
- Financial data separated by business

## Permission System

### Business Permissions
```typescript
// Business management
canManageBusiness: (userRole) => ['OWNER'].includes(userRole)
canManageStaff: (userRole) => ['OWNER', 'MANAGER'].includes(userRole)
canManageServices: (userRole) => ['OWNER', 'MANAGER'].includes(userRole)

// Appointment management
canCreateAppointments: (userRole) => ['OWNER', 'MANAGER', 'STAFF'].includes(userRole)
canModifyAppointments: (userRole) => ['OWNER', 'MANAGER'].includes(userRole)

// Financial access
canViewFinancials: (userRole) => ['OWNER', 'MANAGER'].includes(userRole)
canProcessPayments: (userRole) => ['OWNER', 'MANAGER', 'STAFF'].includes(userRole)
```

## Route Protection

### Middleware Protection
Routes are automatically protected based on authentication status and business access:

```typescript
// Public routes (no authentication required)
- /
- /auth/*
- /api/auth/*
- /api/health

// Protected routes (authentication required)
- /dashboard/*

// Business-scoped routes (business access required)
- /dashboard/[businessSlug]/*

// Owner-only routes (business owner access required)
- /dashboard/[businessSlug]/settings/*
- /dashboard/[businessSlug]/manage/*
```

### Server-Side Protection
```typescript
// Require authentication
const session = await requireAuth();

// Require specific role
const session = await requireRole(['OWNER', 'ADMIN']);

// Require business access
const { user, businessUser } = await requireBusinessAccess(businessId);

// Require business owner
const { user, businessUser } = await requireBusinessOwner(businessId);
```

## Session Management

### JWT Configuration
- **Strategy**: JWT tokens
- **Expiration**: 30 days
- **Refresh**: Automatic on each request
- **Security**: Secure HTTP-only cookies

### Session Data
```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    businesses: BusinessMembership[];
    staffProfile?: StaffProfile;
  }
}
```

## API Endpoints

### Registration
```
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "businessName": "John's Salon", // Optional for owners
  "role": "OWNER" // OWNER or STAFF
}
```

### Password Reset
```
POST /api/auth/reset-password
{
  "email": "john@example.com"
}

PUT /api/auth/reset-password
{
  "token": "reset-token",
  "password": "newpassword123"
}
```

## Demo Accounts

For development and testing:

```
Business Owner:
Email: owner@lumina-demo.com
Password: demo123

Senior Hair Stylist:
Email: mike@lumina-demo.com
Password: demo123

Nail Technician:
Email: emma@lumina-demo.com
Password: demo123
```

## Security Features

### Password Security
- bcrypt hashing with 12 rounds
- Minimum 8 character requirement
- Secure password reset with tokens

### Session Security
- HTTP-only cookies
- Secure flag in production
- CSRF protection built-in
- Automatic session expiration

### Route Security
- Middleware-based protection
- Business-scoped access control
- Role-based permissions
- Automatic redirects for unauthorized access

## Development Usage

### Client Components
```typescript
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <Loading />;
  if (!session) return <SignIn />;
  
  return <Dashboard user={session.user} />;
}
```

### Server Components
```typescript
import { getCurrentUser } from '@/lib/auth';

export default async function Page() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  return <Dashboard user={user} />;
}
```

### API Routes
```typescript
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const session = await requireAuth();
  
  // User is authenticated
  return NextResponse.json({ user: session.user });
}
```

## Troubleshooting

### Common Issues

1. **Session not persisting**
   - Check NEXTAUTH_SECRET environment variable
   - Verify NEXTAUTH_URL matches your domain

2. **Google OAuth not working**
   - Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   - Check OAuth redirect URLs in Google Console

3. **Permission denied errors**
   - Verify user has correct business role
   - Check business association in database

4. **Database connection errors**
   - Ensure DATABASE_URL is correct
   - Verify Prisma client is generated

### Debug Mode
Enable debug logging in development:
```env
NEXTAUTH_DEBUG=true
```

This will log detailed authentication information to the console.