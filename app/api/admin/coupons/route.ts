import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { 
  getAllCoupons, 
  createCoupon, 
  getCouponUsageHistory 
} from '@/lib/firebase/coupons'
import { CreateCouponData } from '@/types/coupon'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const couponId = searchParams.get('couponId')
    
    if (couponId) {
      // Get usage history for specific coupon
      try {
        const usageHistory = await getCouponUsageHistory(couponId)
        return NextResponse.json(usageHistory)
      } catch (usageError) {
        console.error('Error fetching usage history for coupon:', couponId, usageError)
        return NextResponse.json(
          { error: 'Failed to fetch usage history' }, 
          { status: 500 }
        )
      }
    } else {
      // Get all coupons
      const coupons = await getAllCoupons()
      return NextResponse.json(coupons)
    }
  } catch (error) {
    console.error('Error in GET /api/admin/coupons:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const couponData: CreateCouponData = {
      code: body.code,
      name: body.name,
      type: body.type,
      value: body.value,
      ...(body.contractorId && { contractorId: body.contractorId }),
      ...(body.expirationDate && { expirationDate: body.expirationDate }),
      ...(body.description && { description: body.description }),
      ...(body.maxUsage && { maxUsage: body.maxUsage })
    }

    const coupon = await createCoupon(couponData)
    return NextResponse.json(coupon)
  } catch (error) {
    console.error('Error in POST /api/admin/coupons:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 