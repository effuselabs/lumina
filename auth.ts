import { authConfig } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

// Validation schema for credentials
const credentialsSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Session strategy, pages and callbacks live in auth.config.ts so that
// middleware.ts can consume them without pulling bcryptjs/Prisma into the
// Edge bundle. Only the Node-only Credentials provider is added here.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  // Authentication providers
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate credentials format
          const validatedCredentials = credentialsSchema.parse(credentials);
          const { email, password } = validatedCredentials;

          // Find user in database with business relationships
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              businesses: {
                select: {
                  businessId: true,
                  role: true,
                },
                orderBy: {
                  createdAt: 'asc', // Use the first business as primary
                },
                take: 1, // Get the primary business
              },
            },
          });

          if (!user || !user.password) {
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          // Return user data (password excluded)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            businessId: user.businesses[0]?.businessId, // Primary business
          };
        } catch (error) {
          // Log authentication errors for security monitoring
          if (!(error instanceof z.ZodError)) {
            // Log to monitoring service in production
          }
          return null;
        }
      },
    }),
  ],

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Events for logging
  events: {
    async signIn({ user: _user, account: _account, profile: _profile }) {
      // Log to monitoring service in production
    },
    async signOut(params) {
      // Log to monitoring service in production
    },
  },
});

// TypeScript module augmentation for NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image?: string | null;
      role: string;
      businessId?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    businessId?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    role: string;
    businessId?: string;
  }
}
