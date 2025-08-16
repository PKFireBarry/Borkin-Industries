"use client"
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { addDoc, collection, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../../../../firebase'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, AlertCircle } from 'lucide-react'
import { uploadFileToStorage } from '@/lib/firebase/storage'
import W9Form from '@/components/forms/w9-form'

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
    willTravelOutside: string // 'yes' | 'no'
  }
  w9Url: string
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
    willTravelOutside: '',
  },
  w9Url: '',
}

const steps = [
  'Personal Info',
  'Experience',
  'Education',
  'Certifications',
  'References',
  'Driving Range',
  'W-9 Upload',
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
  const [visitedSteps, setVisitedSteps] = useState<boolean[]>(steps.map((_, i) => i === 0));
  const [stepsCompleted, setStepsCompleted] = useState<boolean[]>(steps.map(() => false));
  const [w9File, setW9File] = useState<File | null>(null)
  const [isUploadingW9, setIsUploadingW9] = useState(false)
  const [w9ModalOpen, setW9ModalOpen] = useState(false)
  const [w9Error, setW9Error] = useState<string | null>(null)

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
      const nextIndex = stepIndex + 1;
      setVisitedSteps(prev => {
        const updated = [...prev];
        updated[nextIndex] = true;
        return updated;
      });
      setStepIndex(nextIndex);
    } else {
      setTouched((prev) => ({ 
        ...prev, 
        ...fieldsForStep(step).reduce((acc, f) => ({ ...acc, [f]: true }), {}) 
      }));
      setTimeout(scrollToFirstError, 100);
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
      case 'W-9 Upload':
        return ['w9Url']
      default:
        return []
    }
  }

  function validateStep(step: Step): boolean {
    if (step === 'Experience') {
      if (form.experience.length === 1 && Object.values(form.experience[0]).every(val => typeof val === 'string' ? !val.trim() : Array.isArray(val) ? val.length === 0 : val === false)) return true;
      return form.experience.every(
        (exp) =>
          exp.employer.trim() &&
          exp.location.trim() &&
          exp.phone.trim() &&
          exp.title.trim() &&
          exp.startDate.trim() &&
          (exp.present || exp.endDate.trim()) &&
          exp.description.trim() &&
          exp.canContact
      )
    }
    if (step === 'Education') {
      if (form.education.length === 1 && Object.values(form.education[0]).every(val => typeof val === 'string' ? !val.trim() : val === false)) return true;
      return form.education.every(
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
      if (form.certifications.length === 1 && Object.values(form.certifications[0]).every(val => typeof val === 'string' ? !val.trim() : val === false)) return true;
      return form.certifications.every(
        (c) =>
          c.name.trim() &&
          c.yearStarted.trim() &&
          (c.present || c.yearEnded.trim())
      )
    }
    if (step === 'References') {
      if (form.references.length === 1 && Object.values(form.references[0]).every(val => !val.trim())) return true;
      return form.references.every(
        (r) => r.name.trim() && r.relationship.trim() && r.phone.trim() && r.email.trim()
      )
    }
    if (step === 'Driving Range') {
      return Boolean(
        form.drivingRange.maxDistance.trim() &&
        form.drivingRange.willTravelOutside.trim()
      )
    }
    if (step === 'W-9 Upload') {
      return Boolean(form.w9Url && form.w9Url.trim())
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

  async function handleW9Upload() {
    setW9Error(null)
    try {
      if (!w9File) {
        setW9Error('Please select a W-9 PDF file to upload.')
        return
      }
      const isPdf = w9File.type === 'application/pdf' || w9File.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        setW9Error('Only PDF files are accepted for the W-9.')
        return
      }
      const maxSizeMB = 10
      if (w9File.size > maxSizeMB * 1024 * 1024) {
        setW9Error(`File must be ${maxSizeMB}MB or smaller.`)
        return
      }
      setIsUploadingW9(true)
      const path = `w9s/${user?.id}-${Date.now()}.pdf`
      const url = await uploadFileToStorage(w9File, path)
      setForm((prev) => ({ ...prev, w9Url: url }))
      setW9File(null)
    } catch (err) {
      console.error('W-9 upload failed:', err)
      setW9Error('Failed to upload W-9. Please try again.')
    } finally {
      setIsUploadingW9(false)
    }
  }

  async function handleW9GenerateAndAttach(file: File) {
    setW9Error(null)
    try {
      setIsUploadingW9(true)
      const path = `w9s/${user?.id}-${Date.now()}.pdf`
      const url = await uploadFileToStorage(file, path)
      setForm((prev) => ({ ...prev, w9Url: url }))
    } catch (err) {
      console.error('W-9 generate/upload failed:', err)
      setW9Error('Failed to attach generated W-9. Please try again.')
    } finally {
      setIsUploadingW9(false)
    }
  }

  function handleW9Replace() {
    setForm((prev) => ({ ...prev, w9Url: '' }))
    setW9File(null)
    setW9Error(null)
  }

  // Function to render completion summary
  const renderCompletionSummary = () => {
    return (
      <div className="bg-muted/50 rounded-lg p-4 mb-6 border border-border">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <span>Application Status</span>
          {stepsCompleted.every(Boolean) ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Ready to submit
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              Incomplete
            </span>
          )}
        </h3>
        <ul className="space-y-2">
          {steps.map((stepName, index) => (
            <li key={stepName} className="flex items-center gap-2">
              {stepsCompleted[index] ? (
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
              <span className={`text-sm ${stepsCompleted[index] ? 'text-foreground' : 'text-muted-foreground'}`}>
                {stepName}
              </span>
              {!stepsCompleted[index] && (
                <button 
                  type="button" 
                  onClick={() => handleStepClick(index)}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Complete now
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  function renderStep() {
    switch (step) {
      case 'Personal Info':
        return (
          <Card className="border-0 sm:border shadow-none sm:shadow-md">
            <CardHeader className="pb-0">
              <CardTitle className="text-xl font-bold">Contact Information</CardTitle>
              <p className="text-muted-foreground text-sm">Please provide your contact details. All fields marked * are required.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-1">First Name*</label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    aria-invalid={touched.firstName && !form.firstName ? true : undefined}
                    className="h-10"
                  />
                  {getFieldError('firstName', form, touched) && 
                    <div className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getFieldError('firstName', form, touched)}</span>
                    </div>
                  }
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-1">Last Name*</label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    aria-invalid={touched.lastName && !form.lastName ? true : undefined}
                    className="h-10"
                  />
                  {getFieldError('lastName', form, touched) && 
                    <div className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getFieldError('lastName', form, touched)}</span>
                    </div>
                  }
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">Email*</label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    aria-invalid={touched.email && !form.email ? true : undefined}
                    className="h-10"
                  />
                  {getFieldError('email', form, touched) && 
                    <div className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getFieldError('email', form, touched)}</span>
                    </div>
                  }
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number*</label>
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    aria-invalid={touched.phone && !form.phone ? true : undefined}
                    className="h-10"
                  />
                  {getFieldError('phone', form, touched) && 
                    <div className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getFieldError('phone', form, touched)}</span>
                    </div>
                  }
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-1">City*</label>
                  <Input
                    id="city"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    aria-invalid={touched.city && !form.city ? true : undefined}
                    className="h-10"
                  />
                  {getFieldError('city', form, touched) && 
                    <div className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getFieldError('city', form, touched)}</span>
                    </div>
                  }
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium mb-1">State/Province*</label>
                  <Input
                    id="state"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    required
                    aria-invalid={touched.state && !form.state ? true : undefined}
                    className="h-10"
                  />
                  {getFieldError('state', form, touched) && 
                    <div className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getFieldError('state', form, touched)}</span>
                    </div>
                  }
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium mb-1">Postal Code</label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    className="h-10"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium mb-1">Country*</label>
                  <Input
                    id="country"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    required
                    aria-invalid={touched.country && !form.country ? true : undefined}
                    className="h-10"
                  />
                  {getFieldError('country', form, touched) && 
                    <div className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getFieldError('country', form, touched)}</span>
                    </div>
                  }
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium mb-1">Full Address*</label>
                <Input
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  aria-invalid={touched.address && !form.address ? true : undefined}
                  className="h-10"
                />
                {getFieldError('address', form, touched) && 
                  <div className="text-destructive text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{getFieldError('address', form, touched)}</span>
                  </div>
                }
              </div>

              <div>
                <label htmlFor="headline" className="block text-sm font-medium mb-1">
                  Headline <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Textarea
                  id="headline"
                  name="headline"
                  value={form.headline}
                  onChange={handleChange}
                  maxLength={150}
                  className="min-h-[100px]"
                  placeholder="Briefly describe yourself professionally"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Suggested: Graduation year, college, employers, 2-3 skills you have done and want to do again. Max 150 characters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="linkedin" className="block text-sm font-medium mb-1">
                    LinkedIn <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    id="linkedin"
                    name="linkedin"
                    value={form.linkedin}
                    onChange={handleChange}
                    className="h-10"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div>
                  <label htmlFor="x" className="block text-sm font-medium mb-1">
                    X <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    id="x"
                    name="x"
                    value={form.x}
                    onChange={handleChange}
                    className="h-10"
                    placeholder="https://x.com/username"
                  />
                </div>
              </div>

              <Card className="bg-slate-50 border border-slate-100">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base font-medium">Identity Information</CardTitle>
                  <p className="text-muted-foreground text-xs">Self-identifying is completely optional, and we will handle your information with care.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="genderIdentity" className="block text-sm font-medium mb-1">Gender Identity</label>
                      <select
                        id="genderIdentity"
                        name="genderIdentity"
                        value={form.genderIdentity}
                        onChange={handleChange}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select option</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="nonbinary">Non-binary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="raceEthnicity" className="block text-sm font-medium mb-1">Race/Ethnicity</label>
                      <select
                        id="raceEthnicity"
                        name="raceEthnicity"
                        value={form.raceEthnicity}
                        onChange={handleChange}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select option</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                        <option value="asian">Asian</option>
                        <option value="black">Black or African American</option>
                        <option value="hispanic">Hispanic or Latino</option>
                        <option value="native">Native American or Alaska Native</option>
                        <option value="pacific">Native Hawaiian or Pacific Islander</option>
                        <option value="white">White</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="veteranDisability" className="block text-sm font-medium mb-1">Veteran/Disability</label>
                      <select
                        id="veteranDisability"
                        name="veteranDisability"
                        value={form.veteranDisability}
                        onChange={handleChange}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select option</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                        <option value="veteran">Veteran</option>
                        <option value="disability">Person with a Disability</option>
                        <option value="both">Both</option>
                        <option value="none">Neither</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )
      case 'Experience':
        return (
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Work Experience (Optional)</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Add your relevant work experience. If you add an entry, all fields marked with * are required for that entry.</div>
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
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Education (Optional)</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Add your educational background. If you add an entry, all fields marked with * are required for that entry.</div>
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
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Clubs, Organizations, and Certifications (Optional)</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">If you participated in high school, college, club, or travel team sports please add it here. If you add an entry, all fields marked with * are required for that entry.</div>
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
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">References (Optional)</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Please provide professional or character references. If you add an entry, all fields marked with * are required for that entry.</div>
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
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">How far are you willing to travel for work? All fields marked * are required.</div>
            <div className="space-y-2 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label htmlFor="maxDistance" className="block text-sm font-medium mb-1">Maximum Distance (miles)*</label>
                  <select
                    id="maxDistance"
                    name="maxDistance"
                    value={form.drivingRange.maxDistance}
                    onChange={e => handleDrivingRangeChange('maxDistance', e.target.value)}
                    required
                    className="w-full h-8 sm:h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                    aria-label="Maximum Distance"
                  >
                    <option value="">Select distance...</option>
                    {[10, 15, 20, 25, 30, 35, 40, 45, 50].map(d => (
                      <option key={d} value={String(d)}>{d} miles</option>
                    ))}
                  </select>
                </div>
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
      case 'W-9 Upload':
        return (
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">W-9 Form</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">
              You can either upload a completed W‑9 PDF <span className="font-medium text-foreground">or</span> fill one out in the app. Only one is required before submitting your application.
            </div>
            <div className="space-y-3">
              {form.w9Url ? (
                <div className="bg-muted rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm mb-2">W-9 uploaded successfully.</p>
                  <div className="flex items-center gap-2">
                    <a href={form.w9Url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs sm:text-sm underline">
                      View uploaded W-9 (PDF)
                    </a>
                    <Button type="button" variant="outline" onClick={handleW9Replace} className="h-8">
                      Replace file
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card className="border border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Option 1: Upload your completed W‑9 (PDF)</CardTitle>
                        <p className="text-xs text-muted-foreground">If you already have a signed W‑9, upload it here.</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <input
                          id="w9File"
                          name="w9File"
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setW9File(e.target.files?.[0] ?? null)}
                          className="block w-full text-xs sm:text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                        />
                        <div className="flex items-center gap-2">
                          <Button type="button" onClick={handleW9Upload} disabled={!w9File || isUploadingW9} className="h-8 sm:h-10">
                            {isUploadingW9 ? 'Uploading…' : 'Upload selected PDF'}
                          </Button>
                          <div className="text-[11px] text-muted-foreground">PDF only, up to 10MB</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border border-dashed border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Option 2: Fill out a W‑9 in the app</CardTitle>
                        <p className="text-xs text-muted-foreground">We’ll generate a PDF for you to review and attach.</p>
                      </CardHeader>
                      <CardContent>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setW9ModalOpen(true)}
                          disabled={isUploadingW9}
                          className="w-full sm:w-auto h-8 sm:h-10"
                        >
                          Open W‑9 form
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                  {w9Error && (
                    <p className="text-destructive text-xs mt-1">{w9Error}</p>
                  )}
                </>
              )}
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                You only need one W‑9 attached. Your document is stored securely and only accessible to authorized administrators.
              </p>
              {/* In-app W-9 form modal */}
              <W9Form
                open={w9ModalOpen}
                onOpenChange={setW9ModalOpen}
                onGenerated={handleW9GenerateAndAttach}
              />
            </div>
          </section>
        )
      case 'Review & Submit':
        return (
          <section className="bg-card rounded-xl shadow-md p-1 sm:p-6 mb-1 sm:mb-8">
            <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-2">Review Your Application</h2>
            <div className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">Please review all your information before submitting your application.</div>
            
            {/* Show completion status */}
            {renderCompletionSummary()}
            
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
                <h3 className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">W-9</h3>
                {form.w9Url ? (
                  <a href={form.w9Url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    View uploaded W-9 (PDF)
                  </a>
                ) : (
                  <div className="text-amber-600">Not uploaded</div>
                )}
              </div>
              
              <div className="p-2 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">Driving Range & Service Area</h3>
                <div>Maximum Distance: {form.drivingRange.maxDistance}</div>
                <div>Willing to travel outside area: {form.drivingRange.willTravelOutside === 'yes' ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </section>
        )
      default:
        return null
    }
  }

  // Function to check if a step is completed
  const isStepCompleted = (stepIndex: number): boolean => {
    const stepName = steps[stepIndex];
    return validateStep(stepName);
  };
  
  // Update all step completion statuses
  useEffect(() => {
    const newCompletionStatus = steps.map((_, i) => isStepCompleted(i));
    setStepsCompleted(newCompletionStatus);
  }, [form, stepIndex]);
  
  // Calculate overall progress
  const overallProgress = Math.round((stepsCompleted.filter(Boolean).length / steps.length) * 100);

  // Update the handle step click function
  const handleStepClick = (index: number) => {
    // If moving forward from the current step, validate the current step first
    if (index > stepIndex) {
      if (!validateStep(step)) {
        setTouched((prev) => ({ 
          ...prev, 
          ...fieldsForStep(step).reduce((acc, f) => ({ ...acc, [f]: true }), {}) 
        }));
        setTimeout(scrollToFirstError, 100);
        // Optionally, prevent navigation if current step is invalid and trying to move forward
        // For now, we allow navigation but highlight errors.
        // If strict prevention is desired, add: return; 
      }
    }

    // Update visited steps
    setVisitedSteps(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    // Navigate to the selected step
    setStepIndex(index);
  };

  if (!userLoaded || appStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground">Loading application data...</p>
        </div>
      </div>
    )
  }

  if (appCheckError) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{appCheckError}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (appStatus === 'pending') {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Application Under Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Your application is currently being reviewed by our team.</p>
            <p className="text-muted-foreground">We'll notify you once a decision has been made. Thank you for your patience.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (appStatus === 'approved') {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>Approved</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your contractor application has been approved. You may now access all contractor features.</p>
            <Button className="mt-6" onClick={() => router.push('/dashboard/contractor')}>
              Go to Contractor Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span>Application Submitted</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Thank you for applying to become a contractor with Borkin Industries!</p>
            <p>Your application is now under review. We'll notify you once our team has made a decision.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-12rem)]">
      {/* Stepper: horizontal on mobile, vertical sidebar on desktop */}
      <nav className="md:hidden w-full bg-background border-b py-2 flex overflow-x-auto whitespace-nowrap h-16 sticky top-0 z-10">
        {steps.map((s, i) => (
          <button 
            key={s}
            type="button"
            onClick={() => handleStepClick(i)}
            className={`flex flex-col items-center justify-center min-w-[14%] flex-1 cursor-pointer
              ${i === stepIndex
                ? 'text-primary font-semibold' // Current step
                : stepsCompleted[i]
                  ? 'text-green-600' // Completed step
                  : visitedSteps[i]
                    ? 'text-amber-600' // Visited but not completed
                    : 'text-muted-foreground/50' // Not visited
              }`}
          >
            <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2
              ${stepsCompleted[i]
                ? 'border-green-600 bg-green-600 text-white' // Completed
                : i === stepIndex
                  ? 'border-primary' // Current
                  : visitedSteps[i]
                    ? 'border-amber-500' // Visited but not completed
                    : 'border-muted-foreground/50' // Not visited
              }`}
            >
              {stepsCompleted[i] ? <Check className="h-3 w-3" /> : <span className="text-xs">{i + 1}</span>}
            </div>
            <span className="text-[10px] text-center mt-1 leading-tight px-0.5 truncate w-full">{s}</span>
          </button>
        ))}
      </nav>
      
      {/* Desktop: vertical sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 py-8 pr-6 bg-background border-r">
        <div className="sticky top-24">
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">APPLICATION PROGRESS</h2>
              <span className="text-sm font-medium">{overallProgress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all" 
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Completion Summary in Sidebar */}
          <div className="px-4 mb-6">
            {renderCompletionSummary()}
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-4">APPLICATION STEPS</h2>
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <button 
                key={s}
                type="button"
                onClick={() => handleStepClick(i)}
                className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded-md transition-colors cursor-pointer
                  ${i === stepIndex
                    ? 'bg-primary/10 text-primary font-medium' // Current step
                    : stepsCompleted[i]
                      ? 'text-green-600 hover:bg-green-50' // Completed step
                      : visitedSteps[i]
                        ? 'text-amber-600 hover:bg-amber-50/30' // Visited but not completed
                        : 'text-muted-foreground hover:bg-muted' // Not visited or default
                  }`}
              >
                <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2
                  ${stepsCompleted[i]
                    ? 'border-green-600 bg-green-600 text-white' // Completed
                    : i === stepIndex
                      ? 'border-primary' // Current
                      : visitedSteps[i]
                        ? 'border-amber-500' // Visited but not completed
                        : 'border-muted-foreground/50' // Not visited
                  }`}
                >
                  {stepsCompleted[i] ? <Check className="h-3 w-3" /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <span>{s}</span>
                {visitedSteps[i] && i !== stepIndex && (
                  <div className="ml-auto flex items-center">
                    {stepsCompleted[i] ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                )}
              </button>
            ))}
          </ol>
          <div className="mt-8 px-4">
            <div className="text-xs text-muted-foreground space-y-2">
              <p>Need help with your application?</p>
              <p>Contact our support team:</p>
              <p className="font-medium text-foreground">support@borkin.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main form area: responsive max-widths */}
      <main className="flex-1 py-6 px-4 md:px-8 overflow-y-auto">
        <form id="contractorApplication" onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{step}</h1>
            <div className="flex items-center mt-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden flex-1 mr-2">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-muted-foreground">Step {stepIndex + 1} of {steps.length}</span>
            </div>
          </div>

          <div className="space-y-6">
            {renderStep()}
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
          
          {/* Form navigation */}
          <div className="sticky bottom-0 mt-8 py-4 bg-background border-t flex justify-between items-center gap-4">
            {stepIndex > 0 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <div className="hidden md:block flex-1 px-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>Overall completion</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
            {step !== 'Review & Submit' ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <div className="flex flex-col items-end">
                {!stepsCompleted.every(Boolean) && (
                  <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Complete all sections to submit</span>
                  </p>
                )}
                <Button 
                  type="submit" 
                  form="contractorApplication" 
                  disabled={isPending || !stepsCompleted.every(Boolean)} 
                  className={`${stepsCompleted.every(Boolean) 
                    ? 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all py-2.5 px-5 text-base' 
                    : 'bg-muted text-muted-foreground'}`}
                >
                  {isPending ? 'Submitting...' : stepsCompleted.every(Boolean) 
                    ? 'Submit Application' 
                    : 'Complete All Sections to Submit'}
                </Button>
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  )
} 