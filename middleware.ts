import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await auth();

  // Redirect /signup to /login (unified auth page)
  if (request.nextUrl.pathname === '/signup') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect dashboard and events routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/events')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/events/:path*', '/signup'],
};

