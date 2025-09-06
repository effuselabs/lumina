import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  // Ensure proper URL handling in all environments
  trustHost: true,

  // Session configuration
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },

  // Page configuration
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // Callback configuration
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle dashboard redirect with business lookup
      if (url === `${baseUrl}/dashboard` || url === '/dashboard') {
        try {
          // This would need to be implemented with proper session context
          // For now, redirect to a business-specific URL
          return `${baseUrl}/dashboard/lumina-demo-salon`;
        } catch (error) {
          console.error('Redirect error:', error);
          return `${baseUrl}/onboarding`;
        }
      }

      // Standard NextAuth redirect handling
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  // Event handlers
  events: {
    async createUser({ user }) {
      console.log('New user created:', user.email);
    },
    async signIn({ user }) {
      console.log('User signed in:', user.email);
    },
  },

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',
  providers: [], // Providers are defined in auth.ts
} satisfies NextAuthConfig;
