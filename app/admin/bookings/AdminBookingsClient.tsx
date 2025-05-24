'use client'
import { useState } from 'react'

interface Booking {
  id: string;
  clientId?: string;
  contractorId?: string;
  serviceType?: string;
  date: string | Date | { seconds: number, nanoseconds: number }; // Can be string, Date, or Firestore timestamp
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'paid' | string; // Allow for other statuses
  paymentStatus?: string;
  paymentAmount?: number;
  stripeCustomerId?: string;
  paymentIntentId?: string;
  petIds?: string[] | string;
  // Allow other properties not explicitly defined with unknown type
  [key: string]: unknown;
}

function formatDate(date: Date | string | { seconds: number, nanoseconds: number } | null) {
  if (!date) return '-'
  if (typeof date === 'string') return new Date(date).toLocaleString()
  if (date instanceof Date) return date.toLocaleString()
  // Handle Firestore timestamp
  if ('seconds' in date && 'nanoseconds' in date) {
    return new Date(date.seconds * 1000).toLocaleString()
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
  const [client, setClient] = useState('')
  const [contractor, setContractor] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const filtered = bookings.filter(b => {
    if (client && b.clientId !== client) return false
    if (contractor && b.contractorId !== contractor) return false
    if (status && b.status !== status) return false
    if (date) {
      const d = typeof b.date === 'string' 
        ? new Date(b.date) 
        : b.date instanceof Date 
          ? b.date 
          : 'seconds' in b.date 
            ? new Date(b.date.seconds * 1000) 
            : null
      if (!d) return false
      const filterDate = new Date(date)
      if (d.toDateString() !== filterDate.toDateString()) return false
    }
    if (search) {
      const s = search.toLowerCase()
      if (!(
        (b.serviceType && b.serviceType.toLowerCase().includes(s)) ||
        (b.id && b.id.toLowerCase().includes(s))
      )) return false
    }
    return true
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Booking Details</h2>
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <input
          className="border rounded px-3 py-2"
          placeholder="Filter by clientId"
          value={client}
          onChange={e => setClient(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Filter by contractorId"
          value={contractor}
          onChange={e => setContractor(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search by service type or booking id"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 border">Booking ID</th>
              <th className="p-2 border">Client ID</th>
              <th className="p-2 border">Contractor ID</th>
              <th className="p-2 border">Service</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Payment</th>
              <th className="p-2 border">Stripe</th>
              <th className="p-2 border">Pet IDs</th>
              <th className="p-2 border">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-muted-foreground py-8">No bookings found.</td></tr>
            ) : filtered.map((b: Booking) => (
              <tr key={b.id} className="hover:bg-accent">
                <td className="p-2 border font-mono">{b.id}</td>
                <td className="p-2 border font-mono">{b.clientId}</td>
                <td className="p-2 border font-mono">{b.contractorId}</td>
                <td className="p-2 border">{b.serviceType}</td>
                <td className="p-2 border">{formatDate(b.date)}</td>
                <td className="p-2 border">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[(b.status as keyof typeof statusColors) in statusColors ? b.status as keyof typeof statusColors : 'default']}`}>{b.status}</span>
                </td>
                <td className="p-2 border">
                  <div className="text-xs">{b.paymentStatus}</div>
                  <div className="text-xs">{b.paymentAmount ? `$${(b.paymentAmount / 100).toFixed(2)}` : '-'}</div>
                </td>
                <td className="p-2 border">
                  {b.stripeCustomerId && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${b.stripeCustomerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-600"
                    >
                      Customer
                    </a>
                  )}
                  {b.paymentIntentId && (
                    <div>
                      <a
                        href={`https://dashboard.stripe.com/payments/${b.paymentIntentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600"
                      >
                        Payment
                      </a>
                    </div>
                  )}
                </td>
                <td className="p-2 border font-mono">
                  {Array.isArray(b.petIds) ? b.petIds.join(', ') : b.petIds}
                </td>
                <td className="p-2 border">{b.paymentAmount ? `$${(b.paymentAmount / 100).toFixed(2)}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 