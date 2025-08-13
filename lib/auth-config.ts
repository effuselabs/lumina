import { NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from './prisma';
import type { UserRole } from '@prisma/client';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Email/Password Provider
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials);

          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              businesses: {
                include: {
                  business: true,
                },
              },
              staffProfile: {
                include: {
                  business: true,
                },
              },
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await compare(password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          // Return user with business context
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            businesses: user.businesses,
            staffProfile: user.staffProfile,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),

    // Google OAuth Provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow OAuth sign-ins
      if (account?.provider === 'google') {
        return true;
      }

      // For credentials, user is already validated in authorize
      if (account?.provider === 'credentials') {
        return true;
      }

      return false;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.role = user.role;
        token.businesses = user.businesses;
        token.staffProfile = user.staffProfile;
      }

      // Refresh user data on each request (optional, for real-time updates)
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          include: {
            businesses: {
              include: {
                business: true,
              },
            },
            staffProfile: {
              include: {
                business: true,
              },
            },
          },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.businesses = dbUser.businesses;
          token.staffProfile = dbUser.staffProfile;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.businesses = token.businesses as any;
        session.user.staffProfile = token.staffProfile as any;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`);
    },
    async signOut({ session, token }) {
      console.log(`User signed out`);
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};