import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// IMPORTANT: This should match the backend secret.
const SECRET_KEY = new TextEncoder().encode('chahaus_super_secret_key_123');

export async function middleware(request) {
  const tokenCookie = request.cookies.get('token');
  const pathname = request.nextUrl.pathname;

  // Protect all non-static/non-login routes
  if (!tokenCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(tokenCookie.value, SECRET_KEY);

    // Admin Role Isolation
    if (pathname.startsWith('/admin')) {
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url)); // Customer trying to access Admin
      }
      return NextResponse.next();
    }

    // Customer Role Isolation
    if (pathname === '/') {
      if (payload.role !== 'customer') {
        return NextResponse.redirect(new URL('/admin', request.url)); // Admin trying to access Customer
      }
      return NextResponse.next();
    }

    // Allow Next.js to handle 404s for any other unrecognized paths for authenticated users
    return NextResponse.next();

  } catch (err) {
    // Invalid token, force re-login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    response.cookies.delete('role');
    return response;
  }
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - api (API routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  // - login (login page)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
