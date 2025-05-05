import { NextRequest, NextResponse } from 'next/server'
import { removeClient, addBannedClient } from '@/lib/firebase/clients'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'

export async function POST(req: NextRequest) {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { clientId, clerkUserId, email, reason } = await req.json()
  if (!clientId && !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  try {
    // Always add to banned_clients with admin's email BEFORE deleting client
    const bannedUserId = clerkUserId || email
    if (!bannedUserId) {
      console.error('No userId or email for banned client')
      return NextResponse.json({ error: 'No userId or email for banned client' }, { status: 400 })
    }
    try {
      await addBannedClient({ userId: bannedUserId, email, reason, bannedByEmail: user.primaryEmailAddress?.emailAddress })
    } catch (firestoreErr) {
      console.error('Failed to write to banned_clients:', firestoreErr)
      return NextResponse.json({ error: 'Failed to write to banned_clients' }, { status: 500 })
    }
    // Remove from clients collection if present (after ban record is written)
    if (clientId) {
      await removeClient(clientId)
    }
    // Try to delete Clerk user if possible
    let clerkId = clerkUserId
    if (!clerkId && email) {
      // Look up Clerk user by email
      const res = await fetch(`https://api.clerk.dev/v1/users?email_address=${encodeURIComponent(email)}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          clerkId = data[0].id
        }
      }
    }
    if (clerkId) {
      const res = await fetch(`https://api.clerk.dev/v1/users/${clerkId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        // Still return success, but warn
        return NextResponse.json({ success: true, warning: 'User banned, but failed to delete Clerk user.' })
      }
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to remove client:', err)
    return NextResponse.json({ error: 'Failed to remove client' }, { status: 500 })
  }
} 