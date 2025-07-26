import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { 
  getCoupon, 
  updateCoupon, 
  deleteCoupon 
} from '@/lib/firebase/coupons'
import { UpdateCouponData } from '@/types/coupon'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const coupon = await getCoupon(params.id)
    
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    return NextResponse.json(coupon)
  } catch (error) {
    console.error('Error in GET /api/admin/coupons/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updateData: UpdateCouponData = {
      name: body.name,
      value: body.value,
      expirationDate: body.expirationDate,
      description: body.description,
      isActive: body.isActive,
      maxUsage: body.maxUsage
    }

    await updateCoupon(params.id, updateData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/admin/coupons/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteCoupon(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/coupons/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 