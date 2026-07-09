export interface Coupon {
  id: string
  code: string // Max 8 characters
  name: string
  type: 'fixed_price' | 'percentage'
  value: number // Fixed price in currency or percentage (0-100)
  contractorId?: string // Optional - if null, it's site-wide
  expirationDate?: string // ISO date string - optional
  description?: string
  isActive: boolean
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  usageCount: number // Track how many times this coupon has been used
  maxUsage?: number // Optional usage limit for site-wide coupons
}

export interface CouponUsage {
  id: string
  couponId: string
  bookingId: string
  clientId: string
  contractorId: string
  discountAmount: number // Amount saved in currency
  originalPrice: number // Original booking price
  finalPrice: number // Price after coupon
  usedAt: string // ISO date string
}

export interface CouponValidationResult {
  isValid: boolean
  coupon?: Coupon
  error?: string
  discountAmount?: number
  finalPrice?: number
}

export interface CreateCouponData {
  code: string
  name: string
  type: 'fixed_price' | 'percentage'
  value: number
  contractorId?: string
  expirationDate?: string
  description?: string
  maxUsage?: number
}

export interface UpdateCouponData {
  code?: string
  name?: string
  value?: number
  expirationDate?: string
  description?: string
  isActive?: boolean
  maxUsage?: number
} 