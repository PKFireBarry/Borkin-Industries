"use client"
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function ContractorApplyPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    experience: '',
    education: '',
    certifications: '',
    references: '',
    drivingRange: '',
    linkedin: '',
  })
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch('/api/contractor/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'pending' }),
      })
      if (!res.ok) throw new Error('Failed to submit application')
      setSuccess(true)
    } catch (err) {
      setError('Failed to submit application')
    } finally {
      setIsPending(false)
    }
  }

  if (success) {
    return (
      <main className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Application Submitted</h1>
        <p className="mb-4">Thank you for applying! Your application is under review. We'll notify you after admin approval.</p>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Contractor Application</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
        <Input name="email" placeholder="Email" value={form.email} onChange={handleChange} required type="email" />
        <Input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} required />
        <Input name="address" placeholder="Address" value={form.address} onChange={handleChange} required />
        <Textarea name="experience" placeholder="Experience (years, specialties, etc.)" value={form.experience} onChange={handleChange} required />
        <Textarea name="education" placeholder="Education" value={form.education} onChange={handleChange} required />
        <Input name="certifications" placeholder="Certifications (comma separated)" value={form.certifications} onChange={handleChange} />
        <Input name="references" placeholder="References (comma separated)" value={form.references} onChange={handleChange} />
        <Input name="drivingRange" placeholder="Driving Range (e.g. 20 miles)" value={form.drivingRange} onChange={handleChange} />
        <Input name="linkedin" placeholder="LinkedIn Profile URL" value={form.linkedin} onChange={handleChange} />
        {error && <div className="text-destructive text-sm">{error}</div>}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Submitting...' : 'Submit Application'}
        </Button>
      </form>
    </main>
  )
} 