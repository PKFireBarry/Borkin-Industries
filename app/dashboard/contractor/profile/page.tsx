"use client"
import { useEffect, useState, useCallback } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Label } from "@/components/ui/label"
import { getContractorProfile, updateContractorProfile, getContractorServiceOfferings } from '@/lib/firebase/contractors'
import dynamic from 'next/dynamic'
import type { ContractorServiceOffering, PlatformService } from '@/types/service';
import type { Contractor, ContractorApplication, Availability, PaymentInfo, WorkHistory, Rating } from '@/types/contractor';
import { ContractorProfileServiceManager } from './components/contractor-profile-service-manager';
import { getAllPlatformServices } from '@/lib/firebase/services'

const MOCK_PLATFORM_SERVICES: PlatformService[] = [
  { id: "ps_1", name: "Dog Walking (30 mins)", description: "A 30-minute walk for your dog." },
  { id: "ps_2", name: "Pet Sitting (per hour)", description: "In-home pet sitting, billed hourly." },
  { id: "ps_3", name: "Medication Administration", description: "Administering prescribed medication." },
  { id: "ps_4", name: "Nail Trim", description: "Professional nail trimming service." },
];

const VETERINARY_SKILLS = [
  'Dog Walking',
  'Cat Sitting',
  'Medication Administration',
  'Grooming',
  'Vet Tech Procedures',
  'Exotic Pets',
  'Emergency Care',
]

const MapWithCircle = dynamic(() => import('@/components/contractor-map'), { ssr: false })

const initialContractorFormState: Omit<Contractor, 'serviceOfferings'> = {
  id: '',
  name: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  phone: '',
  email: '',
  profileImage: '',
  veterinarySkills: [],
  experience: '',
  certifications: [''],
  references: [''],
  education: '',
  drivingRange: '',
  locationLat: undefined,
  locationLng: undefined,
  bio: '',
  application: {} as ContractorApplication, // Initialize with a typed empty object or undefined
  availability: {} as Availability,
  paymentInfo: [],
  workHistory: [],
  ratings: [],
  stripeAccountId: undefined,
};

export default function ContractorProfilePage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [form, setForm] = useState<Omit<Contractor, 'serviceOfferings'>>(initialContractorFormState);
  const [originalForm, setOriginalForm] = useState<Omit<Contractor, 'serviceOfferings'>>(initialContractorFormState);
  const [serviceOfferings, setServiceOfferings] = useState<ContractorServiceOffering[]>([]);
  const [platformServices, setPlatformServices] = useState<PlatformService[]>([]);
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formValid, setFormValid] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null);
    Promise.all([
        getContractorProfile(user.id),
        getContractorServiceOfferings(user.id),
        getAllPlatformServices()
    ]).then(([profile, offerings, platformServices]) => {
        if (profile) {
          const profileData: Omit<Contractor, 'serviceOfferings'> = {
            id: profile.id || '',
            name: profile.name || '',
            address: profile.address || '',
            city: profile.city || '',
            state: profile.state || '',
            postalCode: profile.postalCode || '',
            phone: profile.phone || '',
            email: profile.email || user.primaryEmailAddress?.emailAddress || '',
            profileImage: profile.profileImage || '',
            veterinarySkills: profile.veterinarySkills || [],
            experience: profile.experience || '',
            certifications: profile.certifications?.length ? profile.certifications.filter(c => c) : [''],
            references: profile.references?.length ? profile.references.filter(r => r) : [''],
            education: profile.education || '',
            drivingRange: profile.drivingRange || '',
            locationLat: profile.locationLat,
            locationLng: profile.locationLng,
            bio: profile.bio || '',
            application: profile.application || ({} as ContractorApplication),
            availability: profile.availability || ({} as Availability),
            paymentInfo: profile.paymentInfo || [],
            workHistory: profile.workHistory || [],
            ratings: profile.ratings || [],
            stripeAccountId: profile.stripeAccountId,
          };
          setForm(profileData);
          setOriginalForm(profileData);
        } else {
            const baseForm = {...initialContractorFormState, id: user.id, email: user.primaryEmailAddress?.emailAddress || ''};
            setForm(baseForm);
            setOriginalForm(baseForm);
        }
        setServiceOfferings(offerings || []);
        setPlatformServices(platformServices || []);
    }).catch((err) => {
        console.error("Failed to load profile or services:", err);
        setError('Failed to load profile data.')
    }).finally(() => {
        setLoading(false)
    })
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear any previous errors when user makes changes
    if (error) setError(null);
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
      const arr = [...prev[field]!]; // Added non-null assertion as these fields are initialized
      arr[idx] = value
      return { ...prev, [field]: arr }
    })
  }

  const handleAddListItem = (field: 'certifications' | 'references') => {
    setForm((prev) => ({ ...prev, [field]: [...(prev[field]!), ''] })) // Added non-null assertion
  }

  const handleRemoveListItem = (field: 'certifications' | 'references', idx: number) => {
    setForm((prev) => {
      const arr = [...(prev[field]!)] // Added non-null assertion
      arr.splice(idx, 1)
      return { ...prev, [field]: arr.length ? arr : [''] }
    })
  }

  // Validate form to ensure required fields are filled
  const validateForm = () => {
    const requiredFields = ['name', 'phone'];
    const isValid = requiredFields.every(field => form[field as keyof typeof form]?.toString().trim());
    setFormValid(isValid);
    return isValid;
  };
  
  // Validate form on any form state change
  useEffect(() => {
    if (editing) {
      validateForm();
    }
  }, [form, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit attempt - Form state:', { formValid, saving });
    
    // Validate form on submission
    if (!validateForm()) {
      console.log('Form validation failed');
      setError("Please fill in all required fields.");
      return;
    }
    
    if (!user) {
      console.log('No user found');
      setError("User not found. Please sign in again.");
      return;
    }
    
    console.log('Starting submission process');
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const profileUpdatePayload: Partial<Omit<Contractor, 'serviceOfferings'>> = { 
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        phone: form.phone,
        profileImage: form.profileImage,
        bio: form.bio,
        veterinarySkills: form.veterinarySkills,
        experience: form.experience,
        certifications: form.certifications?.filter(c => c && c.trim() !== ''),
        references: form.references?.filter(r => r && r.trim() !== ''),
        education: form.education,
        drivingRange: form.drivingRange,
        locationLat: form.locationLat,
        locationLng: form.locationLng,
      };
      
      console.log('Profile payload prepared:', profileUpdatePayload);
      await updateContractorProfile(user.id, profileUpdatePayload);
      console.log('Profile update successful');
      
      const updatedOriginalForm = { ...originalForm, ...profileUpdatePayload };
      setOriginalForm(updatedOriginalForm);
      setForm(updatedOriginalForm);
      setSuccess(true);
      setEditing(false); 
    } catch (err) {
      console.error("Profile update detailed error:", err);
      setError(err instanceof Error ? err.message : 'Failed to update profile. Please check console for details.');
    } finally {
      console.log('Submit process complete, setting saving to false');
      setSaving(false);
    }
  }

  const geocodeLocation = useCallback(async () => {
    const query = [form.address, form.city, form.state].filter(Boolean).join(', ')
    if (!query || !editing) return; // Only geocode if address fields change during editing
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data && data[0]) {
        setForm(f => ({ ...f, locationLat: parseFloat(data[0].lat), locationLng: parseFloat(data[0].lon) }))
      }
    } catch (e) { console.error("Geocoding error:", e); }
  }, [form.address, form.city, form.state, editing])

  useEffect(() => {
    if(editing) {
        geocodeLocation();
    }
  }, [form.address, form.city, form.state, editing, geocodeLocation])

  const getDrivingRangeMiles = () => {
    const match = form.drivingRange?.match(/(\d+(?:\.\d+)?)/) // Added optional chaining
    return match ? parseFloat(match[1]) : 10
  }

  if (!isLoaded || !isAuthorized ) return <div className="p-8 text-center text-muted-foreground">Authorizing...</div>
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>

  const renderServiceManager = () => {
    if (!user) return null;
    return (
        <ContractorProfileServiceManager 
            contractorId={user.id}
            currentOfferings={serviceOfferings} 
            platformServices={platformServices}
            isEditing={editing}
        />
    );
  };

  if (!editing) {
    return (
      <section className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Contractor Profile</h1>
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex flex-col items-center mb-4">
                <Avatar className="h-32 w-32 mb-4 border-2 border-primary">
                    {form.profileImage ? (
                    <AvatarImage src={form.profileImage} alt={form.name} className="object-cover"/>
                    ) : (
                    <AvatarFallback className="text-4xl">{form.name ? form.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                    )}
                </Avatar>
                <CardTitle className="text-2xl">{form.name}</CardTitle>
                <p className="text-muted-foreground">{form.email}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 divide-y divide-gray-200">
            <div className="pt-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">About Me</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{form.bio || 'No bio provided.'}</p>
            </div>
            <div className="pt-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Location & Contact</h3>
                <p><strong>Address:</strong> {`${form.address}, ${form.city}, ${form.state} ${form.postalCode}`}</p>
                <p><strong>Phone:</strong> {form.phone}</p>
                <p><strong>Driving Range:</strong> {form.drivingRange || 'N/A'}</p>
                {form.locationLat && form.locationLng && (
                    <div className="w-full h-64 mt-4 rounded-md overflow-hidden">
                    <MapWithCircle lat={form.locationLat} lng={form.locationLng} miles={getDrivingRangeMiles()} />
                    </div>
                )}
            </div>
             <div className="pt-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Skills & Experience</h3>
                <p><strong>Education:</strong> {form.education || 'N/A'}</p>
                <p><strong>Experience:</strong> {form.experience || 'N/A'}</p>
                <div><strong>Veterinary Skills:</strong> {form.veterinarySkills && form.veterinarySkills.length > 0 ? form.veterinarySkills.join(', ') : <span className="text-muted-foreground">No skills listed.</span>}</div>
            </div>
            <div className="pt-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Credentials</h3>
                <div>
                    <strong>Certifications:</strong>
                    {form.certifications && form.certifications.filter(c => c && c.trim() !== '').length > 0 ? (
                        <ul className="list-disc pl-5 mt-1">
                        {form.certifications.filter(c => c && c.trim() !== '').map((cert, idx) => <li key={idx}>{cert}</li>)}
                        </ul>
                    ) : <span className="text-muted-foreground"> No certifications listed.</span>}
                </div>
                <div className="mt-2">
                    <strong>References:</strong>
                    {form.references && form.references.filter(r => r && r.trim() !== '').length > 0 ? (
                        <ul className="list-disc pl-5 mt-1">
                        {form.references.filter(r => r && r.trim() !== '').map((ref, idx) => <li key={idx}>{ref}</li>)}
                        </ul>
                    ) : <span className="text-muted-foreground"> No references listed.</span>}
                </div>
            </div>
          </CardContent>
        </Card>
        
        {renderServiceManager()}

        <Button type="button" className="mt-8 w-full py-3 text-lg" onClick={() => setEditing(true)}>Edit Profile</Button>
      </section>
    )
  }
  return (
    <section className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Contractor Profile</h1>
      {editing ? (
        <>
          <form id="contractorProfileForm" onSubmit={handleSubmit} className="space-y-6 mb-8" aria-label="Update main contractor profile">
             <Card>
                  <CardHeader><CardTitle>Edit Basic Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                       <div><Label>Name</Label><Input name="name" value={form.name} onChange={handleChange} /></div>
                       <div><Label>Phone</Label><Input name="phone" value={form.phone} onChange={handleChange} /></div>
                       <div><Label>Bio</Label><textarea name="bio" value={form.bio || ''} onChange={handleChange} rows={4} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" placeholder="Tell clients a bit about yourself and your experience."></textarea></div>
                  </CardContent>
              </Card>
             <Card>
                  <CardHeader><CardTitle>Edit Location</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                       <div><Label>Address</Label><Input name="address" value={form.address} onChange={handleChange} /></div>
                       <div><Label>City</Label><Input name="city" value={form.city} onChange={handleChange} /></div>
                       <div><Label>State</Label><Input name="state" value={form.state} onChange={handleChange} /></div>
                       <div><Label>Postal Code</Label><Input name="postalCode" value={form.postalCode} onChange={handleChange} /></div>
                       <div><Label>Driving Range</Label><Input name="drivingRange" value={form.drivingRange} onChange={handleChange} /></div>
                  </CardContent>
              </Card>
             <Card>
                  <CardHeader><CardTitle>Edit Skills & Experience</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                       <div><Label>Education</Label><Input name="education" value={form.education} onChange={handleChange} /></div>
                       <div><Label>Experience</Label><Input name="experience" value={form.experience} onChange={handleChange} /></div>
                       <div><Label>Veterinary Skills</Label>
                           <div className="flex flex-wrap">
                               {VETERINARY_SKILLS.map((skill) => (
                                   <button
                                       key={skill}
                                       type="button"
                                       onClick={() => handleSkillToggle(skill)}
                                       className={`px-2 py-1 m-1 ${form.veterinarySkills.includes(skill) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                                   >
                                       {skill}
                                   </button>
                               ))}
                           </div>
                       </div>
                  </CardContent>
              </Card>
             <Card>
                  <CardHeader><CardTitle>Edit Credentials</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                       <div><Label>Certifications</Label>
                           <div className="flex flex-wrap">
                               {form.certifications.map((cert, idx) => (
                                   <div key={idx} className="flex items-center space-x-2">
                                       <Input name="certifications" value={cert} onChange={(e) => handleListChange('certifications', idx, e.target.value)} />
                                       <button type="button" onClick={() => handleRemoveListItem('certifications', idx)} className="text-red-500">Remove</button>
                                   </div>
                               ))}
                               <button type="button" onClick={() => handleAddListItem('certifications')} className="text-primary">Add Certification</button>
                           </div>
                       </div>
                       <div><Label>References</Label>
                           <div className="flex flex-wrap">
                               {form.references.map((ref, idx) => (
                                   <div key={idx} className="flex items-center space-x-2">
                                       <Input name="references" value={ref} onChange={(e) => handleListChange('references', idx, e.target.value)} />
                                       <button type="button" onClick={() => handleRemoveListItem('references', idx)} className="text-red-500">Remove</button>
                                   </div>
                               ))}
                               <button type="button" onClick={() => handleAddListItem('references')} className="text-primary">Add Reference</button>
                           </div>
                       </div>
                  </CardContent>
              </Card>
          </form>

          <div className="flex justify-end space-x-2 mt-6 border-t pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { 
                  setForm(originalForm); 
                  setEditing(false); 
                  setError(null); 
                  setSuccess(false); 
                }}
              >
                Cancel Profile Edit
              </Button>
              <div className="relative">
                <Button 
                  type="submit" 
                  form="contractorProfileForm"
                  disabled={saving || !formValid}
                  title={!formValid ? "Please complete required fields" : saving ? "Saving in progress" : "Save your profile changes"}
                  className="relative"
                >
                  {saving ? 'Saving Profile...' : 'Save Profile Changes'}
                </Button>
                {!formValid && (
                  <p className="absolute -bottom-6 right-0 text-xs text-red-500 whitespace-nowrap">
                    Please fill required fields
                  </p>
                )}
              </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">Error: {error}</p>}
          {success && <p className="text-green-500 text-sm mt-2">Profile updated successfully!</p>}

          {renderServiceManager()}
        </>
      ) : (
         <div>
             <Card className="shadow-lg mb-6">
                 <CardHeader className="text-center">
                     <div className="flex flex-col items-center mb-4">
                         <Avatar className="h-32 w-32 mb-4 border-2 border-primary">
                             {form.profileImage ? (
                             <AvatarImage src={form.profileImage} alt={form.name} className="object-cover"/>
                             ) : (
                             <AvatarFallback className="text-4xl">{form.name ? form.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                             )}
                         </Avatar>
                         <CardTitle className="text-2xl">{form.name}</CardTitle>
                         <p className="text-muted-foreground">{form.email}</p>
                     </div>
                 </CardHeader>
                 <CardContent className="space-y-6 divide-y divide-gray-200">
                     <div className="pt-6">
                         <h3 className="text-lg font-semibold mb-2 text-primary">About Me</h3>
                         <p className="text-muted-foreground whitespace-pre-wrap">{form.bio || 'No bio provided.'}</p>
                     </div>
                     <div className="pt-6">
                         <h3 className="text-lg font-semibold mb-2 text-primary">Location & Contact</h3>
                         <p><strong>Address:</strong> {`${form.address}, ${form.city}, ${form.state} ${form.postalCode}`}</p>
                         <p><strong>Phone:</strong> {form.phone}</p>
                         <p><strong>Driving Range:</strong> {form.drivingRange || 'N/A'}</p>
                         {form.locationLat && form.locationLng && (
                             <div className="w-full h-64 mt-4 rounded-md overflow-hidden">
                             <MapWithCircle lat={form.locationLat} lng={form.locationLng} miles={getDrivingRangeMiles()} />
                             </div>
                         )}
                     </div>
                      <div className="pt-6">
                         <h3 className="text-lg font-semibold mb-2 text-primary">Skills & Experience</h3>
                         <p><strong>Education:</strong> {form.education || 'N/A'}</p>
                         <p><strong>Experience:</strong> {form.experience || 'N/A'}</p>
                         <div><strong>Veterinary Skills:</strong> {form.veterinarySkills && form.veterinarySkills.length > 0 ? form.veterinarySkills.join(', ') : <span className="text-muted-foreground">No skills listed.</span>}</div>
                     </div>
                     <div className="pt-6">
                         <h3 className="text-lg font-semibold mb-2 text-primary">Credentials</h3>
                         <div>
                             <strong>Certifications:</strong>
                             {form.certifications && form.certifications.filter(c => c && c.trim() !== '').length > 0 ? (
                                 <ul className="list-disc pl-5 mt-1">
                                 {form.certifications.filter(c => c && c.trim() !== '').map((cert, idx) => <li key={idx}>{cert}</li>)}
                                 </ul>
                             ) : <span className="text-muted-foreground"> No certifications listed.</span>}
                         </div>
                         <div className="mt-2">
                             <strong>References:</strong>
                             {form.references && form.references.filter(r => r && r.trim() !== '').length > 0 ? (
                                 <ul className="list-disc pl-5 mt-1">
                                 {form.references.filter(r => r && r.trim() !== '').map((ref, idx) => <li key={idx}>{ref}</li>)}
                                 </ul>
                             ) : <span className="text-muted-foreground"> No references listed.</span>}
                         </div>
                     </div>
                 </CardContent>
             </Card>
             
             {renderServiceManager()}

             <div className="text-center mt-6">
                 <Button onClick={() => setEditing(true)}>Edit Profile</Button>
             </div>
         </div>
      )}
    </section>
  )
} 