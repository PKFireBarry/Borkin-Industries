import { NextRequest, NextResponse } from 'next/server'
import { allowReapplication } from '@/lib/firebase/contractors'

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }
  try {
    await allowReapplication(userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 })
  }
} 