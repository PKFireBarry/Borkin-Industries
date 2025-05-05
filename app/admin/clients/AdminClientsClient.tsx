'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from '@/components/ui/dialog'

// Interfaces
interface Client {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  userId?: string // Clerk user ID
}

interface BannedUser {
  userId: string
  email: string
  reason?: string
  bannedAt?: string
  bannedByEmail?: string
}

// Simple notification component
function Notification({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-md shadow-md ${type === 'success' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800'} border`}>
      {message}
    </div>
  );
}

export function AdminClientsClient() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'banned'>('active')
  const [banned, setBanned] = useState<BannedUser[]>([])
  const [loadingBanned, setLoadingBanned] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, client?: Client }>({ open: false })
  const [banReason, setBanReason] = useState('')
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    // Load clients
    fetch('/api/admin/clients')
      .then(res => res.json())
      .then(data => {
        setClients(data.clients || [])
        setLoading(false)
      })

    // If we're on the banned tab, load banned users
    if (tab === 'banned') {
      setLoadingBanned(true)
      fetch('/api/admin/list-banned-clients')
        .then(res => res.json())
        .then(data => setBanned(data.banned || []))
        .finally(() => setLoadingBanned(false))
    }
  }, [tab])

  const handleRemoveClient = async (client: Client) => {
    if (!client || !client.id) return

    setConfirmDelete({ open: false }) // Close dialog

    // Prepare payload for the API
    const payload = {
      clientId: client.id,
      email: client.email,
      reason: banReason,
      clerkUserId: client.userId
    }

    // Call API to remove and ban client
    try {
      const res = await fetch('/api/admin/remove-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('Failed to remove client')
      }

      // Update UI
      setClients(clients.filter(c => c.id !== client.id))
      showNotification('success', 'Client removed and banned.')

      // Clear ban reason for next time
      setBanReason('')
    } catch (error) {
      console.error('Error removing client:', error)
      showNotification('error', 'Failed to remove client.')
    }
  }

  const handleUnbanClient = async (userId: string) => {
    if (!userId) return
    
    try {
      const res = await fetch('/api/admin/unban-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (!res.ok) {
        throw new Error('Failed to unban client')
      }

      // Update UI
      setBanned(banned.filter(b => b.userId !== userId))
      showNotification('success', 'Client unbanned successfully.')
    } catch (error) {
      console.error('Error unbanning client:', error)
      showNotification('error', 'Failed to unban client.')
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b pb-2">
        <button 
          className={`px-4 py-2 rounded ${tab==='active'?'bg-primary text-white':'bg-muted'}`} 
          onClick={()=>setTab('active')}
        >
          Active Clients
        </button>
        <button 
          className={`px-4 py-2 rounded ${tab==='banned'?'bg-primary text-white':'bg-muted'}`} 
          onClick={()=>setTab('banned')}
        >
          Banned Clients
        </button>
      </div>

      {/* Active Clients Tab */}
      {tab === 'active' && (
        <div>
          {loading ? <div>Loading...</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Email</th>
                    <th className="p-2 border">Phone</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted-foreground py-8">No clients found.</td></tr>
                  ) : clients.map(client => (
                    <tr key={client.id} className="hover:bg-muted/50">
                      <td className="p-2 border">{client.name}</td>
                      <td className="p-2 border">{client.email}</td>
                      <td className="p-2 border">{client.phone || '-'}</td>
                      <td className="p-2 border">
                        <Button 
                          variant="destructive" 
                          onClick={() => setConfirmDelete({ open: true, client })}
                        >
                          Remove & Ban
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Banned Clients Tab */}
      {tab === 'banned' && (
        <div>
          {loadingBanned ? <div>Loading...</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
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
                    <tr key={b.userId} className="hover:bg-muted/50">
                      <td className="p-2 border">{b.email}</td>
                      <td className="p-2 border">{b.reason || '-'}</td>
                      <td className="p-2 border">{b.bannedAt ? new Date(b.bannedAt).toLocaleString() : '-'}</td>
                      <td className="p-2 border">
                        <Button 
                          variant="outline" 
                          onClick={() => handleUnbanClient(b.userId)}
                        >
                          Unban
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDelete.open} onOpenChange={(open) => setConfirmDelete({ open, client: confirmDelete.client })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove and Ban Client</DialogTitle>
            <div className="mt-2 text-sm text-muted-foreground">
              This will permanently remove the client account and add them to the banned list.
              {confirmDelete.client && (
                <div className="mt-2">
                  <p><strong>Name:</strong> {confirmDelete.client.name}</p>
                  <p><strong>Email:</strong> {confirmDelete.client.email}</p>
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium mb-1">Reason for Ban (Optional)</label>
            <Textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Enter reason for banning this client"
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete({ open: false })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmDelete.client && handleRemoveClient(confirmDelete.client)}
            >
              Remove & Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 