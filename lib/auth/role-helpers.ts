import { User } from '@clerk/nextjs/server'

// Role values
const USER_ROLES = {
  ADMIN: 'admin',
  CONTRACTOR: 'contractor',
  CLIENT: 'client',
} as const

export interface UserRole {
  role: (typeof USER_ROLES)[keyof typeof USER_ROLES]
}

export function getUserRole(user: User | null): UserRole['role'] | null {
  if (!user) return null
  // Clerk publicMetadata is the recommended place for custom roles
  const role: unknown = user.publicMetadata?.role
  if (typeof role === 'string' && (Object.values(USER_ROLES) as string[]).includes(role)) {
    return role as UserRole['role']
  }
  return null
}

export function isAdmin(user: User | null): boolean {
  return getUserRole(user) === USER_ROLES.ADMIN
}

export function isContractor(user: User | null): boolean {
  return getUserRole(user) === USER_ROLES.CONTRACTOR
}

export function isClient(user: User | null): boolean {
  return getUserRole(user) === USER_ROLES.CLIENT
} 