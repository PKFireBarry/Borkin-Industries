'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, Search, Filter, DollarSign, Users, Clock } from 'lucide-react'

interface Booking {
  id: string;
  clientId?: string;
  contractorId?: string;
  serviceType?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  date: string | Date | { seconds: number, nanoseconds: number };
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'paid' | string;
  paymentStatus?: string;
  paymentAmount?: number;
  stripeCustomerId?: string;
  paymentIntentId?: string;
  petIds?: string[] | string;
  // New fields from the updated page
  clientName?: string;
  contractorName?: string;
  serviceName?: string;
  displayAmount?: string;
  [key: string]: unknown;
}

function formatDate(date: Date | string | { seconds: number, nanoseconds: number } | null) {
  if (!date) return '-'
  if (typeof date === 'string') return new Date(date).toLocaleDateString()
  if (date instanceof Date) return date.toLocaleDateString()
  // Handle Firestore timestamp
  if ('seconds' in date && 'nanoseconds' in date) {
    return new Date(date.seconds * 1000).toLocaleDateString()
  }
  return '-'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  default: 'bg-gray-100 text-gray-800',
} as const

export default function AdminBookingsClient({ bookings }: { bookings: Booking[] }) {
  const [clientFilter, setClientFilter] = useState('')
  const [contractorFilter, setContractorFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const filtered = bookings.filter(b => {
    if (clientFilter && b.clientName && !b.clientName.toLowerCase().includes(clientFilter.toLowerCase())) return false
    if (contractorFilter && b.contractorName && !b.contractorName.toLowerCase().includes(contractorFilter.toLowerCase())) return false
    if (statusFilter && statusFilter !== 'all' && b.status !== statusFilter) return false
    if (dateFilter) {
      // Use startDate as primary date field, fallback to date field
      const dateToCheck = b.startDate || b.date
      const d = typeof dateToCheck === 'string' 
        ? new Date(dateToCheck) 
        : dateToCheck instanceof Date 
          ? dateToCheck 
          : 'seconds' in dateToCheck 
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
                  <TableRow key={b.id} className="hover:bg-muted/50">
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
    </div>
  )
} 