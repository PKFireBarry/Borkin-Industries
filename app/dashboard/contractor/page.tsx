"use client"
import { useRequireRole } from '../use-require-role'
import { useRequireContractorApproval } from './useRequireContractorApproval'

export default function ContractorDashboardHome() {
  useRequireContractorApproval()
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  if (!isLoaded || !isAuthorized) return null
  return (
    <main className="max-w-2xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Welcome to Your Contractor Dashboard</h1>
      <p className="text-muted-foreground mb-8">Manage your profile, availability, gigs, payments, and reviews here.</p>
    </main>
  )
} 