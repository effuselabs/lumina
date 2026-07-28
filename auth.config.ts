import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe NextAuth configuration.
 *
 * `middleware.ts` runs in the Edge Runtime, which cannot execute the Node
 * APIs that bcryptjs relies on (setImmediate / process.nextTick). Importing
 * the full `auth.ts` there pulled bcryptjs and the Prisma client into the
 * Edge bundle and produced build warnings.
 *
 * This file therefore holds everything the middleware needs — session
 * strategy, pages, and the JWT/session callbacks that shape the token — and
 * deliberately declares no providers. `auth.ts` spreads this config and adds
 * the Credentials provider, which is Node-only.
 *
 * See https://authjs.dev/guides/edge-compatibility
 */
export const authConfig = {
  /**
   * Trust the Host header supplied by the platform's proxy.
   *
   * Auth.js v5 rejects requests whose Host it cannot verify, to prevent host
   * header injection. Behind Railway (and any similar proxy) the app sees the
   * forwarded host rather than its own, so without this every auth request
   * fails with `UntrustedHost` — observed on staging for BOTH
   * `healthcheck.railway.app` and `staging.uselumina.app`, which would have
   * broken sign-in entirely.
   *
   * Safe here because the platform terminates TLS and sets the host; the app
   * is never addressed directly. See https://authjs.dev/reference/core#trusthost
   */
  trustHost: true,

  // Use JWT strategy for stateless sessions
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  // Custom pages
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // Callbacks for session and JWT management.
  // These read only the token/user objects, so they are Edge-safe.
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to JWT token on sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
        token.businessId = user.businessId;
      }
      return token;
    },

    async session({ session, token }) {
      // Add token data to session
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.businessId = token.businessId as string | undefined;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after sign-in
      if (url.includes('/auth/signin') || url === baseUrl) {
        return `${baseUrl}/dashboard`;
      }

      // Handle relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // Handle same-origin URLs
      if (new URL(url).origin === baseUrl) {
        return url;
      }

      // Default to base URL for external URLs
      return baseUrl;
    },
  },

  // Providers are added in auth.ts — the Credentials provider needs bcryptjs
  // and Prisma, neither of which can run in the Edge Runtime.
  providers: [],

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;

export default authConfig;
