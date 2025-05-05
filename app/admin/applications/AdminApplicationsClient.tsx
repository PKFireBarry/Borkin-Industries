'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

function formatDate(date: Date | string | null) {
  if (!date) return '-'
  if (typeof date === 'string') return new Date(date).toLocaleString()
  return date.toLocaleString()
}

export default function AdminApplicationsClient({ applications, onApprove, onReject, onReinstate }: {
  applications: any[],
  onApprove: (id: string) => Promise<void>,
  onReject: (id: string) => Promise<void>,
  onReinstate: (id: string) => Promise<void>,
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [actionStatus, setActionStatus] = useState<{ [id: string]: 'idle' | 'loading' | 'success' }>({})

  const filtered = applications.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!(
        (a.firstName && a.firstName.toLowerCase().includes(s)) ||
        (a.lastName && a.lastName.toLowerCase().includes(s)) ||
        (a.email && a.email.toLowerCase().includes(s))
      )) return false
    }
    if (date) {
      const d = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt
      if (!d) return false
      const filterDate = new Date(date)
      if (d.toDateString() !== filterDate.toDateString()) return false
    }
    return true
  })

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'reinstate') => {
    setActionStatus(s => ({ ...s, [id]: 'loading' }))
    try {
      if (action === 'approve') await onApprove(id)
      if (action === 'reject') await onReject(id)
      if (action === 'reinstate') await onReinstate(id)
      setActionStatus(s => ({ ...s, [id]: 'success' }))
      window.location.reload()
    } catch {
      setActionStatus(s => ({ ...s, [id]: 'idle' }))
    }
  }

  return (
    <main className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Contractor Applications</h1>
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
          <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Pending</Button>
          <Button variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>Approved</Button>
          <Button variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}>Rejected</Button>
        </div>
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search by name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="text-muted-foreground">No applications found.</div>
      ) : (
        <div className="space-y-6">
          {filtered.map((a: any) => (
            <div key={a.id} className="border rounded-lg p-6 bg-background shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <div>
                  <div className="text-lg font-bold">{a.firstName} {a.lastName}</div>
                  <div className="text-sm text-muted-foreground">{a.email} | {a.phone}</div>
                  <div className="text-sm text-muted-foreground">{a.address}, {a.city}, {a.state}, {a.country} {a.postalCode}</div>
                  <div className="text-xs text-muted-foreground">Submitted: {formatDate(a.createdAt)}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : a.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{a.status}</span>
                  {a.status === 'pending' && (
                    <>
                      <Button
                        variant="default"
                        disabled={actionStatus[a.id] === 'loading'}
                        onClick={() => handleAction(a.id, 'approve')}
                      >
                        {actionStatus[a.id] === 'loading' ? 'Approving...' : actionStatus[a.id] === 'success' ? 'Approved!' : 'Approve'}
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={actionStatus[a.id] === 'loading'}
                        onClick={() => handleAction(a.id, 'reject')}
                      >
                        {actionStatus[a.id] === 'loading' ? 'Rejecting...' : actionStatus[a.id] === 'success' ? 'Rejected!' : 'Reject'}
                      </Button>
                    </>
                  )}
                  {a.status === 'approved' && (
                    <Button
                      variant="destructive"
                      disabled={actionStatus[a.id] === 'loading'}
                      onClick={() => handleAction(a.id, 'reject')}
                    >
                      {actionStatus[a.id] === 'loading' ? 'Removing...' : actionStatus[a.id] === 'success' ? 'Removed!' : 'Remove'}
                    </Button>
                  )}
                  {a.status === 'rejected' && (
                    <Button
                      variant="default"
                      disabled={actionStatus[a.id] === 'loading'}
                      onClick={() => handleAction(a.id, 'reinstate')}
                    >
                      {actionStatus[a.id] === 'loading' ? 'Reinstating...' : actionStatus[a.id] === 'success' ? 'Reinstated!' : 'Reinstate'}
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="font-semibold mb-1">Certifications</div>
                  <ul className="list-disc ml-5 text-sm">
                    {Array.isArray(a.certifications) && a.certifications.length > 0 ? a.certifications.map((c: any, i: number) => <li key={i}>{typeof c === 'string' ? c : c.name || JSON.stringify(c)}</li>) : <li className="text-muted-foreground">None</li>}
                  </ul>
                  <div className="font-semibold mt-4 mb-1">Education</div>
                  <ul className="list-disc ml-5 text-sm">
                    {Array.isArray(a.education) && a.education.length > 0 ? a.education.map((e: any, i: number) => <li key={i}>{e.degree} in {e.fieldOfStudy} ({e.school}, {e.cityState}) {e.yearStarted} - {e.present ? 'Present' : e.yearEnded}</li>) : <li className="text-muted-foreground">None</li>}
                  </ul>
                  <div className="font-semibold mt-4 mb-1">Skills</div>
                  <ul className="list-disc ml-5 text-sm">
                    {Array.isArray(a.skills) && a.skills.length > 0 ? a.skills.map((s: any, i: number) => <li key={i}>{s}</li>) : <li className="text-muted-foreground">None</li>}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold mb-1">Experience</div>
                  <ul className="list-disc ml-5 text-sm">
                    {Array.isArray(a.experience) && a.experience.length > 0 ? a.experience.map((e: any, i: number) => <li key={i}>{e.title || e.employer || ''} {e.description ? `- ${e.description}` : ''} {e.yearStarted || e.startDate} - {e.present ? 'Present' : e.yearEnded || e.endDate}</li>) : <li className="text-muted-foreground">None</li>}
                  </ul>
                  <div className="font-semibold mt-4 mb-1">References</div>
                  <ul className="list-disc ml-5 text-sm">
                    {Array.isArray(a.references) && a.references.length > 0 ? a.references.map((r: any, i: number) => <li key={i}>{r.name} ({r.email}) {r.phone ? `- ${r.phone}` : ''} {r.relationship ? `- ${r.relationship}` : ''} {r.notes ? `- ${r.notes}` : ''}</li>) : <li className="text-muted-foreground">None</li>}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
} 