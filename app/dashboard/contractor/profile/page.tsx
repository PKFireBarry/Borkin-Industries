"use client"
import { useEffect, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getContractorProfile, updateContractorProfile } from '@/lib/firebase/contractors'

const VETERINARY_SKILLS = [
  'Dog Walking',
  'Cat Sitting',
  'Medication Administration',
  'Grooming',
  'Vet Tech Procedures',
  'Exotic Pets',
  'Emergency Care',
]

export default function ContractorProfilePage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    veterinarySkills: [] as string[],
    experience: '',
    certifications: [''],
    references: [''],
    education: '',
    drivingRange: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getContractorProfile(user.id)
      .then((profile) => {
        if (profile) setForm({
          name: profile.name || '',
          address: profile.address || '',
          phone: profile.phone || '',
          email: profile.email || '',
          veterinarySkills: profile.veterinarySkills || [],
          experience: profile.experience || '',
          certifications: profile.certifications?.length ? profile.certifications : [''],
          references: profile.references?.length ? profile.references : [''],
          education: profile.education || '',
          drivingRange: profile.drivingRange || '',
        })
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSkillToggle = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      veterinarySkills: prev.veterinarySkills.includes(skill)
        ? prev.veterinarySkills.filter((s) => s !== skill)
        : [...prev.veterinarySkills, skill],
    }))
  }

  const handleListChange = (field: 'certifications' | 'references', idx: number, value: string) => {
    setForm((prev) => {
      const arr = [...prev[field]]
      arr[idx] = value
      return { ...prev, [field]: arr }
    })
  }

  const handleAddListItem = (field: 'certifications' | 'references') => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ''] }))
  }

  const handleRemoveListItem = (field: 'certifications' | 'references', idx: number) => {
    setForm((prev) => {
      const arr = [...prev[field]]
      arr.splice(idx, 1)
      return { ...prev, [field]: arr.length ? arr : [''] }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      if (!user) throw new Error('User not found')
      await updateContractorProfile(user.id, {
        ...form,
        application: {
          status: 'approved',
          submittedAt: new Date().toISOString(),
          experience: form.experience,
          education: form.education,
          address: form.address,
          drivingRange: form.drivingRange,
          certifications: form.certifications,
          references: form.references,
        },
      })
      setSuccess(true)
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || !isAuthorized || loading) return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>

  return (
    <section className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Contractor Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6" aria-label="Update contractor profile form">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
          <Input id="name" name="name" value={form.name} onChange={handleChange} required autoComplete="name" />
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
          <Input id="address" name="address" value={form.address} onChange={handleChange} autoComplete="street-address" />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
          <Input id="phone" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <Input id="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" type="email" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Veterinary Skills</label>
          <div className="flex flex-wrap gap-2">
            {VETERINARY_SKILLS.map(skill => (
              <Button
                key={skill}
                type="button"
                variant={form.veterinarySkills.includes(skill) ? 'default' : 'outline'}
                onClick={() => handleSkillToggle(skill)}
                className="text-xs px-3 py-1"
              >
                {skill}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="experience" className="block text-sm font-medium mb-1">Experience</label>
          <textarea id="experience" name="experience" value={form.experience} onChange={handleChange} className="w-full border rounded px-3 py-2 text-sm" rows={2} />
        </div>
        <div>
          <label htmlFor="education" className="block text-sm font-medium mb-1">Education</label>
          <Input id="education" name="education" value={form.education} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="drivingRange" className="block text-sm font-medium mb-1">Driving Range</label>
          <Input id="drivingRange" name="drivingRange" value={form.drivingRange} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Certifications</label>
          {form.certifications.map((cert, idx) => (
            <div key={idx} className="flex gap-2 mb-1">
              <Input
                value={cert}
                onChange={e => handleListChange('certifications', idx, e.target.value)}
                className="flex-1"
                placeholder="Certification"
              />
              <Button type="button" variant="outline" onClick={() => handleRemoveListItem('certifications', idx)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => handleAddListItem('certifications')}>Add Certification</Button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">References</label>
          {form.references.map((ref, idx) => (
            <div key={idx} className="flex gap-2 mb-1">
              <Input
                value={ref}
                onChange={e => handleListChange('references', idx, e.target.value)}
                className="flex-1"
                placeholder="Reference"
              />
              <Button type="button" variant="outline" onClick={() => handleRemoveListItem('references', idx)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => handleAddListItem('references')}>Add Reference</Button>
        </div>
        {error && <div className="text-destructive text-sm">{error}</div>}
        {success && <div className="text-success text-sm">Profile updated!</div>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </section>
  )
} 