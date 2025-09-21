import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allow requests from localhost and Codespaces domains in development
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const xForwardedHost = request.headers.get('x-forwarded-host');

  // Accept localhost and *.app.github.dev in dev
  const allowedHosts = [
    'localhost:3000',
    xForwardedHost,
  ];
  const isCodespace = xForwardedHost?.endsWith('.app.github.dev');

  if (
    origin &&
    !allowedHosts.includes(origin) &&
    !isCodespace
  ) {
    return NextResponse.json(
      { error: 'Invalid origin for Server Actions request.' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
