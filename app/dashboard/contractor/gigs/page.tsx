"use client"
import { useRequireRole } from '../../use-require-role'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { getGigsForContractor, updateBookingStatus, setContractorCompleted } from '@/lib/firebase/bookings'
import { getClientById, getPetsByIds } from '@/lib/firebase/client'

interface Gig {
  id: string
  clientName: string
  pets: string[]
  serviceType: string
  date: string
  time: string
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'unpaid' | 'escrow' | 'paid'
  contractorCompleted: boolean
}

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function ContractorGigsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [filter, setFilter] = useState<'all' | Gig['status']>('all')
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function fetchGigs() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const bookings = await getGigsForContractor(user.id)
      // For each booking, fetch client and pet names
      const mapped = await Promise.all(bookings.map(async (b: any) => {
        let clientName = 'N/A'
        let petNames: string[] = []
        if (b.clientId) {
          const client = await getClientById(b.clientId)
          clientName = client?.name || 'N/A'
          if (b.petIds && b.petIds.length && client?.pets) {
            petNames = client.pets.filter((p: any) => b.petIds.includes(p.id)).map((p: any) => p.name)
          }
        }
        return {
          id: b.id,
          clientName,
          pets: petNames,
          serviceType: b.serviceType || 'N/A',
          date: b.date || 'N/A',
          time: b.time || '',
          status: b.status || 'pending',
          paymentStatus: b.paymentStatus || 'unpaid',
          contractorCompleted: b.contractorCompleted || false,
        }
      }))
      setGigs(mapped)
    } catch {
      setError('Failed to load gigs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGigs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleAccept = async (gigId: string) => {
    setActionLoading(gigId)
    await updateBookingStatus(gigId, 'approved')
    await fetchGigs()
    setActionLoading(null)
  }

  const handleDecline = async (gigId: string) => {
    setActionLoading(gigId)
    await updateBookingStatus(gigId, 'cancelled')
    await fetchGigs()
    setActionLoading(null)
  }

  const handleMarkCompleted = async (gigId: string) => {
    setActionLoading(gigId)
    try {
      await setContractorCompleted(gigId, true)
      await fetchGigs()
    } catch {
      setError('Failed to mark as completed')
    } finally {
      setActionLoading(null)
    }
  }

  if (!isLoaded || !isAuthorized) return null
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading gigs...</div>
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>

  const filteredGigs = filter === 'all' ? gigs : gigs.filter(g => g.status === filter)

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Gigs</h1>
      {/* Status Filter Bar */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? 'All' : statusLabels[status as keyof typeof statusLabels]}
          </Button>
        ))}
      </div>
      {/* Gigs List */}
      {filteredGigs.length === 0 ? (
        <div className="text-muted-foreground">No gigs found for this status.</div>
      ) : (
        <div className="space-y-6">
          {filteredGigs.map(gig => (
            <Card key={gig.id} className="shadow-sm">
              <CardContent className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="mb-2">{gig.serviceType}</CardTitle>
                  <div className="text-sm mb-1"><span className="font-medium">Client:</span> {gig.clientName}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Pets:</span> {gig.pets.join(', ')}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Date:</span> {gig.date}{gig.time ? ` at ${gig.time}` : ''}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Status:</span> <span className={`capitalize ${gig.status === 'pending' ? 'text-yellow-600' : gig.status === 'approved' ? 'text-blue-600' : gig.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}`}>{statusLabels[gig.status]}</span></div>
                  <div className="text-sm"><span className="font-medium">Payment:</span> <span className={`capitalize ${gig.paymentStatus === 'paid' ? 'text-green-600' : gig.paymentStatus === 'escrow' ? 'text-blue-600' : 'text-muted-foreground'}`}>{gig.paymentStatus}</span></div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-4 md:mt-0">
                  {gig.status === 'pending' && (
                    <>
                      <Button variant="default" disabled={actionLoading === gig.id} onClick={() => handleAccept(gig.id)}>
                        {actionLoading === gig.id ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button variant="destructive" disabled={actionLoading === gig.id} onClick={() => handleDecline(gig.id)}>
                        {actionLoading === gig.id ? 'Declining...' : 'Decline'}
                      </Button>
                    </>
                  )}
                  {gig.status === 'approved' && !gig.contractorCompleted && (
                    <Button variant="default" disabled={actionLoading === gig.id} onClick={() => handleMarkCompleted(gig.id)}>
                      {actionLoading === gig.id ? 'Marking...' : 'Mark as Completed'}
                    </Button>
                  )}
                  {gig.status === 'approved' && gig.contractorCompleted && (
                    <span className="text-xs text-muted-foreground">Waiting for client...</span>
                  )}
                  {/* No actions for completed/cancelled */}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
} 