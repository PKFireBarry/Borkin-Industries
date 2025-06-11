'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Users, 
  Car,
  Clock
} from 'lucide-react'

export interface Application {
  id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  createdAt: string | Date | { seconds: number; nanoseconds: number }; // Can be string, Date, or Firestore timestamp
  status: 'pending' | 'approved' | 'rejected';
  certifications?: Array<{ name?: string } | string>;
  education?: Array<{
    degree?: string;
    fieldOfStudy?: string;
    school?: string;
    cityState?: string;
    yearStarted?: string | number;
    yearEnded?: string | number;
    present?: boolean;
  }>;
  skills?: string[];
  experience?: Array<{
    title?: string;
    employer?: string;
    description?: string;
    yearStarted?: string | number;
    startDate?: string | Date;
    yearEnded?: string | number;
    endDate?: string | Date;
    present?: boolean;
  }>;
  references?: Array<{
    name?: string;
    email?: string;
    phone?: string;
    relationship?: string;
    notes?: string;
  }>;
  drivingRange?: {
    maxDistance?: string;
    willTravelOutside?: string;
  };
  // Add other potential fields with specific types
  [key: string]: unknown; // Allow other properties not explicitly defined with unknown type
}

function formatDate(date: Date | string | { seconds: number; nanoseconds: number } | null) {
  if (!date) return '-'
  if (typeof date === 'string') return new Date(date).toLocaleDateString()
  if (date instanceof Date) return date.toLocaleDateString()
  // Handle Firestore timestamp
  if ('seconds' in date && 'nanoseconds' in date) {
    return new Date(date.seconds * 1000).toLocaleDateString()
  }
  return '-'
}

function formatDateTime(date: Date | string | { seconds: number; nanoseconds: number } | null) {
  if (!date) return '-'
  if (typeof date === 'string') return new Date(date).toLocaleString()
  if (date instanceof Date) return date.toLocaleString()
  // Handle Firestore timestamp
  if ('seconds' in date && 'nanoseconds' in date) {
    return new Date(date.seconds * 1000).toLocaleString()
  }
  return '-'
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatExperience(exp: any) {
  const title = exp.title || 'Position'
  const employer = exp.employer || 'Company'
  const startYear = exp.yearStarted || (exp.startDate ? new Date(exp.startDate).getFullYear() : '')
  const endYear = exp.present ? 'Present' : (exp.yearEnded || (exp.endDate ? new Date(exp.endDate).getFullYear() : ''))
  const duration = startYear && endYear ? `${startYear} - ${endYear}` : ''
  
  return {
    title,
    employer,
    duration,
    description: exp.description || ''
  }
}

function formatEducation(edu: any) {
  const degree = edu.degree || 'Degree'
  const field = edu.fieldOfStudy || 'Field of Study'
  const school = edu.school || 'Institution'
  const location = edu.cityState || ''
  const startYear = edu.yearStarted || ''
  const endYear = edu.present ? 'Present' : (edu.yearEnded || '')
  const duration = startYear && endYear ? `${startYear} - ${endYear}` : ''
  
  return {
    degree,
    field,
    school,
    location,
    duration
  }
}

export default function AdminApplicationsClient({ applications, onApprove, onReject, onReinstate }: {
  applications: Application[], // Use the Application interface
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
        (a.email && a.email.toLowerCase().includes(s)) ||
        (a.phone && a.phone.toLowerCase().includes(s))
      )) return false
    }
    if (date) {
      const d = typeof a.createdAt === 'string' 
        ? new Date(a.createdAt) 
        : a.createdAt instanceof Date 
          ? a.createdAt 
          : 'seconds' in a.createdAt 
            ? new Date(a.createdAt.seconds * 1000) 
            : null
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
    <main className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contractor Applications</h1>
        <p className="text-gray-600">Review and manage contractor applications for the platform</p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                onClick={() => setFilter('all')}
                className="min-w-[80px]"
              >
                All ({applications.length})
              </Button>
              <Button 
                variant={filter === 'pending' ? 'default' : 'outline'} 
                onClick={() => setFilter('pending')}
                className="min-w-[80px]"
              >
                Pending ({applications.filter(a => a.status === 'pending').length})
              </Button>
              <Button 
                variant={filter === 'approved' ? 'default' : 'outline'} 
                onClick={() => setFilter('approved')}
                className="min-w-[80px]"
              >
                Approved ({applications.filter(a => a.status === 'approved').length})
              </Button>
              <Button 
                variant={filter === 'rejected' ? 'default' : 'outline'} 
                onClick={() => setFilter('rejected')}
                className="min-w-[80px]"
              >
                Rejected ({applications.filter(a => a.status === 'rejected').length})
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 flex-1 lg:max-w-md">
              <Input
                placeholder="Search by name, email, or phone"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500 text-lg">No applications found</div>
            <p className="text-gray-400 mt-2">Try adjusting your filters or search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filtered.map((application: Application) => (
            <Card key={application.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-gray-500" />
                      <CardTitle className="text-xl">
                        {application.firstName} {application.lastName}
                      </CardTitle>
                      <Badge className={`${getStatusColor(application.status)} capitalize`}>
                        {application.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{application.email || 'No email provided'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{application.phone || 'No phone provided'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Submitted {formatDate(application.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {application.status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          disabled={actionStatus[application.id] === 'loading'}
                          onClick={() => handleAction(application.id, 'approve')}
                          className="min-w-[100px]"
                        >
                          {actionStatus[application.id] === 'loading' ? 'Approving...' : 
                           actionStatus[application.id] === 'success' ? 'Approved!' : 'Approve'}
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={actionStatus[application.id] === 'loading'}
                          onClick={() => handleAction(application.id, 'reject')}
                          className="min-w-[100px]"
                        >
                          {actionStatus[application.id] === 'loading' ? 'Rejecting...' : 
                           actionStatus[application.id] === 'success' ? 'Rejected!' : 'Reject'}
                        </Button>
                      </>
                    )}
                    {application.status === 'approved' && (
                      <Button
                        variant="destructive"
                        disabled={actionStatus[application.id] === 'loading'}
                        onClick={() => handleAction(application.id, 'reject')}
                        className="min-w-[100px]"
                      >
                        {actionStatus[application.id] === 'loading' ? 'Removing...' : 
                         actionStatus[application.id] === 'success' ? 'Removed!' : 'Remove'}
                      </Button>
                    )}
                    {application.status === 'rejected' && (
                      <Button
                        variant="default"
                        disabled={actionStatus[application.id] === 'loading'}
                        onClick={() => handleAction(application.id, 'reinstate')}
                        className="min-w-[100px]"
                      >
                        {actionStatus[application.id] === 'loading' ? 'Reinstating...' : 
                         actionStatus[application.id] === 'success' ? 'Reinstated!' : 'Reinstate'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Contact & Location Info */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Contact & Location</h3>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Address:</span>
                        <p className="text-gray-600 mt-1">
                          {[application.address, application.city, application.state, application.country, application.postalCode]
                            .filter(Boolean).join(', ') || 'No address provided'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Driving Range:</span>
                        <p className="text-gray-600 mt-1">
                          {application.drivingRange?.maxDistance ? `${application.drivingRange.maxDistance} miles` : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Experience */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">Professional Experience</h3>
                      </div>
                      <div className="space-y-3">
                        {Array.isArray(application.experience) && application.experience.length > 0 ? (
                          application.experience.map((exp, i) => {
                            const formatted = formatExperience(exp)
                            return (
                              <div key={i} className="border-l-2 border-blue-200 pl-4 py-2">
                                <div className="font-medium text-gray-900">{formatted.title}</div>
                                <div className="text-sm text-gray-600">{formatted.employer}</div>
                                {formatted.duration && (
                                  <div className="text-xs text-gray-500 mt-1">{formatted.duration}</div>
                                )}
                                {formatted.description && (
                                  <p className="text-sm text-gray-700 mt-2">{formatted.description}</p>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-gray-500 italic py-4">No experience information provided</div>
                        )}
                      </div>
                    </div>

                    {/* Certifications */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Award className="h-4 w-4 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">Certifications</h3>
                      </div>
                      <div className="space-y-2">
                        {Array.isArray(application.certifications) && application.certifications.length > 0 ? (
                          application.certifications.map((cert, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-gray-700">
                                {typeof cert === 'string' ? cert : cert.name || 'Certification'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic">No certifications listed</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Education */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <GraduationCap className="h-4 w-4 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">Education</h3>
                      </div>
                      <div className="space-y-3">
                        {Array.isArray(application.education) && application.education.length > 0 ? (
                          application.education.map((edu, i) => {
                            const formatted = formatEducation(edu)
                            return (
                              <div key={i} className="border-l-2 border-green-200 pl-4 py-2">
                                <div className="font-medium text-gray-900">{formatted.degree}</div>
                                <div className="text-sm text-gray-600">{formatted.field}</div>
                                <div className="text-sm text-gray-600">{formatted.school}</div>
                                {formatted.location && (
                                  <div className="text-xs text-gray-500">{formatted.location}</div>
                                )}
                                {formatted.duration && (
                                  <div className="text-xs text-gray-500 mt-1">{formatted.duration}</div>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-gray-500 italic py-4">No education information provided</div>
                        )}
                      </div>
                    </div>

                    {/* References */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">References</h3>
                      </div>
                      <div className="space-y-3">
                        {Array.isArray(application.references) && application.references.length > 0 ? (
                          application.references.map((ref, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3">
                              <div className="font-medium text-gray-900">{ref.name || 'Reference'}</div>
                              <div className="text-sm text-gray-600">{ref.relationship || 'Relationship not specified'}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {ref.email && <span>{ref.email}</span>}
                                {ref.email && ref.phone && <span> • </span>}
                                {ref.phone && <span>{ref.phone}</span>}
                              </div>
                              {ref.notes && (
                                <p className="text-sm text-gray-700 mt-2 italic">"{ref.notes}"</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic">No references provided</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {Array.isArray(application.skills) && application.skills.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-gray-900 mb-3">Skills & Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {application.skills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application Details */}
                <div className="mt-6 pt-6 border-t">
                  <div className="text-xs text-gray-500">
                    Application ID: {application.id} • Submitted: {formatDateTime(application.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
} 