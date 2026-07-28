import authConfig from '@/auth.config';
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

// Build an Edge-safe NextAuth instance from the provider-free config.
// Importing `auth` from '@/auth' here would pull bcryptjs and Prisma into
// the Edge Runtime, which cannot run them.
const { auth } = NextAuth(authConfig);

export default auth(req => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/error',
    '/auth/verify-request',
    '/api/health',
  ];

  // Check if the route is public or an auth API route
  const isPublicRoute =
    publicRoutes.some(
      route => pathname === route || pathname.startsWith(route)
    ) ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/public/');

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect to signin if not authenticated
  if (!session?.user) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow authenticated users to access protected routes
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
