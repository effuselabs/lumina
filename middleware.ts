import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(req: NextRequest) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

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
    const isPublicRoute = publicRoutes.some(route => 
      pathname.startsWith(route) || pathname === route
    );

    // Allow public routes
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Redirect to signin if not authenticated
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Business-specific route protection
    if (pathname.startsWith('/dashboard/')) {
      const pathSegments = pathname.split('/');
      const businessSlug = pathSegments[2];

      if (businessSlug && token.businesses) {
        // Check if user has access to this business
        const hasBusinessAccess = token.businesses.some(
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
      if (!allowedRoles.includes(token.role as string)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Owner-only routes protection
    if (pathname.includes('/settings') || pathname.includes('/manage')) {
      const pathSegments = pathname.split('/');
      const businessSlug = pathSegments[2];

      if (businessSlug && token.businesses) {
        const businessUser = token.businesses.find(
          (business: any) => business.business.slug === businessSlug
        );

        if (!businessUser || !['OWNER', 'MANAGER'].includes(businessUser.role)) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow access to auth pages and API routes
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/') ||
          pathname.startsWith('/api/health') ||
          pathname === '/'
        ) {
          return true;
        }

        // Require token for all other routes
        return !!token;
      },
    },
  }
);

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