import { authConfig } from '@/auth.config';
import { authorizeCredentials } from '@/lib/auth/authorize-credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

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
      authorize: credentials =>
        authorizeCredentials(credentials, {
          findUserByEmail: email =>
            prisma.user.findUnique({
              where: { email },
              select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                businesses: {
                  select: { businessId: true, role: true },
                  orderBy: { createdAt: 'asc' }, // The first business is primary
                  take: 1,
                },
              },
            }),
          verifyPassword: (plain, hash) => bcrypt.compare(plain, hash),
          logError: (message, error) =>
            // There is no structured logger yet; Railway captures stderr.
            // eslint-disable-next-line no-console
            console.error(`[auth] ${message}`, error),
        }),
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
