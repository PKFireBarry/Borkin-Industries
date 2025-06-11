import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ensures a URL has a proper scheme (http/https)
 * @param url - The URL to validate
 * @returns URL with proper scheme
 */
export function ensureUrlScheme(url: string): string {
  if (!url) return 'http://localhost:3000'
  
  // Remove any @ prefix that might be present
  const cleanUrl = url.startsWith('@') ? url.slice(1) : url
  
  // If URL already has a scheme, return as is
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl
  }
  
  // For production domains, use https; for localhost, use http
  const scheme = cleanUrl.includes('localhost') ? 'http://' : 'https://'
  return scheme + cleanUrl
}

/**
 * Gets the base app URL with proper scheme
 * @returns Base app URL with scheme
 */
export function getBaseAppUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000'
  return ensureUrlScheme(baseUrl)
}

/**
 * Detects if we're in Stripe test mode or live mode
 * @returns true if in test mode, false if in live mode
 */
export function isStripeTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? true
}

/**
 * Checks if a Stripe account ID was created in test mode
 * @param accountId - The Stripe account ID to check
 * @returns true if it's a test account, false if live
 */
export function isTestStripeAccount(accountId: string): boolean {
  // Test accounts typically start with 'acct_' followed by test-specific patterns
  // This is a heuristic - in practice, you'd need to call Stripe API to be certain
  return accountId.includes('test') || accountId.length < 20
}
