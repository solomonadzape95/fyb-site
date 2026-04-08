import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_COOKIE = 'fyb_admin_token';
const STUDENT_COOKIE = 'fyb_session_mirror';

function getJwtSecret(): Uint8Array {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD not set');
  return new TextEncoder().encode(password);
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── /flyer-render/* ── internal token only
  if (pathname.startsWith('/flyer-render/')) {
    const token = searchParams.get('token');
    if (token !== process.env.INTERNAL_RENDER_TOKEN) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    return NextResponse.next();
  }

  // ── /admin/login ── always allow (login page itself)
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // ── /admin or /admin/* ── require admin httpOnly cookie
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const cookie = request.cookies.get(ADMIN_COOKIE);
    if (!cookie?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    try {
      await jwtVerify(cookie.value, getJwtSecret());
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete(ADMIN_COOKIE);
      return response;
    }
  }

  // ── /submit, /done ── require student session cookie mirror
  if (pathname === '/submit' || pathname === '/done') {
    const cookie = request.cookies.get(STUDENT_COOKIE);
    if (!cookie?.value) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/submit',
    '/done',
    '/admin',
    '/admin/:path*',
    '/flyer-render/:path*',
  ],
};
