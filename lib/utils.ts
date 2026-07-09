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
  // Check for explicit environment variable first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return ensureUrlScheme(process.env.NEXT_PUBLIC_APP_URL)
  }
  
  // Check for Vercel environment variables
  if (process.env.VERCEL_URL) {
    return ensureUrlScheme(process.env.VERCEL_URL)
  }
  
  // Check if we're in production and use the known production URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://borkinindustries.vercel.app'
  }
  
  // Default to localhost for development
  return 'http://localhost:3000'
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

/**
 * Calculate platform fee (5%) in cents
 */
export function calculatePlatformFee(amountInCents: number): number {
  return Math.round(amountInCents * 0.05);
}

/**
 * Calculate estimated Stripe processing fee in cents
 * Stripe charges 2.9% + $0.30 per transaction
 */
export function calculateStripeFee(amountInCents: number): number {
  return Math.round(amountInCents * 0.029 + 30);
}

/**
 * Calculate estimated Stripe processing fee in dollars
 * Stripe charges 2.9% + $0.30 per transaction
 */
export function calculateStripeFeeInDollars(amountInDollars: number): number {
  return amountInDollars * 0.029 + 0.3;
}

/**
 * Calculate net payout to contractor after fees
 */
export function calculateNetPayout(totalAmount: number, platformFee: number, stripeFee: number): number {
  return totalAmount - platformFee - stripeFee;
}

/**
 * Calculate total amount including platform fee and Stripe fee that client will pay
 * @param baseAmount - The base service amount in cents
 * @returns Total amount client will pay in cents
 */
export function calculateClientTotal(baseAmount: number): number {
  const platformFee = calculatePlatformFee(baseAmount);
  const stripeFee = calculateStripeFee(baseAmount);
  return baseAmount + platformFee + stripeFee;
}

/**
 * Calculate total amount including platform fee and Stripe fee that client will pay (in dollars)
 * @param baseAmount - The base service amount in dollars
 * @returns Total amount client will pay in dollars
 */
export function calculateClientTotalInDollars(baseAmount: number): number {
  const platformFee = baseAmount * 0.05;
  const stripeFee = calculateStripeFeeInDollars(baseAmount);
  return baseAmount + platformFee + stripeFee;
}

/**
 * Calculate fee breakdown for client display
 * @param baseAmount - The base service amount in dollars
 * @returns Object with breakdown of fees
 */
export function calculateClientFeeBreakdown(baseAmount: number): {
  baseAmount: number;
  platformFee: number;
  stripeFee: number;
  totalAmount: number;
} {
  const platformFee = baseAmount * 0.05;
  const stripeFee = calculateStripeFeeInDollars(baseAmount);
  const totalAmount = baseAmount + platformFee + stripeFee;
  
  return {
    baseAmount,
    platformFee,
    stripeFee,
    totalAmount
  };
}
