'use client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface Contractor {
  id: string
  name?: string
  email?: string
  phone?: string
  clerkUserId?: string
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
  const [tab, setTab] = useState<'active' | 'banned'>('active')
  const [banned, setBanned] = useState<BannedUser[]>([])
  const [loadingBanned, setLoadingBanned] = useState(false)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, contractorId: null, name: '', email: '', clerkUserId: '' })
  const [reason, setReason] = useState('')
  const toastTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (tab === 'banned') {
      setLoadingBanned(true)
      fetch('/api/admin/list-banned-contractors')
        .then(res => res.json())
        .then(data => setBanned(data.banned || []))
        .finally(() => setLoadingBanned(false))
    }
  }, [tab])

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
      const res = await fetch(`/api/admin/remove-contractor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorId, clerkUserId, email, reason }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast('success', 'Contractor removed and banned.')
        window.location.reload()
      } else {
        showToast('error', data.error || data.warning || 'Failed to remove contractor.')
      }
    } catch {
      showToast('error', 'Failed to remove contractor. Please try again.')
    } finally {
      setRemoving(null)
      closeModal()
    }
  }

  async function handleUnban(userId: string) {
    if (!window.confirm('Unban this user?')) return
    await fetch('/api/admin/unban-contractor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setBanned(banned.filter(b => b.userId !== userId))
  }

  return (
    <main className="max-w-5xl mx-auto py-12 px-4">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded shadow-lg text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>{toast.message}</div>
      )}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md relative">
            <h2 className="text-xl font-bold mb-4 text-center">Remove Contractor</h2>
            <p className="mb-4 text-center">Are you sure you want to remove contractor <span className="font-semibold">{modal.name}</span>? This cannot be undone.</p>
            <label className="block mb-2 font-medium">Reason for removal (optional):</label>
            <input
              className="w-full border rounded px-3 py-2 mb-4"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-muted text-gray-700 hover:bg-gray-200"
                onClick={closeModal}
                type="button"
              >Cancel</button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={handleRemoveConfirmed}
                disabled={removing === modal.contractorId}
                type="button"
              >{removing === modal.contractorId ? 'Removing...' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-6">Contractor Management</h1>
      <div className="mb-6 flex gap-4">
        <button className={`px-4 py-2 rounded ${tab==='active'?'bg-primary text-white':'bg-muted'}`} onClick={()=>setTab('active')}>Active Contractors</button>
        <button className={`px-4 py-2 rounded ${tab==='banned'?'bg-primary text-white':'bg-muted'}`} onClick={()=>setTab('banned')}>Banned Contractors</button>
      </div>
      {tab === 'active' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Phone</th>
                <th className="p-2 border">Total Payout</th>
                <th className="p-2 border">Bookings</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contractors.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-8">No contractors found.</td></tr>
              ) : contractors.map((c) => {
                const { totalPayout, numBookings } = getSummary(c.id)
                return (
                  <tr key={c.id} className="hover:bg-accent">
                    <td className="p-2 border">{c.name || '-'}</td>
                    <td className="p-2 border">{c.email || '-'}</td>
                    <td className="p-2 border">{c.phone || '-'}</td>
                    <td className="p-2 border">${totalPayout.toFixed(2)}</td>
                    <td className="p-2 border">{numBookings}</td>
                    <td className="p-2 border">
                      <Button
                        variant="destructive"
                        disabled={removing === c.id}
                        onClick={() => openRemoveModal(c.id)}
                      >
                        {removing === c.id ? 'Removing...' : 'Remove'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          {loadingBanned ? <div>Loading...</div> : (
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Reason</th>
                  <th className="p-2 border">Banned At</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banned.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted-foreground py-8">No banned users.</td></tr>
                ) : banned.map(b => (
                  <tr key={b.userId} className="hover:bg-accent">
                    <td className="p-2 border">{b.email}</td>
                    <td className="p-2 border">{b.reason || '-'}</td>
                    <td className="p-2 border">{b.bannedAt ? new Date(b.bannedAt).toLocaleString() : '-'}</td>
                    <td className="p-2 border">
                      <Button variant="outline" onClick={()=>handleUnban(b.userId)}>Unban</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  )
} 