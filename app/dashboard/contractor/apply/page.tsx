"use client"
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addDoc, collection, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../../../../firebase'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

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

function getFieldError(field: keyof ContractorForm, form: ContractorForm, touched: Record<string, boolean>) {
  if (!touched[field]) return ''
  if (field === 'firstName' && !form.firstName.trim()) return 'First name is required.'
  if (field === 'lastName' && !form.lastName.trim()) return 'Last name is required.'
  if (field === 'email' && !form.email.trim()) return 'Email is required.'
  if (field === 'phone' && !form.phone.trim()) return 'Phone number is required.'
  if (field === 'city' && !form.city.trim()) return 'City is required.'
  if (field === 'state' && !form.state.trim()) return 'State/Province is required.'
  if (field === 'country' && !form.country.trim()) return 'Country is required.'
  if (field === 'address' && !form.address.trim()) return 'Full address is required.'
  return ''
}

function scrollToFirstError() {
  const errorField = document.querySelector('[aria-invalid="true"]') as HTMLElement | null
  if (errorField) errorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export default function ContractorApplyPage() {
  const { user, isLoaded: userLoaded } = useUser()
  const router = useRouter()
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
        // We no longer need to check banned status here - BanCheck handles it
        
        // Check application status
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
      setTimeout(scrollToFirstError, 100)
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
    
    // We no longer need to check if user is banned here - BanCheck handles it
    
    // Set the name field from firstName and lastName
    const formWithName = {
      ...form,
      name: `${form.firstName} ${form.lastName}`.trim()
    }
    
    // Check all steps are valid
    let allStepsValid = true;
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(steps[i])) {
        allStepsValid = false;
        setStepIndex(i); // Move to the invalid step
        setTouched((prev) => ({ ...prev, ...fieldsForStep(steps[i]).reduce((acc, f) => ({ ...acc, [f]: true }), {}) }))
        setTimeout(scrollToFirstError, 100)
        break;
      }
    }
    
    if (!allStepsValid) {
      setError('Please complete all required fields before submitting.')
      setIsPending(false)
      return;
    }
    
    try {
      // Log for debugging
      console.log('Submitting application:', formWithName);
      
      const docRef = await addDoc(collection(db, 'contractorApplications'), {
        ...formWithName,
        status: 'pending',
        createdAt: serverTimestamp(),
        userId: user.id,
      });
      
      console.log('Application submitted with ID:', docRef.id);
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Failed to submit application. Please try again.');
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
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Contact Information</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Please provide your contact details. All fields marked * are required.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
              <div>
                <Input
                  name="firstName"
                  placeholder="First Name*"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  aria-label="First Name"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('firstName', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('firstName', form, touched)}</div>}
              </div>
              <div>
                <Input
                  name="lastName"
                  placeholder="Last Name*"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  aria-label="Last Name"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('lastName', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('lastName', form, touched)}</div>}
              </div>
              <div>
                <Input
                  name="email"
                  placeholder="Email*"
                  value={form.email}
                  onChange={handleChange}
                  required
                  type="email"
                  aria-label="Email"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('email', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('email', form, touched)}</div>}
              </div>
              <div>
                <Input
                  name="phone"
                  placeholder="Phone Number*"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  aria-label="Phone Number"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('phone', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('phone', form, touched)}</div>}
              </div>
              <div>
                <Input
                  name="city"
                  placeholder="City*"
                  value={form.city}
                  onChange={handleChange}
                  required
                  aria-label="City"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('city', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('city', form, touched)}</div>}
              </div>
              <div>
                <Input
                  name="state"
                  placeholder="State/Province*"
                  value={form.state}
                  onChange={handleChange}
                  required
                  aria-label="State/Province"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('state', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('state', form, touched)}</div>}
              </div>
              <div>
                <Input
                  name="postalCode"
                  placeholder="Postal Code"
                  value={form.postalCode}
                  onChange={handleChange}
                  aria-label="Postal Code"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('postalCode', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('postalCode', form, touched)}</div>}
              </div>
              <div>
                <Input
                  name="country"
                  placeholder="Country*"
                  value={form.country}
                  onChange={handleChange}
                  required
                  aria-label="Country"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('country', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('country', form, touched)}</div>}
              </div>
              <div className="md:col-span-2">
                <Input
                  name="address"
                  placeholder="Full Address*"
                  value={form.address}
                  onChange={handleChange}
                  required
                  aria-label="Full Address"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                {getFieldError('address', form, touched) && <div className="text-destructive text-[10px] sm:text-xs mt-0.5 sm:mt-1">{getFieldError('address', form, touched)}</div>}
              </div>
            </div>
            <Textarea
              name="headline"
              placeholder="Headline (optional)"
              value={form.headline}
              onChange={handleChange}
              maxLength={150}
              aria-label="Headline"
              className="mb-1 sm:mb-2 text-xs sm:text-sm min-h-[60px] sm:min-h-[100px]"
            />
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-4">Suggested: Graduation year, college, employers, 2-3 skills you have done and want to do again. Max 150 characters.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
              <Input
                name="linkedin"
                placeholder="LinkedIn (optional)"
                value={form.linkedin}
                onChange={handleChange}
                aria-label="LinkedIn"
                className="h-8 sm:h-10 text-xs sm:text-sm"
              />
              <Input
                name="x"
                placeholder="X (optional)"
                value={form.x}
                onChange={handleChange}
                aria-label="X"
                className="h-8 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <section className="mt-4 sm:mt-8">
              <h3 className="text-xs sm:text-xl font-semibold mb-1 sm:mb-2">Identity <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">(Optional)</span></h3>
              <div className="text-muted-foreground text-[10px] sm:text-sm mb-2 sm:mb-4">Self-identifying is completely optional, and we will handle your information with care. Responses will not be displayed on your profile or in your applications.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                <select
                  name="genderIdentity"
                  value={form.genderIdentity}
                  onChange={handleChange}
                  className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
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
                  className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
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
                  className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
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
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Work Experience</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Add your relevant work experience. All fields with * are required.</div>
            <div className="space-y-2 sm:space-y-6">
              {form.experience.map((exp, idx) => (
                <div key={idx} className="bg-muted rounded-lg p-2 sm:p-4 shadow-sm relative">
                  {form.experience.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove experience"
                      className="absolute top-1 sm:top-2 right-1 sm:right-2 text-destructive text-[10px] sm:text-xs border border-destructive rounded px-1 sm:px-2 py-0.5 sm:py-1 hover:bg-destructive/10"
                      onClick={() => removeExperience(idx)}
                    >
                      Remove
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <Input
                      name={`employer-${idx}`}
                      placeholder="Employer Name*"
                      value={exp.employer}
                      onChange={e => handleExperienceChange(idx, 'employer', e.target.value)}
                      required
                      aria-label="Employer Name"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <Input
                      name={`location-${idx}`}
                      placeholder="Location (City, State)*"
                      value={exp.location}
                      onChange={e => handleExperienceChange(idx, 'location', e.target.value)}
                      required
                      aria-label="Location"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <Input
                      name={`phone-${idx}`}
                      placeholder="Employer Phone*"
                      value={exp.phone}
                      onChange={e => handleExperienceChange(idx, 'phone', e.target.value)}
                      required
                      aria-label="Employer Phone"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <Input
                      name={`title-${idx}`}
                      placeholder="Role/Title*"
                      value={exp.title}
                      onChange={e => handleExperienceChange(idx, 'title', e.target.value)}
                      required
                      aria-label="Role/Title"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 sm:mt-4 items-start sm:items-center">
                    <Input
                      name={`startDate-${idx}`}
                      type="date"
                      placeholder="Start Date*"
                      value={exp.startDate}
                      onChange={e => handleExperienceChange(idx, 'startDate', e.target.value)}
                      required
                      aria-label="Start Date"
                      className="h-8 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
                    />
                    <span className="hidden sm:inline">to</span>
                    {!exp.present && (
                      <Input
                        name={`endDate-${idx}`}
                        type="date"
                        placeholder="End Date*"
                        value={exp.endDate}
                        onChange={e => handleExperienceChange(idx, 'endDate', e.target.value)}
                        aria-label="End Date"
                        className="h-8 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
                      />
                    )}
                    <label className="flex items-center gap-1 text-xs sm:text-sm">
                      <input
                        type="checkbox"
                        checked={exp.present}
                        onChange={e => handleExperienceChange(idx, 'present', e.target.checked)}
                        aria-label="Present"
                      />
                      Present
                    </label>
                  </div>
                  <div className="mt-2 sm:mt-4">
                    <div className="flex gap-1 sm:gap-2">
                      <Input
                        name={`skills-input-${idx}`}
                        placeholder="Type a skill and press Enter or Add (max 6)"
                        value={skillInputs[idx] || ''}
                        onChange={e => handleSkillInputChange(idx, e.target.value)}
                        className="w-full h-8 sm:h-10 text-xs sm:text-sm"
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
                        className="h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1 sm:mt-2">
                      {exp.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center bg-primary/10 text-primary rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(idx, skill)}
                            className="ml-1 sm:ml-2 text-primary/70 hover:text-destructive focus:outline-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    name={`description-${idx}`}
                    placeholder="Description of Duties & Accomplishments*"
                    value={exp.description}
                    onChange={e => handleExperienceChange(idx, 'description', e.target.value)}
                    required
                    aria-label="Description of Duties & Accomplishments"
                    className="mt-2 sm:mt-4 text-xs sm:text-sm min-h-[60px] sm:min-h-[100px]"
                  />
                  <div className="mt-2 sm:mt-4 flex gap-2 sm:gap-4 items-center flex-wrap">
                    <span className="text-xs sm:text-sm">Can we contact this employer?*</span>
                    <label className="flex items-center gap-1 text-xs sm:text-sm">
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
                    <label className="flex items-center gap-1 text-xs sm:text-sm">
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
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addExperience}
                  className="w-full sm:w-auto h-8 sm:h-10 text-xs sm:text-sm"
                >
                  + Add Experience
                </Button>
              )}
            </div>
          </section>
        )
      case 'Education':
        return (
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Education</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Add your educational background. All fields with * are required.</div>
            <div className="space-y-2 sm:space-y-6">
              {form.education.map((ed, idx) => (
                <div key={idx} className="bg-muted rounded-lg p-2 sm:p-4 shadow-sm relative">
                  {form.education.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove this school"
                      className="absolute top-1 sm:top-2 right-1 sm:right-2 text-destructive text-[10px] sm:text-xs border border-destructive rounded px-1 sm:px-2 py-0.5 sm:py-1 hover:bg-destructive/10"
                      onClick={() => removeEducation(idx)}
                    >
                      Remove
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <Input
                      name={`school-${idx}`}
                      placeholder="School*"
                      value={ed.school}
                      onChange={e => handleEducationChange(idx, 'school', e.target.value)}
                      required
                      aria-label="School"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <Input
                      name={`cityState-${idx}`}
                      placeholder="City, State*"
                      value={ed.cityState}
                      onChange={e => handleEducationChange(idx, 'cityState', e.target.value)}
                      required
                      aria-label="City, State"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <div className="flex items-center gap-2 sm:gap-4">
                      <input
                        name={`yearStarted-${idx}`}
                        placeholder="Year Started*"
                        value={ed.yearStarted}
                        onChange={e => handleEducationChange(idx, 'yearStarted', e.target.value)}
                        required
                        aria-label="Year Started"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 10}
                        className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      {!ed.present && (
                        <input
                          name={`yearEnded-${idx}`}
                          placeholder="Year Ended*"
                          value={ed.yearEnded}
                          onChange={e => handleEducationChange(idx, 'yearEnded', e.target.value)}
                          aria-label="Year Ended"
                          type="number"
                          min="1900"
                          max={new Date().getFullYear() + 10}
                          className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                        />
                      )}
                      <label className="flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ml-2">
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
                      className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                      aria-label="Degree"
                    >
                      <option value="">Degree*</option>
                      <option value="associate">Associate</option>
                      <option value="bachelor">Bachelor</option>
                      <option value="master">Master</option>
                      <option value="doctorate">Doctorate</option>
                      <option value="certificate">Certificate</option>
                      <option value="other">Other</option>
                    </select>
                    <Input
                      name={`fieldOfStudy-${idx}`}
                      placeholder="Field of Study*"
                      value={ed.fieldOfStudy}
                      onChange={e => handleEducationChange(idx, 'fieldOfStudy', e.target.value)}
                      required
                      aria-label="Field of Study"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <Textarea
                    name={`description-${idx}`}
                    placeholder="Description (optional)"
                    value={ed.description}
                    onChange={e => handleEducationChange(idx, 'description', e.target.value)}
                    aria-label="Description"
                    className="mt-2 sm:mt-4 text-xs sm:text-sm min-h-[60px] sm:min-h-[100px]"
                  />
                </div>
              ))}
              {form.education.length < 6 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addEducation}
                  className="w-full sm:w-auto h-8 sm:h-10 text-xs sm:text-sm"
                >
                  + Add Education
                </Button>
              )}
            </div>
          </section>
        )
      case 'Certifications':
        return (
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Clubs, Organizations, and Certifications</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">If you participated in high school, college, club, or travel team sports please add it here. We like athletes!</div>
            <div className="space-y-2 sm:space-y-6">
              {form.certifications.map((c, idx) => (
                <div key={idx} className="bg-muted rounded-lg p-2 sm:p-4 shadow-sm relative">
                  {form.certifications.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove this club"
                      className="absolute top-1 sm:top-2 right-1 sm:right-2 text-destructive text-[10px] sm:text-xs border border-destructive rounded px-1 sm:px-2 py-0.5 sm:py-1 hover:bg-destructive/10"
                      onClick={() => removeCertification(idx)}
                    >
                      Remove
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <Input
                      name={`name-${idx}`}
                      placeholder="Name*"
                      value={c.name}
                      onChange={e => handleCertificationChange(idx, 'name', e.target.value)}
                      required
                      aria-label="Name"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <Input
                      name={`officeOrCert-${idx}`}
                      placeholder="Office Held / Certification"
                      value={c.officeOrCert}
                      onChange={e => handleCertificationChange(idx, 'officeOrCert', e.target.value)}
                      aria-label="Office Held / Certification"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <div className="flex items-center gap-2 sm:gap-4">
                      <input
                        name={`yearStarted-${idx}`}
                        placeholder="Year Started*"
                        value={c.yearStarted}
                        onChange={e => handleCertificationChange(idx, 'yearStarted', e.target.value)}
                        required
                        aria-label="Year Started"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 10}
                        className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      {!c.present && (
                        <input
                          name={`yearEnded-${idx}`}
                          placeholder="Year Ended*"
                          value={c.yearEnded}
                          onChange={e => handleCertificationChange(idx, 'yearEnded', e.target.value)}
                          aria-label="Year Ended"
                          type="number"
                          min="1900"
                          max={new Date().getFullYear() + 10}
                          className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                        />
                      )}
                      <label className="flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ml-2">
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
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addCertification}
                  className="w-full sm:w-auto h-8 sm:h-10 text-xs sm:text-sm"
                >
                  + Add Certification/Club
                </Button>
              )}
            </div>
          </section>
        )
      case 'References':
        return (
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">References</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Please provide professional or character references who can speak to your experience, reliability, or skills. Include name, relationship, phone, and email.</div>
            <div className="space-y-2 sm:space-y-6">
              {form.references.map((r, idx) => (
                <div key={idx} className="bg-muted rounded-lg p-2 sm:p-4 shadow-sm relative">
                  {form.references.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove this reference"
                      className="absolute top-1 sm:top-2 right-1 sm:right-2 text-destructive text-[10px] sm:text-xs border border-destructive rounded px-1 sm:px-2 py-0.5 sm:py-1 hover:bg-destructive/10"
                      onClick={() => removeReference(idx)}
                    >
                      Remove
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <Input
                      name={`ref-name-${idx}`}
                      placeholder="Name*"
                      value={r.name}
                      onChange={e => handleReferenceChange(idx, 'name', e.target.value)}
                      required
                      aria-label="Reference Name"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <Input
                      name={`ref-relationship-${idx}`}
                      placeholder="Relationship*"
                      value={r.relationship}
                      onChange={e => handleReferenceChange(idx, 'relationship', e.target.value)}
                      required
                      aria-label="Relationship"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <Input
                      name={`ref-phone-${idx}`}
                      placeholder="Phone*"
                      value={r.phone}
                      onChange={e => handleReferenceChange(idx, 'phone', e.target.value)}
                      required
                      aria-label="Phone"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <Input
                      name={`ref-email-${idx}`}
                      placeholder="Email*"
                      value={r.email}
                      onChange={e => handleReferenceChange(idx, 'email', e.target.value)}
                      required
                      aria-label="Email"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <Textarea
                    name={`ref-notes-${idx}`}
                    placeholder="Notes (optional)"
                    value={r.notes}
                    onChange={e => handleReferenceChange(idx, 'notes', e.target.value)}
                    aria-label="Notes"
                    className="mt-2 sm:mt-4 text-xs sm:text-sm min-h-[60px] sm:min-h-[100px]"
                  />
                </div>
              ))}
              {form.references.length < 6 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addReference}
                  className="w-full sm:w-auto h-8 sm:h-10 text-xs sm:text-sm"
                >
                  + Add Reference
                </Button>
              )}
            </div>
          </section>
        )
      case 'Driving Range':
        return (
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Driving Range & Service Area</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">How far are you willing to travel for work? Please specify your maximum driving distance and any specific areas you serve.</div>
            <div className="space-y-2 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                <Input
                  name="maxDistance"
                  placeholder="Maximum Distance (miles or km)*"
                  value={form.drivingRange.maxDistance}
                  onChange={e => handleDrivingRangeChange('maxDistance', e.target.value)}
                  required
                  aria-label="Maximum Distance"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
                <Input
                  name="areasServed"
                  placeholder="Areas Served (cities, neighborhoods, etc.)*"
                  value={form.drivingRange.areasServed}
                  onChange={e => handleDrivingRangeChange('areasServed', e.target.value)}
                  required
                  aria-label="Areas Served"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="mt-1 sm:mt-2">
                <label className="block mb-1 font-medium text-xs sm:text-sm">Willing to travel outside area?*</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1 text-xs sm:text-sm">
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
                  <label className="flex items-center gap-1 text-xs sm:text-sm">
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
          </section>
        )
      case 'Review & Submit':
        return (
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Review Your Application</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Please review all your information before submitting your application.</div>
            <div className="space-y-1 sm:space-y-2 text-left text-xs sm:text-sm">
              <div className="p-2 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">Contact Information</h3>
                <div><span className="font-semibold">Name:</span> {form.firstName} {form.lastName}</div>
                <div><span className="font-semibold">Email:</span> {form.email}</div>
                <div><span className="font-semibold">Phone:</span> {form.phone}</div>
                <div><span className="font-semibold">Address:</span> {form.address}</div>
                {form.linkedin && <div><span className="font-semibold">LinkedIn:</span> {form.linkedin}</div>}
                {form.headline && <div><span className="font-semibold">Headline:</span> {form.headline}</div>}
              </div>
              
              <div className="p-2 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">Experience</h3>
                <ul className="list-disc ml-4 sm:ml-6 space-y-1 sm:space-y-4">
                  {form.experience.map((exp, idx) => (
                    <li key={idx} className="mb-1 sm:mb-2">
                      <div><b>{exp.title}</b> at {exp.employer} ({exp.location})</div>
                      <div>{exp.startDate} - {exp.present ? 'Present' : exp.endDate}</div>
                      <div>Phone: {exp.phone}</div>
                      {exp.skills.length > 0 && <div>Skills: {exp.skills.join(', ')}</div>}
                      <div>Can contact: {exp.canContact === 'yes' ? 'Yes' : 'No'}</div>
                      <div className="text-[10px] sm:text-xs mt-1">{exp.description}</div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-2 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">Education</h3>
                <ul className="list-disc ml-4 sm:ml-6 space-y-1 sm:space-y-2">
                  {form.education.map((ed, idx) => (
                    <li key={idx} className="mb-1 sm:mb-2">
                      <div><b>{ed.school}</b> ({ed.cityState})</div>
                      <div>{ed.yearStarted} - {ed.present ? 'Present' : ed.yearEnded}</div>
                      <div>Degree: {ed.degree}, Field: {ed.fieldOfStudy}</div>
                      {ed.description && <div className="text-[10px] sm:text-xs mt-1">{ed.description}</div>}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-2 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">Clubs, Organizations, and Certifications</h3>
                <ul className="list-disc ml-4 sm:ml-6 space-y-1 sm:space-y-2">
                  {form.certifications.map((c, idx) => (
                    <li key={idx} className="mb-1 sm:mb-2">
                      <div><b>{c.name}</b> {c.officeOrCert && `- ${c.officeOrCert}`}</div>
                      <div>{c.yearStarted} - {c.present ? 'Present' : c.yearEnded}</div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-2 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">References</h3>
                <ul className="list-disc ml-4 sm:ml-6 space-y-1 sm:space-y-2">
                  {form.references.map((r, idx) => (
                    <li key={idx} className="mb-1 sm:mb-2">
                      <div><b>{r.name}</b> ({r.relationship})</div>
                      <div>Phone: {r.phone}, Email: {r.email}</div>
                      {r.notes && <div className="text-[10px] sm:text-xs mt-1">Notes: {r.notes}</div>}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-2 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">Driving Range & Service Area</h3>
                <div>Maximum Distance: {form.drivingRange.maxDistance}</div>
                <div>Areas Served: {form.drivingRange.areasServed}</div>
                <div>Willing to travel outside area: {form.drivingRange.willTravelOutside === 'yes' ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </section>
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
    <div className="flex flex-col md:flex-row min-h-screen bg-muted">
      {/* Stepper: horizontal on mobile, vertical sidebar on desktop */}
      <nav className="md:hidden w-full bg-background border-b py-2 flex overflow-x-auto whitespace-nowrap h-16">
        {steps.map((s, i) => (
          <div 
            key={s} 
            className={`flex flex-col items-center justify-center min-w-[14%] flex-1
              ${i === stepIndex ? 'text-primary font-semibold' : i < stepIndex ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            <div className={`w-6 h-6 flex items-center justify-center rounded-full border 
              ${i < stepIndex ? 'border-green-600 bg-green-600 text-white' : i === stepIndex ? 'border-primary' : 'border-muted-foreground'}`}
            >
              {i < stepIndex ? <span className="text-xs">✓</span> : <span className="text-xs">{i + 1}</span>}
            </div>
            <span className="text-[10px] text-center mt-1 leading-tight px-0.5 truncate w-full">{s}</span>
          </div>
        ))}
      </nav>
      {/* Desktop: vertical sidebar */}
      <aside className="hidden md:flex w-64 flex-col items-center py-12 pr-4 bg-background border-r">
        <ol className="space-y-6 w-full">
          {steps.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
              ${i === stepIndex ? 'bg-primary/10 text-primary font-semibold' : i < stepIndex ? 'text-green-600' : 'text-muted-foreground'}`}
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-full border-2
                ${i < stepIndex ? 'border-green-600 bg-green-600 text-white' : i === stepIndex ? 'border-primary' : 'border-muted-foreground'}`}
              >
                {i < stepIndex ? <span className="material-icons text-base">check</span> : i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </aside>

      {/* Main form area: responsive max-widths */}
      <main className="flex-1 min-h-0 flex flex-col items-center py-0 sm:py-6 px-0 sm:px-4 overflow-y-auto w-full">
        <form id="contractorApplication" onSubmit={handleSubmit} className="w-full">
          <div className="w-full max-w-none sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl sm:mx-auto">
            <div className="bg-card w-full p-1 sm:p-8 rounded-none sm:rounded-xl shadow-none sm:shadow mb-1 sm:mb-8 text-xs sm:text-lg">
              <h1 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-6">Contractor Application</h1>
              <div className="space-y-1 sm:space-y-8">
                {renderStep()}
                {error && <div className="text-destructive text-xs sm:text-sm mt-1 sm:mt-2">{error}</div>}
              </div>
            </div>
          </div>
          {/* Footer: mobile w-full, static, no shadow, tight padding; desktop max-w and centered */}
          <div className="w-full max-w-none sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl sm:mx-auto bg-background border-t py-1 sm:py-4 px-1 sm:px-8 flex flex-col sm:flex-row gap-1 sm:gap-2 justify-between z-10 rounded-none sm:rounded-xl shadow-none sm:shadow">
            <div className="flex flex-col sm:flex-row w-full gap-1 sm:gap-2">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" onClick={handleBack} className="w-full sm:w-auto text-xs sm:text-lg p-1 sm:p-4 h-8 sm:h-auto">
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {step !== 'Review & Submit' ? (
                <Button type="button" onClick={handleNext} className="w-full sm:w-auto text-xs sm:text-lg p-1 sm:p-4 h-8 sm:h-auto">
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  form="contractorApplication" 
                  disabled={isPending} 
                  className="w-full sm:w-auto text-xs sm:text-lg p-1 sm:p-4 h-8 sm:h-auto"
                  onClick={(e) => {
                    // This won't prevent form submission but helps with debugging
                    console.log('Submit button clicked', form);
                  }}
                >
                  {isPending ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </main>
      {/* Optional right-side info box (uncomment if needed) */}
      {/* <aside className="w-80 hidden lg:block py-12 pl-4 pr-8">
        <div className="bg-muted rounded-xl p-6 text-sm text-muted-foreground">
          Place of work if accepted into this job vacancy.<br />
          You can fill in manually if your work address is different from the head office address.
        </div>
      </aside> */}
    </div>
  )
} 