import { auth } from '@/auth';
import { NextResponse } from 'next/server';

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
    '/api/auth',
    '/api/health',
  ];

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(
    route => pathname.startsWith(route) || pathname === route
  );

  // Allow public routes
  if (isPublicRoute) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  // Redirect to signin if not authenticated
  if (!session?.user) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Protected dashboard routes - user must have at least one business
  const protectedRoutes = [
    '/dashboard',
    '/services',
    '/clients',
    '/staff',
    '/appointments',
    '/payments',
    '/settings',
  ];
  const isProtectedRoute = protectedRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtectedRoute) {
    // For now, we just ensure the user is authenticated
    // Business access will be checked at the API level
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // For all other authenticated routes (including onboarding)
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
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
