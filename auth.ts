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

export const { handlers, auth, signIn, signOut } = NextAuth({
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

  // Callbacks for session and JWT management
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to JWT token on sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
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
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log('🔄 NextAuth redirect:', { url, baseUrl });

      // ALWAYS redirect to /dashboard for business lookup
      // Never redirect directly to business-specific URLs
      if (
        url.includes('/auth/signin') ||
        url === baseUrl ||
        url.includes('/dashboard/')
      ) {
        console.log('🔄 Redirecting to /dashboard for business lookup');
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

  // Authentication providers
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔐 Authentication attempt for:', credentials?.email);

        try {
          // Validate credentials format
          const validatedCredentials = credentialsSchema.parse(credentials);
          const { email, password } = validatedCredentials;

          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
            },
          });

          if (!user || !user.password) {
            console.log('❌ User not found or no password set:', email);
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', email);
            return null;
          }

          console.log('✅ Authentication successful for:', email);

          // Return user data (password excluded)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.log('❌ Invalid credentials format:', error.errors);
          } else {
            console.error('❌ Authentication error:', error);
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
    async signIn({ user, account, profile: _profile }) {
      console.log('📝 User signed in:', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
      });
    },
    async signOut({ session, token }) {
      console.log('📝 User signed out:', {
        userId: token?.id || session?.user?.id,
        email: token?.email || session?.user?.email,
      });
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
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    role: string;
  }
}
