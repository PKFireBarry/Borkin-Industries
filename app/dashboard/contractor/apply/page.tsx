"use client"
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../../firebase'
import { useUser } from '@clerk/nextjs'

interface ExperienceEntry {
  employer: string
  location: string
  phone: string
  title: string
  startDate: string
  endDate: string
  present: boolean
  description: string
  skills: string[]
  canContact: string // 'yes' | 'no'
}

interface EducationEntry {
  school: string
  cityState: string
  yearStarted: string
  yearEnded: string
  present: boolean
  degree: string
  fieldOfStudy: string
  description: string
}

interface CertificationEntry {
  name: string
  officeOrCert: string
  yearStarted: string
  yearEnded: string
  present: boolean
}

interface ReferenceEntry {
  name: string
  relationship: string
  phone: string
  email: string
  notes: string
}

interface ContractorForm {
  firstName: string
  lastName: string
  name: string
  email: string
  phone: string
  city: string
  state: string
  postalCode: string
  country: string
  headline: string
  address: string
  linkedin: string
  x: string
  genderIdentity: string
  raceEthnicity: string
  veteranDisability: string
  experience: ExperienceEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
  references: ReferenceEntry[]
  drivingRange: {
    maxDistance: string
    areasServed: string
    willTravelOutside: string // 'yes' | 'no'
  }
}

const initialExperience: ExperienceEntry = {
  employer: '',
  location: '',
  phone: '',
  title: '',
  startDate: '',
  endDate: '',
  present: false,
  description: '',
  skills: [],
  canContact: '',
}

const initialEducation: EducationEntry = {
  school: '',
  cityState: '',
  yearStarted: '',
  yearEnded: '',
  present: false,
  degree: '',
  fieldOfStudy: '',
  description: '',
}

const initialCertification: CertificationEntry = {
  name: '',
  officeOrCert: '',
  yearStarted: '',
  yearEnded: '',
  present: false,
}

const initialReference: ReferenceEntry = {
  name: '',
  relationship: '',
  phone: '',
  email: '',
  notes: '',
}

const initialForm: ContractorForm = {
  firstName: '',
  lastName: '',
  name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  headline: '',
  address: '',
  linkedin: '',
  x: '',
  genderIdentity: '',
  raceEthnicity: '',
  veteranDisability: '',
  experience: [ { ...initialExperience } ],
  education: [ { ...initialEducation } ],
  certifications: [ { ...initialCertification } ],
  references: [ { ...initialReference } ],
  drivingRange: {
    maxDistance: '',
    areasServed: '',
    willTravelOutside: '',
  },
}

const steps = [
  'Personal Info',
  'Experience',
  'Education',
  'Certifications',
  'References',
  'Driving Range',
  'Review & Submit',
] as const

type Step = (typeof steps)[number]

export default function ContractorApplyPage() {
  const { user, isLoaded: userLoaded } = useUser()
  const [form, setForm] = useState<ContractorForm>(initialForm)
  const [stepIndex, setStepIndex] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [skillInputs, setSkillInputs] = useState<string[]>(form.experience.map(() => ''))
  const [appStatus, setAppStatus] = useState<'loading' | 'none' | 'pending' | 'approved' | 'rejected'>('loading')
  const [appCheckError, setAppCheckError] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoaded) return
    if (!user) {
      setAppStatus('none')
      return
    }
    (async () => {
      try {
        const q = query(
          collection(db, 'contractorApplications'),
          where('userId', '==', user.id)
        )
        const snap = await getDocs(q)
        if (snap.empty) {
          setAppStatus('none')
        } else {
          const doc = snap.docs[0].data()
          if (doc.status === 'approved') setAppStatus('approved')
          else if (doc.status === 'rejected') setAppStatus('rejected')
          else setAppStatus('pending')
        }
      } catch (err) {
        setAppCheckError('Failed to check application status.')
        setAppStatus('none')
      }
    })()
  }, [user, userLoaded])

  useEffect(() => {
    setSkillInputs((prev) => {
      if (form.experience.length > prev.length) {
        return [...prev, '']
      } else if (form.experience.length < prev.length) {
        return prev.slice(0, form.experience.length)
      }
      return prev
    })
  }, [form.experience.length])

  const step = steps[stepIndex]

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setTouched({ ...touched, [e.target.name]: true })
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStepIndex((i) => i + 1)
    } else {
      setTouched((prev) => ({ ...prev, ...fieldsForStep(step).reduce((acc, f) => ({ ...acc, [f]: true }), {}) }))
    }
  }

  const handleBack = () => setStepIndex((i) => i - 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    if (!user) {
      setError('You must be signed in to submit an application.')
      setIsPending(false)
      return
    }
    try {
      await addDoc(collection(db, 'contractorApplications'), {
        ...form,
        status: 'pending',
        createdAt: serverTimestamp(),
        userId: user.id,
      })
      setSuccess(true)
    } catch (err) {
      setError('Failed to submit application')
    } finally {
      setIsPending(false)
    }
  }

  function fieldsForStep(step: Step): (keyof ContractorForm)[] {
    switch (step) {
      case 'Personal Info':
        return ['firstName', 'lastName', 'email', 'phone', 'city', 'state', 'country', 'address']
      case 'Experience':
        return ['experience']
      case 'Education':
        return ['education']
      case 'Certifications':
        return ['certifications']
      case 'References':
        return ['references']
      case 'Driving Range':
        return ['drivingRange']
      default:
        return []
    }
  }

  function validateStep(step: Step): boolean {
    if (step === 'Experience') {
      return form.experience.length > 0 && form.experience.every(
        (exp) =>
          typeof exp.employer === 'string' && exp.employer.trim() &&
          typeof exp.location === 'string' && exp.location.trim() &&
          typeof exp.phone === 'string' && exp.phone.trim() &&
          typeof exp.title === 'string' && exp.title.trim() &&
          typeof exp.startDate === 'string' && exp.startDate.trim() &&
          (exp.present || (typeof exp.endDate === 'string' && exp.endDate.trim())) &&
          typeof exp.description === 'string' && exp.description.trim() &&
          typeof exp.canContact === 'string' && exp.canContact
      )
    }
    if (step === 'Education') {
      return form.education.length > 0 && form.education.every(
        (ed) =>
          ed.school.trim() &&
          ed.cityState.trim() &&
          ed.yearStarted.trim() &&
          (ed.present || ed.yearEnded.trim()) &&
          ed.degree.trim() &&
          ed.fieldOfStudy.trim()
      )
    }
    if (step === 'Certifications') {
      return form.certifications.length > 0 && form.certifications.every(
        (c) =>
          c.name.trim() &&
          c.yearStarted.trim() &&
          (c.present || c.yearEnded.trim())
      )
    }
    if (step === 'References') {
      return form.references.length > 0 && form.references.every(
        (r) => r.name.trim() && r.relationship.trim() && r.phone.trim() && r.email.trim()
      )
    }
    if (step === 'Driving Range') {
      return Boolean(
        form.drivingRange.maxDistance.trim() &&
        form.drivingRange.areasServed.trim() &&
        form.drivingRange.willTravelOutside.trim()
      )
    }
    const required: (keyof ContractorForm)[] = fieldsForStep(step)
    return required.every((field) => {
      const value = form[field]
      return typeof value === 'string' ? value.trim() !== '' : true
    })
  }

  function handleExperienceChange(idx: number, field: keyof ExperienceEntry, value: any) {
    setForm((prev) => {
      const updated = [...prev.experience]
      updated[idx] = { ...updated[idx], [field]: value }
      if (field === 'present' && value === true) {
        updated[idx].endDate = ''
      }
      return { ...prev, experience: updated }
    })
  }

  function handleSkillInputChange(idx: number, value: string) {
    setSkillInputs((prev) => {
      const updated = [...prev]
      updated[idx] = value
      return updated
    })
  }

  function handleAddSkill(idx: number) {
    setForm((prev) => {
      const updated = [...prev.experience]
      const skill = (skillInputs[idx] || '').trim()
      if (
        skill &&
        !updated[idx].skills.includes(skill) &&
        updated[idx].skills.length < 6
      ) {
        updated[idx] = {
          ...updated[idx],
          skills: [...updated[idx].skills, skill],
        }
      }
      return { ...prev, experience: updated }
    })
    setSkillInputs((prev) => {
      const updated = [...prev]
      updated[idx] = ''
      return updated
    })
  }

  function handleRemoveSkill(idx: number, skill: string) {
    setForm((prev) => {
      const updated = [...prev.experience]
      updated[idx] = {
        ...updated[idx],
        skills: updated[idx].skills.filter((s) => s !== skill),
      }
      return { ...prev, experience: updated }
    })
  }

  function addExperience() {
    setForm((prev) => ({ ...prev, experience: [ ...prev.experience, { ...initialExperience } ] }))
  }

  function removeExperience(idx: number) {
    setForm((prev) => ({ ...prev, experience: prev.experience.filter((_, i) => i !== idx) }))
  }

  function handleEducationChange(idx: number, field: keyof EducationEntry, value: any) {
    setForm((prev) => {
      const updated = [...prev.education]
      updated[idx] = { ...updated[idx], [field]: value }
      if (field === 'present' && value === true) {
        updated[idx].yearEnded = ''
      }
      return { ...prev, education: updated }
    })
  }

  function addEducation() {
    setForm((prev) => ({ ...prev, education: [ ...prev.education, { ...initialEducation } ] }))
  }

  function removeEducation(idx: number) {
    setForm((prev) => ({ ...prev, education: prev.education.filter((_, i) => i !== idx) }))
  }

  function handleCertificationChange(idx: number, field: keyof CertificationEntry, value: any) {
    setForm((prev) => {
      const updated = [...prev.certifications]
      updated[idx] = { ...updated[idx], [field]: value }
      if (field === 'present' && value === true) {
        updated[idx].yearEnded = ''
      }
      return { ...prev, certifications: updated }
    })
  }

  function addCertification() {
    setForm((prev) => ({ ...prev, certifications: [ ...prev.certifications, { ...initialCertification } ] }))
  }

  function removeCertification(idx: number) {
    setForm((prev) => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== idx) }))
  }

  function handleReferenceChange(idx: number, field: keyof ReferenceEntry, value: any) {
    setForm((prev) => {
      const updated = [...prev.references]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...prev, references: updated }
    })
  }

  function addReference() {
    setForm((prev) => ({ ...prev, references: [ ...prev.references, { ...initialReference } ] }))
  }

  function removeReference(idx: number) {
    setForm((prev) => ({ ...prev, references: prev.references.filter((_, i) => i !== idx) }))
  }

  function handleDrivingRangeChange(field: keyof ContractorForm['drivingRange'], value: any) {
    setForm((prev) => ({ ...prev, drivingRange: { ...prev.drivingRange, [field]: value } }))
  }

  function renderStep() {
    switch (step) {
      case 'Personal Info':
        return (
          <section className="bg-card rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-2">Contact Information</h2>
            <div className="text-muted-foreground text-sm mb-4">Please provide your contact details. All fields marked * are required.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input name="firstName" placeholder="First Name*" value={form.firstName} onChange={handleChange} required aria-label="First Name" />
              <Input name="lastName" placeholder="Last Name*" value={form.lastName} onChange={handleChange} required aria-label="Last Name" />
              <Input name="email" placeholder="Email*" value={form.email} onChange={handleChange} required type="email" aria-label="Email" />
              <Input name="phone" placeholder="Phone Number*" value={form.phone} onChange={handleChange} required aria-label="Phone Number" />
              <Input name="city" placeholder="City*" value={form.city} onChange={handleChange} required aria-label="City" />
              <Input name="state" placeholder="State/Province*" value={form.state} onChange={handleChange} required aria-label="State/Province" />
              <Input name="postalCode" placeholder="Postal Code" value={form.postalCode} onChange={handleChange} aria-label="Postal Code" />
              <Input name="country" placeholder="Country*" value={form.country} onChange={handleChange} required aria-label="Country" />
              <Input name="address" placeholder="Full Address*" value={form.address} onChange={handleChange} required aria-label="Full Address" className="col-span-1 md:col-span-2" />
            </div>
            <Textarea name="headline" placeholder="Headline (optional)" value={form.headline} onChange={handleChange} maxLength={150} aria-label="Headline" className="mb-2" />
            <div className="text-xs text-muted-foreground mb-4">Suggested: Graduation year, college, employers, 2-3 skills you have done and want to do again. Max 150 characters.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input name="linkedin" placeholder="LinkedIn (optional)" value={form.linkedin} onChange={handleChange} aria-label="LinkedIn" />
              <Input name="x" placeholder="X (optional)" value={form.x} onChange={handleChange} aria-label="X" />
            </div>
            <section className="mt-8">
              <h3 className="text-xl font-semibold mb-2">Identity <span className="text-xs text-muted-foreground font-normal">(Optional)</span></h3>
              <div className="text-muted-foreground text-sm mb-4">Self-identifying is completely optional, and we will handle your information with care. Responses will not be displayed on your profile or in your applications.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  name="genderIdentity"
                  value={form.genderIdentity}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  aria-label="Gender Identity"
                >
                  <option value="">Gender Identity (optional)</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
                <select
                  name="raceEthnicity"
                  value={form.raceEthnicity}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  aria-label="Race/Ethnicity"
                >
                  <option value="">Race/Ethnicity (optional)</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                  <option value="asian">Asian</option>
                  <option value="black">Black or African American</option>
                  <option value="hispanic">Hispanic or Latino</option>
                  <option value="native">Native American or Alaska Native</option>
                  <option value="pacific">Native Hawaiian or Pacific Islander</option>
                  <option value="white">White</option>
                  <option value="other">Other</option>
                </select>
                <select
                  name="veteranDisability"
                  value={form.veteranDisability}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  aria-label="Veteran/Disability"
                >
                  <option value="">Veteran/Disability (optional)</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                  <option value="veteran">Veteran</option>
                  <option value="disability">Person with a Disability</option>
                  <option value="both">Both</option>
                  <option value="none">Neither</option>
                </select>
              </div>
            </section>
          </section>
        )
      case 'Experience':
        return (
          <div className="space-y-6">
            {form.experience.map((exp, idx) => (
              <div key={idx} className="bg-muted rounded-lg p-4 shadow-sm relative">
                {form.experience.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove experience"
                    className="absolute top-2 right-2 text-destructive text-xs"
                    onClick={() => removeExperience(idx)}
                  >
                    Remove
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name={`employer-${idx}`}
                    placeholder="Employer Name"
                    value={exp.employer}
                    onChange={e => handleExperienceChange(idx, 'employer', e.target.value)}
                    required
                    aria-label="Employer Name"
                    className="w-full"
                  />
                  <Input
                    name={`location-${idx}`}
                    placeholder="Location (City, State)"
                    value={exp.location}
                    onChange={e => handleExperienceChange(idx, 'location', e.target.value)}
                    required
                    aria-label="Location"
                    className="w-full"
                  />
                  <Input
                    name={`phone-${idx}`}
                    placeholder="Employer Phone"
                    value={exp.phone}
                    onChange={e => handleExperienceChange(idx, 'phone', e.target.value)}
                    required
                    aria-label="Employer Phone"
                    className="w-full"
                  />
                  <Input
                    name={`title-${idx}`}
                    placeholder="Role/Title"
                    value={exp.title}
                    onChange={e => handleExperienceChange(idx, 'title', e.target.value)}
                    required
                    aria-label="Role/Title"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
                  <Input
                    name={`startDate-${idx}`}
                    type="date"
                    placeholder="Start Date"
                    value={exp.startDate}
                    onChange={e => handleExperienceChange(idx, 'startDate', e.target.value)}
                    required
                    aria-label="Start Date"
                    className="w-full md:w-auto"
                  />
                  <span className="hidden md:inline">to</span>
                  {!exp.present && (
                    <Input
                      name={`endDate-${idx}`}
                      type="date"
                      placeholder="End Date"
                      value={exp.endDate}
                      onChange={e => handleExperienceChange(idx, 'endDate', e.target.value)}
                      aria-label="End Date"
                      className="w-full md:w-auto"
                    />
                  )}
                  <label className="flex items-center gap-1 ml-2">
                    <input
                      type="checkbox"
                      checked={exp.present}
                      onChange={e => handleExperienceChange(idx, 'present', e.target.checked)}
                      aria-label="Present"
                    />
                    Present
                  </label>
                </div>
                <div className="mt-4">
                  <div className="flex gap-2">
                    <Input
                      name={`skills-input-${idx}`}
                      placeholder="Type a skill and press Enter or Add (max 6)"
                      value={skillInputs[idx] || ''}
                      onChange={e => handleSkillInputChange(idx, e.target.value)}
                      aria-label="Add Skill"
                      className="w-full"
                      disabled={exp.skills.length >= 6}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill(idx);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddSkill(idx)}
                      disabled={exp.skills.length >= 6 || !(skillInputs[idx] || '').trim()}
                      aria-label="Add Skill"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {exp.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium group"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(idx, skill)}
                          className="ml-2 text-primary/70 hover:text-destructive focus:outline-none"
                          aria-label={`Remove skill ${skill}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <Textarea
                  name={`description-${idx}`}
                  placeholder="Description of Duties & Accomplishments"
                  value={exp.description}
                  onChange={e => handleExperienceChange(idx, 'description', e.target.value)}
                  required
                  aria-label="Description of Duties & Accomplishments"
                  className="mt-4 w-full"
                />
                <div className="mt-4 flex gap-4 items-center flex-wrap">
                  <span>Can we contact this employer?</span>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`canContact-${idx}`}
                      value="yes"
                      checked={exp.canContact === 'yes'}
                      onChange={() => handleExperienceChange(idx, 'canContact', 'yes')}
                      required
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`canContact-${idx}`}
                      value="no"
                      checked={exp.canContact === 'no'}
                      onChange={() => handleExperienceChange(idx, 'canContact', 'no')}
                      required
                    />
                    No
                  </label>
                </div>
              </div>
            ))}
            {form.experience.length < 6 && (
              <Button type="button" variant="outline" onClick={addExperience}>
                + Add Experience
              </Button>
            )}
          </div>
        )
      case 'Education':
        return (
          <div className="space-y-6">
            {form.education.map((ed, idx) => (
              <div key={idx} className="bg-muted rounded-lg p-4 shadow-sm relative">
                {form.education.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove this school"
                    className="absolute top-2 right-2 text-destructive text-xs border border-destructive rounded px-2 py-1 hover:bg-destructive/10"
                    onClick={() => removeEducation(idx)}
                  >
                    Remove This School
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name={`school-${idx}`}
                    placeholder="School"
                    value={ed.school}
                    onChange={e => handleEducationChange(idx, 'school', e.target.value)}
                    required
                    aria-label="School"
                    className="w-full"
                  />
                  <Input
                    name={`cityState-${idx}`}
                    placeholder="City, State"
                    value={ed.cityState}
                    onChange={e => handleEducationChange(idx, 'cityState', e.target.value)}
                    required
                    aria-label="City, State"
                    className="w-full"
                  />
                  <input
                    name={`yearStarted-${idx}`}
                    placeholder="Year Started"
                    value={ed.yearStarted}
                    onChange={e => handleEducationChange(idx, 'yearStarted', e.target.value)}
                    required
                    aria-label="Year Started"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 10}
                  />
                  <div className="flex gap-2 items-center">
                    {!ed.present && (
                      <input
                        name={`yearEnded-${idx}`}
                        placeholder="Year Ended"
                        value={ed.yearEnded}
                        onChange={e => handleEducationChange(idx, 'yearEnded', e.target.value)}
                        aria-label="Year Ended"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 10}
                      />
                    )}
                    <label className="flex items-center gap-1 ml-2">
                      <input
                        type="checkbox"
                        checked={ed.present}
                        onChange={e => handleEducationChange(idx, 'present', e.target.checked)}
                        aria-label="Present"
                      />
                      Present
                    </label>
                  </div>
                  <select
                    name={`degree-${idx}`}
                    value={ed.degree}
                    onChange={e => handleEducationChange(idx, 'degree', e.target.value)}
                    required
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    aria-label="Degree"
                  >
                    <option value="">Degree</option>
                    <option value="associate">Associate</option>
                    <option value="bachelor">Bachelor</option>
                    <option value="master">Master</option>
                    <option value="doctorate">Doctorate</option>
                    <option value="certificate">Certificate</option>
                    <option value="other">Other</option>
                  </select>
                  <Input
                    name={`fieldOfStudy-${idx}`}
                    placeholder="Field of Study"
                    value={ed.fieldOfStudy}
                    onChange={e => handleEducationChange(idx, 'fieldOfStudy', e.target.value)}
                    required
                    aria-label="Field of Study"
                    className="w-full"
                  />
                </div>
                <Textarea
                  name={`description-${idx}`}
                  placeholder="Description (optional)"
                  value={ed.description}
                  onChange={e => handleEducationChange(idx, 'description', e.target.value)}
                  aria-label="Description"
                  className="mt-4 w-full"
                />
              </div>
            ))}
            {form.education.length < 6 && (
              <Button type="button" variant="outline" onClick={addEducation}>
                + Add Education
              </Button>
            )}
          </div>
        )
      case 'Certifications':
        return (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-lg font-semibold">Clubs, Organizations, and Certifications</h2>
              <div className="text-muted-foreground text-sm mb-2">If you participated in high school, college, club, or travel team sports please add it here. We like athletes!</div>
            </div>
            {form.certifications.map((c, idx) => (
              <div key={idx} className="bg-muted rounded-lg p-4 shadow-sm relative">
                {form.certifications.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove this club"
                    className="absolute top-2 left-2 text-destructive text-xs border border-destructive rounded px-2 py-1 hover:bg-destructive/10"
                    onClick={() => removeCertification(idx)}
                  >
                    Remove This Club
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name={`name-${idx}`}
                    placeholder="Name"
                    value={c.name}
                    onChange={e => handleCertificationChange(idx, 'name', e.target.value)}
                    required
                    aria-label="Name"
                    className="w-full"
                  />
                  <Input
                    name={`officeOrCert-${idx}`}
                    placeholder="Office Held / Certification"
                    value={c.officeOrCert}
                    onChange={e => handleCertificationChange(idx, 'officeOrCert', e.target.value)}
                    aria-label="Office Held / Certification"
                    className="w-full"
                  />
                  <input
                    name={`yearStarted-${idx}`}
                    placeholder="Year Started"
                    value={c.yearStarted}
                    onChange={e => handleCertificationChange(idx, 'yearStarted', e.target.value)}
                    required
                    aria-label="Year Started"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 10}
                  />
                  <div className="flex gap-2 items-center">
                    {!c.present && (
                      <input
                        name={`yearEnded-${idx}`}
                        placeholder="Year Ended"
                        value={c.yearEnded}
                        onChange={e => handleCertificationChange(idx, 'yearEnded', e.target.value)}
                        aria-label="Year Ended"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 10}
                      />
                    )}
                    <label className="flex items-center gap-1 ml-2">
                      <input
                        type="checkbox"
                        checked={c.present}
                        onChange={e => handleCertificationChange(idx, 'present', e.target.checked)}
                        aria-label="Present"
                      />
                      Present
                    </label>
                  </div>
                </div>
              </div>
            ))}
            {form.certifications.length < 6 && (
              <Button type="button" variant="outline" onClick={addCertification}>
                + Add Certification/Club
              </Button>
            )}
          </div>
        )
      case 'References':
        return (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-lg font-semibold">References</h2>
              <div className="text-muted-foreground text-sm mb-2">Please provide professional or character references who can speak to your experience, reliability, or skills. Include name, relationship, phone, and email.</div>
            </div>
            {form.references.map((r, idx) => (
              <div key={idx} className="bg-muted rounded-lg p-4 shadow-sm relative">
                {form.references.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove this reference"
                    className="absolute top-2 right-2 text-destructive text-xs border border-destructive rounded px-2 py-1 hover:bg-destructive/10"
                    onClick={() => removeReference(idx)}
                  >
                    Remove This Reference
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name={`ref-name-${idx}`}
                    placeholder="Name"
                    value={r.name}
                    onChange={e => handleReferenceChange(idx, 'name', e.target.value)}
                    required
                    aria-label="Reference Name"
                    className="w-full"
                  />
                  <Input
                    name={`ref-relationship-${idx}`}
                    placeholder="Relationship"
                    value={r.relationship}
                    onChange={e => handleReferenceChange(idx, 'relationship', e.target.value)}
                    required
                    aria-label="Relationship"
                    className="w-full"
                  />
                  <Input
                    name={`ref-phone-${idx}`}
                    placeholder="Phone"
                    value={r.phone}
                    onChange={e => handleReferenceChange(idx, 'phone', e.target.value)}
                    required
                    aria-label="Phone"
                    className="w-full"
                  />
                  <Input
                    name={`ref-email-${idx}`}
                    placeholder="Email"
                    value={r.email}
                    onChange={e => handleReferenceChange(idx, 'email', e.target.value)}
                    required
                    aria-label="Email"
                    className="w-full"
                  />
                </div>
                <Textarea
                  name={`ref-notes-${idx}`}
                  placeholder="Notes (optional)"
                  value={r.notes}
                  onChange={e => handleReferenceChange(idx, 'notes', e.target.value)}
                  aria-label="Notes"
                  className="mt-4 w-full"
                />
              </div>
            ))}
            {form.references.length < 6 && (
              <Button type="button" variant="outline" onClick={addReference}>
                + Add Reference
              </Button>
            )}
          </div>
        )
      case 'Driving Range':
        return (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-lg font-semibold">Driving Range & Service Area</h2>
              <div className="text-muted-foreground text-sm mb-2">How far are you willing to travel for work? Please specify your maximum driving distance and any specific areas you serve.</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="maxDistance"
                placeholder="Maximum Distance (miles or km)"
                value={form.drivingRange.maxDistance}
                onChange={e => handleDrivingRangeChange('maxDistance', e.target.value)}
                required
                aria-label="Maximum Distance"
                className="w-full"
              />
              <Input
                name="areasServed"
                placeholder="Areas Served (cities, neighborhoods, etc.)"
                value={form.drivingRange.areasServed}
                onChange={e => handleDrivingRangeChange('areasServed', e.target.value)}
                required
                aria-label="Areas Served"
                className="w-full"
              />
            </div>
            <div className="mt-2">
              <label className="block mb-1 font-medium">Willing to travel outside area?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="willTravelOutside"
                    value="yes"
                    checked={form.drivingRange.willTravelOutside === 'yes'}
                    onChange={e => handleDrivingRangeChange('willTravelOutside', e.target.value)}
                    required
                  />
                  Yes
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="willTravelOutside"
                    value="no"
                    checked={form.drivingRange.willTravelOutside === 'no'}
                    onChange={e => handleDrivingRangeChange('willTravelOutside', e.target.value)}
                    required
                  />
                  No
                </label>
              </div>
            </div>
          </div>
        )
      case 'Review & Submit':
        return (
          <div className="space-y-2 text-left">
            <div><span className="font-semibold">Full Name:</span> {form.name}</div>
            <div><span className="font-semibold">Email:</span> {form.email}</div>
            <div><span className="font-semibold">Phone:</span> {form.phone}</div>
            <div><span className="font-semibold">Address:</span> {form.address}</div>
            <div><span className="font-semibold">LinkedIn:</span> {form.linkedin}</div>
            <div>
              <span className="font-semibold">Experience:</span>
              <ul className="list-disc ml-6">
                {form.experience.map((exp, idx) => (
                  <li key={idx} className="mb-2">
                    <div><b>{exp.title}</b> at {exp.employer} ({exp.location})</div>
                    <div>{exp.startDate} - {exp.present ? 'Present' : exp.endDate}</div>
                    <div>Phone: {exp.phone}</div>
                    <div>Skills: {exp.skills.join(', ')}</div>
                    <div>Can contact: {exp.canContact === 'yes' ? 'Yes' : 'No'}</div>
                    <div>{exp.description}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-semibold">Education:</span>
              <ul className="list-disc ml-6">
                {form.education.map((ed, idx) => (
                  <li key={idx} className="mb-2">
                    <div><b>{ed.school}</b> ({ed.cityState})</div>
                    <div>{ed.yearStarted} - {ed.present ? 'Present' : ed.yearEnded}</div>
                    <div>Degree: {ed.degree}, Field: {ed.fieldOfStudy}</div>
                    {ed.description && <div>{ed.description}</div>}
                  </li>
                ))}
              </ul>
            </div>
            <div><span className="font-semibold">Clubs, Organizations, and Certifications:</span>
              <ul className="list-disc ml-6">
                {form.certifications.map((c, idx) => (
                  <li key={idx} className="mb-2">
                    <div><b>{c.name}</b> {c.officeOrCert && `- ${c.officeOrCert}`}</div>
                    <div>{c.yearStarted} - {c.present ? 'Present' : c.yearEnded}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div><span className="font-semibold">References:</span>
              <ul className="list-disc ml-6">
                {form.references.map((r, idx) => (
                  <li key={idx} className="mb-2">
                    <div><b>{r.name}</b> ({r.relationship})</div>
                    <div>Phone: {r.phone}, Email: {r.email}</div>
                    {r.notes && <div>Notes: {r.notes}</div>}
                  </li>
                ))}
              </ul>
            </div>
            <div><span className="font-semibold">Driving Range & Service Area:</span>
              <div>Maximum Distance: {form.drivingRange.maxDistance}</div>
              <div>Areas Served: {form.drivingRange.areasServed}</div>
              <div>Willing to travel outside area: {form.drivingRange.willTravelOutside === 'yes' ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (!userLoaded || appStatus === 'loading') {
    return <main className="max-w-lg mx-auto py-12 px-4"><div>Loading...</div></main>
  }
  if (appCheckError) {
    return <main className="max-w-lg mx-auto py-12 px-4"><div className="text-destructive">{appCheckError}</div></main>
  }
  if (appStatus === 'pending') {
    return (
      <main className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Application Under Review</h1>
        <p>Your application is still under review. We'll notify you once a decision has been made.</p>
      </main>
    )
  }
  if (appStatus === 'approved') {
    return (
      <main className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">You are already approved!</h1>
        <p>Your contractor application has been approved. You may now access contractor features.</p>
      </main>
    )
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
      <div className="mb-4 flex items-center gap-2 text-sm">
        {steps.map((s, i) => (
          <div key={s} className={`flex items-center ${i === stepIndex ? 'font-bold text-primary' : 'text-muted-foreground'}`}> 
            <span>{i + 1}</span>
            <span className="ml-1">{s}</span>
            {i < steps.length - 1 && <span className="mx-2">→</span>}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-lg shadow p-6">
        {renderStep()}
        {error && <div className="text-destructive text-sm">{error}</div>}
        <div className="flex justify-between mt-6">
          {stepIndex > 0 && (
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          {step !== 'Review & Submit' ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </form>
    </main>
  )
} 