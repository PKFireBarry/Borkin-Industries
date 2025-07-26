'use client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { UserCheck, UserX, AlertCircle, CheckCircle, DollarSign, Users } from 'lucide-react'

interface Contractor {
  id: string
  name?: string
  email?: string
  phone?: string
  clerkUserId?: string
  application?: {
    status: 'pending' | 'approved' | 'rejected'
  }
  // ...other fields
}

interface Booking {
  id: string
  contractorId: string
  paymentAmount?: number
  // ...other fields
}

interface BannedUser {
  userId: string
  email: string
  reason?: string
  bannedAt?: string
}

interface Props {
  contractors: Contractor[]
  bookings: Booking[]
}

interface ModalState {
  open: boolean
  contractorId: string | null
  name: string
  email: string
  clerkUserId: string
}

export default function AdminContractorsClient({ contractors, bookings }: Props) {
  const [removing, setRemoving] = useState<string | null>(null)
  const [banned, setBanned] = useState<BannedUser[]>([])
  const [loadingBanned, setLoadingBanned] = useState(false)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, contractorId: null, name: '', email: '', clerkUserId: '' })
  const [reason, setReason] = useState('')
  const toastTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Load banned users
    setLoadingBanned(true)
    fetch('/api/admin/list-banned-contractors')
      .then(res => res.json())
      .then(data => setBanned(data.banned || []))
      .finally(() => setLoadingBanned(false))
  }, [])

  function getSummary(contractorId: string) {
    const theirBookings = bookings.filter(b => b.contractorId === contractorId)
    const totalPayout = theirBookings.reduce((sum, b) => sum + (b.paymentAmount || 0), 0)
    return {
      totalPayout,
      numBookings: theirBookings.length,
    }
  }

  function showToast(type: 'error' | 'success', message: string) {
    setToast({ type, message })
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToast(null), 3000)
  }

  function openRemoveModal(contractorId: string) {
    const contractor = contractors.find(c => c.id === contractorId)
    setModal({
      open: true,
      contractorId,
      name: contractor?.name || contractorId,
      email: contractor?.email || '',
      clerkUserId: contractor?.clerkUserId || '',
    })
    setReason('')
  }

  function closeModal() {
    setModal({ open: false, contractorId: null, name: '', email: '', clerkUserId: '' })
    setReason('')
  }

  async function handleRemoveConfirmed() {
    const { contractorId, email, clerkUserId } = modal
    if (!contractorId) return
    if (!clerkUserId && !email) {
      showToast('error', 'Missing Clerk user ID and email for this contractor.')
      closeModal()
      return
    }

    setRemoving(contractorId)
    try {
      const res = await fetch('/api/admin/remove-contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          email,
          reason,
          clerkUserId
        })
      })

      if (res.ok) {
        showToast('success', 'Contractor removed and banned successfully.')
        closeModal()
      } else {
        const error = await res.text()
        showToast('error', `Failed to remove contractor: ${error}`)
      }
    } catch (error) {
      console.error('Error removing contractor:', error)
      showToast('error', 'Failed to remove contractor. Please try again.')
    } finally {
      setRemoving(null)
    }
  }

  async function handleUnban(userId: string) {
    try {
      const res = await fetch('/api/admin/unban-contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (res.ok) {
        setBanned(prev => prev.filter(b => b.userId !== userId))
        showToast('success', 'Contractor unbanned successfully.')
      } else {
        const error = await res.text()
        showToast('error', `Failed to unban contractor: ${error}`)
      }
    } catch (error) {
      console.error('Error unbanning contractor:', error)
      showToast('error', 'Failed to unban contractor. Please try again.')
    }
  }

  const activeContractors = contractors.filter(c => c.application?.status === 'approved')

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-md ${toast.type === 'success' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800'} border z-50`}>
          {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contractors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContractors.length}</div>
            <p className="text-xs text-muted-foreground">
              Approved and working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banned Contractors</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingBanned ? '...' : banned.length}</div>
            <p className="text-xs text-muted-foreground">
              Removed from platform
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Active Contractors
          </TabsTrigger>
          <TabsTrigger value="banned" className="flex items-center gap-2">
            <UserX className="h-4 w-4" />
            Banned Contractors
          </TabsTrigger>
        </TabsList>

        {/* Active Contractors Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeContractors.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active contractors found on the platform.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Active Contractors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Total Payout</TableHead>
                        <TableHead>Bookings</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeContractors.map(contractor => {
                        const summary = getSummary(contractor.id)
                        return (
                          <TableRow key={contractor.id}>
                            <TableCell className="font-medium">{contractor.name || 'Unknown'}</TableCell>
                            <TableCell>{contractor.email || '-'}</TableCell>
                            <TableCell>{contractor.phone || '-'}</TableCell>
                            <TableCell>${summary.totalPayout.toFixed(2)}</TableCell>
                            <TableCell>{summary.numBookings}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="destructive" 
                                onClick={() => openRemoveModal(contractor.id)}
                                disabled={removing === contractor.id}
                              >
                                {removing === contractor.id ? 'Removing...' : 'Remove & Ban'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>



        {/* Banned Contractors Tab */}
        <TabsContent value="banned" className="space-y-4">
          {loadingBanned ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading banned contractors...</div>
            </div>
          ) : banned.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No banned contractors found.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Banned Contractors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Banned At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {banned.map(b => (
                        <TableRow key={b.userId}>
                          <TableCell className="font-medium">{b.email}</TableCell>
                          <TableCell>{b.reason || '-'}</TableCell>
                          <TableCell>
                            {b.bannedAt ? new Date(b.bannedAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              onClick={() => handleUnban(b.userId)}
                            >
                              Unban
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Remove Confirmation Dialog */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal({ ...modal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove and Ban Contractor</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              This will permanently remove the contractor account and add them to the banned list.
              {modal.name && (
                <div className="mt-2 space-y-1">
                  <p><strong>Name:</strong> {modal.name}</p>
                  <p><strong>Email:</strong> {modal.email}</p>
                </div>
              )}
            </p>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium mb-1">Reason for Ban (Optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for banning this contractor"
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveConfirmed}
              disabled={removing !== null}
            >
              {removing ? 'Removing...' : 'Remove & Ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 