'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserX, Users, AlertCircle, CheckCircle } from 'lucide-react'

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

    // Load banned users
    setLoadingBanned(true)
    fetch('/api/admin/list-banned-clients')
      .then(res => res.json())
      .then(data => setBanned(data.banned || []))
      .finally(() => setLoadingBanned(false))
  }, [])

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

      if (res.ok) {
        // Remove client from local state
        setClients(prev => prev.filter(c => c.id !== client.id))
        showNotification('success', `Successfully removed and banned ${client.name}`)
        setBanReason('') // Reset reason
      } else {
        const error = await res.text()
        showNotification('error', `Failed to remove client: ${error}`)
      }
    } catch (error) {
      console.error('Error removing client:', error)
      showNotification('error', 'Failed to remove client. Please try again.')
    }
  }

  const handleUnbanClient = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/unban-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (res.ok) {
        // Remove from banned list
        setBanned(prev => prev.filter(b => b.userId !== userId))
        showNotification('success', 'Client unbanned successfully')
      } else {
        const error = await res.text()
        showNotification('error', `Failed to unban client: ${error}`)
      }
    } catch (error) {
      console.error('Error unbanning client:', error)
      showNotification('error', 'Failed to unban client. Please try again.')
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
  }

  return (
    <div className="space-y-6">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : clients.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered on the platform
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banned Clients</CardTitle>
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
            Active Clients
          </TabsTrigger>
          <TabsTrigger value="banned" className="flex items-center gap-2">
            <UserX className="h-4 w-4" />
            Banned Clients
          </TabsTrigger>
        </TabsList>

        {/* Active Clients Tab */}
        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading clients...</div>
            </div>
          ) : clients.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active clients found on the platform.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                                         <TableHeader>
                       <TableRow>
                         <TableHead>Name</TableHead>
                         <TableHead className="hidden md:table-cell">Email</TableHead>
                         <TableHead className="hidden lg:table-cell">Phone</TableHead>
                         <TableHead className="text-right">Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                                         <TableBody>
                       {clients.map(client => (
                         <TableRow key={client.id}>
                           <TableCell className="font-medium">{client.name}</TableCell>
                           <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                           <TableCell className="hidden lg:table-cell">{client.phone || '-'}</TableCell>
                           <TableCell className="text-right">
                             <Button 
                               variant="destructive" 
                               onClick={() => setConfirmDelete({ open: true, client })}
                             >
                               Remove & Ban
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

        {/* Banned Clients Tab */}
        <TabsContent value="banned" className="space-y-4">
          {loadingBanned ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading banned clients...</div>
            </div>
          ) : banned.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No banned clients found.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Banned Clients</CardTitle>
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
                               onClick={() => handleUnbanClient(b.userId)}
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDelete.open} onOpenChange={(open) => setConfirmDelete({ open, client: confirmDelete.client })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove and Ban Client</DialogTitle>
            <div className="mt-2 text-sm text-muted-foreground">
              This will permanently remove the client account and add them to the banned list.
              {confirmDelete.client && (
                <div className="mt-2 space-y-1">
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