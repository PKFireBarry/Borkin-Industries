import { NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'

// Export the Clerk middleware with ban check configurations
export default clerkMiddleware()

// Ensure the matcher is properly configured to catch the routes we want to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.png (common static files)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png).*)',
  ],
}