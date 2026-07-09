import { NextRequest, NextResponse } from 'next/server'
import { allowClientReapplication } from '@/lib/firebase/clients'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'

export async function POST(req: NextRequest) {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { userId } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  try {
    await allowClientReapplication(userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to unban client:', err)
    return NextResponse.json({ error: 'Failed to unban client' }, { status: 500 })
  }
} 