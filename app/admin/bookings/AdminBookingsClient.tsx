'use client'
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Calendar, X, Plus, Loader2 } from 'lucide-react'

interface BookingService {
  serviceId: string
  paymentType: 'one_time' | 'daily'
  price: number
  name?: string
}

interface Booking {
  id: string
  clientId?: string
  contractorId?: string
  serviceType?: string
  startDate?: string
  endDate?: string
  date: string | Date | { seconds: number, nanoseconds: number }
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'paid' | string
  paymentStatus?: string
  paymentAmount?: number
  baseServiceAmount?: number
  platformFee?: number
  stripeFee?: number
  stripeCustomerId?: string
  paymentIntentId?: string
  petIds?: string[] | string
  services?: BookingService[]
  couponCode?: string
  couponDiscount?: number
  clientName?: string
  contractorName?: string
  serviceName?: string
  displayAmount?: string
  [key: string]: unknown
}

interface PlatformService {
  id: string
  name: string
  description?: string
  durationMinutes?: number
}

interface ClientData {
  id: string
  name: string
  email: string
  [key: string]: unknown
}

interface ContractorData {
  id: string
  name: string
  email: string
  [key: string]: unknown
}

interface AdminBookingsClientProps {
  bookings: Booking[]
  services: PlatformService[]
  clients: ClientData[]
  contractors: ContractorData[]
}

function formatDate(date: Date | string | { seconds: number, nanoseconds: number } | null) {
  if (!date) return '-'
  if (typeof date === 'string') return new Date(date).toLocaleDateString()
  if (date instanceof Date) return date.toLocaleDateString()
  if ('seconds' in date && 'nanoseconds' in date) {
    return new Date(date.seconds * 1000).toLocaleDateString()
  }
  return '-'
}

function calculateFeeBreakdown(services: BookingService[]) {
  const baseAmountCents = services.reduce((sum, s) => sum + s.price, 0)
  const baseAmountDollars = baseAmountCents / 100
  const platformFee = baseAmountDollars * 0.05
  const stripeFee = baseAmountDollars * 0.029 + 0.30
  const totalAmount = baseAmountDollars + platformFee + stripeFee
  return { baseAmountCents, baseAmountDollars, platformFee, stripeFee, totalAmount }
}

export default function AdminBookingsClient({ bookings: initialBookings, services: platformServices, clients, contractors }: AdminBookingsClientProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [clientFilter, setClientFilter] = useState('')
  const [contractorFilter, setContractorFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [editedServices, setEditedServices] = useState<BookingService[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isEditable = selectedBooking && (selectedBooking.status === 'pending' || selectedBooking.status === 'approved')

  const hasChanges = useMemo(() => {
    if (!selectedBooking?.services) return false
    return JSON.stringify(editedServices) !== JSON.stringify(selectedBooking.services)
  }, [editedServices, selectedBooking])

  const liveFees = useMemo(() => calculateFeeBreakdown(editedServices), [editedServices])

  const serviceMap = useMemo(() => new Map(platformServices.map(s => [s.id, s])), [platformServices])

  const filtered = bookings.filter(b => {
    if (clientFilter && b.clientName && !b.clientName.toLowerCase().includes(clientFilter.toLowerCase())) return false
    if (contractorFilter && b.contractorName && !b.contractorName.toLowerCase().includes(contractorFilter.toLowerCase())) return false
    if (statusFilter && statusFilter !== 'all' && b.status !== statusFilter) return false
    if (dateFilter) {
      const dateToCheck = b.startDate || b.date
      const d = typeof dateToCheck === 'string'
        ? new Date(dateToCheck)
        : dateToCheck instanceof Date
          ? dateToCheck
          : typeof dateToCheck === 'object' && dateToCheck !== null && 'seconds' in dateToCheck
            ? new Date(dateToCheck.seconds * 1000)
            : null
      if (!d) return false
      const filterDate = new Date(dateFilter)
      if (d.toDateString() !== filterDate.toDateString()) return false
    }
    if (search) {
      const s = search.toLowerCase()
      if (!(
        (b.serviceName && b.serviceName.toLowerCase().includes(s)) ||
        (b.id && b.id.toLowerCase().includes(s)) ||
        (b.clientName && b.clientName.toLowerCase().includes(s)) ||
        (b.contractorName && b.contractorName.toLowerCase().includes(s))
      )) return false
    }
    return true
  })

  function openModal(booking: Booking) {
    setSelectedBooking(booking)
    setEditedServices(booking.services ? booking.services.map(s => ({ ...s })) : [])
    setSaveError('')
  }

  function closeModal() {
    setSelectedBooking(null)
    setEditedServices([])
    setSaveError('')
  }

  function updateServicePrice(index: number, newPrice: string) {
    setEditedServices(prev => {
      const updated = [...prev]
      const cents = Math.round(parseFloat(newPrice || '0') * 100)
      updated[index] = { ...updated[index], price: isNaN(cents) ? 0 : cents }
      return updated
    })
  }

  function removeService(index: number) {
    setEditedServices(prev => prev.filter((_, i) => i !== index))
  }

  function addService(serviceId: string) {
    const platform = serviceMap.get(serviceId)
    if (!platform) return
    setEditedServices(prev => [...prev, {
      serviceId,
      paymentType: 'one_time' as const,
      price: 0,
      name: platform.name
    }])
  }

  async function handleSave() {
    if (!selectedBooking || !hasChanges) return
    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}/services`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: editedServices })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await res.json()

      // Update local state
      setBookings(prev => prev.map(b => {
        if (b.id !== selectedBooking.id) return b
        return {
          ...b,
          services: editedServices,
          paymentAmount: data.booking.paymentAmount,
          baseServiceAmount: data.booking.baseServiceAmount,
          platformFee: data.booking.platformFee,
          stripeFee: data.booking.stripeFee,
          displayAmount: data.booking.paymentAmount.toFixed(2)
        }
      }))

      // Update selected booking so modal reflects new state
      setSelectedBooking(prev => prev ? {
        ...prev,
        services: editedServices,
        paymentAmount: data.booking.paymentAmount,
        baseServiceAmount: data.booking.baseServiceAmount,
        platformFee: data.booking.platformFee,
        stripeFee: data.booking.stripeFee,
        displayAmount: data.booking.paymentAmount.toFixed(2)
      } : null)

      closeModal()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Services not already in the edited list
  const availableServicesToAdd = platformServices.filter(
    ps => !editedServices.some(es => es.serviceId === ps.id)
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Input
                placeholder="Filter by client name"
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contractor</label>
              <Input
                placeholder="Filter by contractor name"
                value={contractorFilter}
                onChange={e => setContractorFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search bookings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Results */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No bookings found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((b: Booking) => (
                  <TableRow
                    key={b.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => openModal(b)}
                  >
                    <TableCell className="font-mono text-sm">{b.id}</TableCell>
                    <TableCell className="font-medium">{b.clientName || 'Unknown Client'}</TableCell>
                    <TableCell className="font-medium">{b.contractorName || 'Unknown Contractor'}</TableCell>
                    <TableCell>{b.serviceName || 'Unknown Service'}</TableCell>
                    <TableCell>{formatDate(b.startDate || b.date)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        b.status === 'completed' ? 'default' :
                        b.status === 'approved' ? 'secondary' :
                        b.status === 'pending' ? 'outline' :
                        'destructive'
                      }>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">{b.paymentStatus || 'Unknown'}</div>
                        {b.stripeCustomerId && (
                          <a
                            href={`https://dashboard.stripe.com/customers/${b.stripeCustomerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            View Customer
                          </a>
                        )}
                        {b.paymentIntentId && (
                          <a
                            href={`https://dashboard.stripe.com/payments/${b.paymentIntentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline block"
                            onClick={e => e.stopPropagation()}
                          >
                            View Payment
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${b.displayAmount || '0.00'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={open => { if (!open) closeModal() }}>
        <DialogContent className="max-w-2xl">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle>Booking Details</DialogTitle>
                <DialogDescription>
                  <span className="font-mono text-xs">{selectedBooking.id}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status & basic info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <Badge variant={
                        selectedBooking.status === 'completed' ? 'default' :
                        selectedBooking.status === 'approved' ? 'secondary' :
                        selectedBooking.status === 'pending' ? 'outline' :
                        'destructive'
                      }>
                        {selectedBooking.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dates</span>
                    <div className="mt-1 font-medium">
                      {formatDate(selectedBooking.startDate || selectedBooking.date)}
                      {selectedBooking.endDate && ` — ${formatDate(selectedBooking.endDate)}`}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Client</span>
                    <div className="mt-1 font-medium">{selectedBooking.clientName || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contractor</span>
                    <div className="mt-1 font-medium">{selectedBooking.contractorName || 'Unknown'}</div>
                  </div>
                  {selectedBooking.petIds && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Pet IDs</span>
                      <div className="mt-1 font-mono text-xs">
                        {Array.isArray(selectedBooking.petIds) ? selectedBooking.petIds.join(', ') : selectedBooking.petIds}
                      </div>
                    </div>
                  )}
                </div>

                {/* Services table */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Services</h4>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          {isEditable && <TableHead className="w-10" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editedServices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isEditable ? 4 : 3} className="text-center text-muted-foreground py-4">
                              No services
                            </TableCell>
                          </TableRow>
                        ) : editedServices.map((svc, idx) => {
                          const platform = serviceMap.get(svc.serviceId)
                          return (
                            <TableRow key={`${svc.serviceId}-${idx}`}>
                              <TableCell className="font-medium">
                                {platform?.name || svc.name || svc.serviceId}
                              </TableCell>
                              <TableCell>
                                {isEditable ? (
                                  <Select
                                    value={svc.paymentType}
                                    onValueChange={(val: 'one_time' | 'daily') => {
                                      setEditedServices(prev => {
                                        const updated = [...prev]
                                        updated[idx] = { ...updated[idx], paymentType: val }
                                        return updated
                                      })
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="one_time">One-time</SelectItem>
                                      <SelectItem value="daily">Daily</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm">{svc.paymentType === 'daily' ? 'Daily' : 'One-time'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditable ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="h-8 w-24 text-right"
                                      value={(svc.price / 100).toFixed(2)}
                                      onChange={e => updateServicePrice(idx, e.target.value)}
                                    />
                                  </div>
                                ) : (
                                  <span>${(svc.price / 100).toFixed(2)}{svc.paymentType === 'daily' ? '/day' : ''}</span>
                                )}
                              </TableCell>
                              {isEditable && (
                                <TableCell>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeService(idx)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Add service */}
                  {isEditable && availableServicesToAdd.length > 0 && (
                    <div className="mt-2">
                      <Select onValueChange={addService}>
                        <SelectTrigger className="h-8">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Plus className="h-3 w-3" /> Add service
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {availableServicesToAdd.map(ps => (
                            <SelectItem key={ps.id} value={ps.id}>{ps.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Fee breakdown */}
                <div className="border rounded-md p-4 space-y-2 text-sm">
                  <h4 className="font-semibold">Fee Breakdown</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base amount</span>
                    <span>${liveFees.baseAmountDollars.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform fee (5%)</span>
                    <span>${liveFees.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stripe fee (2.9% + $0.30)</span>
                    <span>${liveFees.stripeFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>${liveFees.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Coupon info */}
                {selectedBooking.couponCode && (
                  <div className="border rounded-md p-4 text-sm space-y-1">
                    <h4 className="font-semibold">Coupon</h4>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Code</span>
                      <span className="font-mono">{selectedBooking.couponCode}</span>
                    </div>
                    {selectedBooking.couponDiscount != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span>${Number(selectedBooking.couponDiscount).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stripe links */}
                {(selectedBooking.stripeCustomerId || selectedBooking.paymentIntentId) && (
                  <div className="flex gap-3 text-xs">
                    {selectedBooking.stripeCustomerId && (
                      <a
                        href={`https://dashboard.stripe.com/customers/${selectedBooking.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Stripe Customer
                      </a>
                    )}
                    {selectedBooking.paymentIntentId && (
                      <a
                        href={`https://dashboard.stripe.com/payments/${selectedBooking.paymentIntentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Payment Intent
                      </a>
                    )}
                  </div>
                )}

                {/* Error */}
                {saveError && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{saveError}</div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeModal}>Close</Button>
                {isEditable && (
                  <Button onClick={handleSave} disabled={!hasChanges || saving || editedServices.length === 0}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
