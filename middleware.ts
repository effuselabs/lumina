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
    return NextResponse.next();
  }

  // Redirect to signin if not authenticated
  if (!session?.user) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Business-specific route protection
  if (pathname.startsWith('/dashboard/')) {
    const pathSegments = pathname.split('/');
    const businessSlug = pathSegments[2];

    if (businessSlug && (session.user as any).businesses) {
      // Check if user has access to this business
      const hasBusinessAccess = (session.user as any).businesses.some(
        (business: any) => business.business.slug === businessSlug
      );

      if (!hasBusinessAccess) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }
  }

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Owner-only routes protection
  if (pathname.includes('/settings') || pathname.includes('/manage')) {
    const pathSegments = pathname.split('/');
    const businessSlug = pathSegments[2];

    if (businessSlug && (session.user as any).businesses) {
      const businessUser = (session.user as any).businesses.find(
        (business: any) => business.business.slug === businessSlug
      );

      if (!businessUser || !['OWNER', 'MANAGER'].includes(businessUser.role)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }
  }

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
