import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip auth in local development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const apiSecret = process.env.API_SECRET_KEY
  if (!apiSecret) {
    console.error('API_SECRET_KEY is not set — blocking all API requests')
    return new NextResponse(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token !== apiSecret) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
