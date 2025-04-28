"use server"

import { currentUser } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/clerk-sdk-node'
import { redirect } from 'next/navigation'

const ALLOWED_ROLES = ['client', 'contractor'] as const

type AllowedRole = (typeof ALLOWED_ROLES)[number]

export async function setUserRole(role: AllowedRole) {
  const user = await currentUser()
  if (!user) {
    redirect('/sign-in')
  }
  if (!role || !ALLOWED_ROLES.includes(role)) {
    throw new Error('Invalid role selected.')
  }
  await clerkClient.users.updateUser(user.id, {
    publicMetadata: { role },
  })
  if (role === 'client') redirect('/dashboard')
  if (role === 'contractor') redirect('/dashboard/contractor')
  redirect('/')
} 