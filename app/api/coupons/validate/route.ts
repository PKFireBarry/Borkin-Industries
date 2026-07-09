import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { validateCoupon } from '@/lib/firebase/coupons'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, contractorId, bookingAmount } = body

    if (!code || !contractorId || bookingAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    const validationResult = await validateCoupon(code, contractorId, bookingAmount)
    
    return NextResponse.json(validationResult)
  } catch (error) {
    console.error('Error in POST /api/coupons/validate:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 