"use client"
import { useEffect, useState, useCallback } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Label } from "@/components/ui/label"
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getContractorProfile, updateContractorProfile, getContractorServiceOfferings } from '@/lib/firebase/contractors'
import { getContractorCoupons } from '@/lib/firebase/coupons'
import dynamic from 'next/dynamic'
import type { ContractorServiceOffering, PlatformService } from '@/types/service';
import type { Contractor, ContractorApplication, Availability, PaymentInfo, WorkHistory, Rating } from '@/types/contractor';
import type { Coupon } from '@/types/coupon';
import { ContractorProfileServiceManager } from './components/contractor-profile-service-manager';
import { getAllPlatformServices } from '@/lib/firebase/services'
import { PhotoUpload } from '@/components/PhotoUpload'
import { MapPin, Phone, Mail, Edit3, Save, X, Star, Award, Calendar, Clock, Tag, Copy } from 'lucide-react'


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
  const [coupons, setCoupons] = useState<Coupon[]>([]);
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
    
    // Load each piece of data individually to handle failures gracefully
    const loadProfileData = async () => {
      try {
        // Load profile data
        let profile = null;
        try {
          profile = await getContractorProfile(user.id);
        } catch (err) {
          console.warn('Failed to load contractor profile:', err);
        }

        // Load service offerings
        let offerings: ContractorServiceOffering[] = [];
        try {
          offerings = await getContractorServiceOfferings(user.id);
        } catch (err) {
          console.warn('Failed to load service offerings:', err);
        }

        // Load platform services
        let platformServices: PlatformService[] = [];
        try {
          platformServices = await getAllPlatformServices();
        } catch (err) {
          console.warn('Failed to load platform services:', err);
        }

        // Load coupons
        let contractorCoupons: Coupon[] = [];
        try {
          contractorCoupons = await getContractorCoupons(user.id);
        } catch (err) {
          console.warn('Failed to load contractor coupons:', err);
        }

        // Set profile data
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
        setCoupons(contractorCoupons || []);
      } catch (err) {
        console.error("Failed to load profile data:", err);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here if you have a toast system
  }

  if (!isLoaded || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60">
              <div className="flex flex-col items-center space-y-4">
                <div className="h-32 w-32 bg-slate-200 rounded-full"></div>
                <div className="h-6 bg-slate-200 rounded w-48"></div>
                <div className="h-4 bg-slate-200 rounded w-32"></div>
              </div>
              <div className="mt-8 space-y-4">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Your Profile
                  </h1>
                  <p className="text-slate-600 mt-1">
                    Manage your professional information and services
                  </p>
                </div>
                <Button 
                  onClick={() => setEditing(true)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 py-2 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Profile Hero Card */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-xl">
                    <AvatarImage 
                      src={form.profileImage} 
                      alt={form.name} 
                      objectPosition="center"
                      className="object-cover"
                    />
                    <AvatarFallback className="text-5xl bg-primary/10 text-primary font-bold">
                      {form.name ? form.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Rating Badge */}
                  {form.ratings && form.ratings.length > 0 && (
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border-2 border-primary/20">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold text-slate-700">
                          {(form.ratings.reduce((sum, r) => sum + r.rating, 0) / form.ratings.length).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                    {form.name || 'Your Name'}
                  </h2>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{form.email}</span>
                    </div>
                    
                    {form.phone && (
                      <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{form.phone}</span>
                      </div>
                    )}
                    
                    {(form.city || form.state) && (
                      <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">
                          {[form.city, form.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    
                    {form.drivingRange && (
                      <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600">
                        <Award className="w-4 h-4" />
                        <span className="text-sm">Service Range: {form.drivingRange}</span>
            </div>
                    )}
            </div>

                  {/* Skills/Experience Badges */}
                  {form.veterinarySkills && form.veterinarySkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {form.veterinarySkills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-full px-3 py-1">
                          {skill}
                        </Badge>
                      ))}
                      {form.veterinarySkills.length > 4 && (
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          +{form.veterinarySkills.length - 4} more
                        </Badge>
                      )}
                    </div>
                )}
                </div>
              </div>
            </div>
          </Card>

          {/* About Section */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full"></div>
                About Me
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {form.bio || 'No bio provided yet. Click "Edit Profile" to add information about your experience and approach to pet care.'}
              </p>
            </CardContent>
          </Card>

          {/* Location & Contact */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full"></div>
                <MapPin className="w-5 h-5" />
                Location & Service Area
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.address && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-slate-500 text-xs uppercase tracking-wide">Address</Label>
                      <p className="text-slate-900 font-medium">
                        {`${form.address}, ${form.city}, ${form.state} ${form.postalCode}`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs uppercase tracking-wide">Service Range</Label>
                      <p className="text-slate-900 font-medium">{form.drivingRange || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {form.locationLat && form.locationLng && (
                <div className="w-full h-80 rounded-xl overflow-hidden border-2 border-slate-200/60 shadow-sm">
                  <MapWithCircle lat={form.locationLat} lng={form.locationLng} miles={getDrivingRangeMiles()} />
                </div>
              )}
          </CardContent>
        </Card>
        


          {/* Service Manager */}
        {renderServiceManager()}

        {/* Available Coupons */}
        {coupons.length > 0 && (
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <div className="w-2 h-6 bg-green-500 rounded-full"></div>
                <Tag className="w-5 h-5" />
                Available Coupons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-slate-600 text-sm">
                  These are the active coupons available for your clients. Share these codes with clients to offer discounts.
                </p>
                <div className="grid gap-4">
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-green-800">{coupon.name}</h4>
                            <Badge variant="outline" className="font-mono text-sm">
                              {coupon.code}
                            </Badge>
                            <Button
                              variant="outline"
                              onClick={() => copyToClipboard(coupon.code)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          {coupon.description && (
                            <p className="text-sm text-green-700 mb-2">{coupon.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-green-600">
                            <span>
                              {coupon.type === 'fixed_price' 
                                ? `$${(coupon.value / 100).toFixed(2)} per day`
                                : `${coupon.value}% off`
                              }
                            </span>
                            {coupon.expirationDate && (
                              <span>Expires: {new Date(coupon.expirationDate).toLocaleDateString()}</span>
                            )}
                            <span>Used {coupon.usageCount} times</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    )
  }

  // Edit Mode
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Edit Profile
                </h1>
                <p className="text-slate-600 mt-1">
                  Update your professional information
                </p>
                         </div>
              <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { 
                  setForm(originalForm); 
                  setEditing(false); 
                  setError(null); 
                  setSuccess(false); 
                }}
                  className="rounded-xl px-4 py-2 border-2 hover:bg-slate-50 transition-all duration-200"
              >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
              </Button>
                <Button 
                  type="submit" 
                  form="contractorProfileForm"
                  disabled={saving || !formValid}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 py-2 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
              </div>
            </div>
          </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form id="contractorProfileForm" onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-slate-900">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-32 h-32 border-4 border-slate-200 shadow-lg">
                  <AvatarImage 
                    src={form.profileImage} 
                    alt={form.name} 
                    objectPosition="center"
                    className="object-cover"
                  />
                  <AvatarFallback className="text-4xl bg-slate-100 text-slate-600">
                    {form.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="w-full max-w-sm">
                  <PhotoUpload
                    label="Profile Picture"
                    storagePath={`contractor-avatars/${user?.id || 'unknown'}`}
                    initialUrl={form.profileImage}
                    onUpload={url => setForm(prev => ({ ...prev, profileImage: url }))}
                    disabled={saving}
                    enableCropping={true}
                    aspectRatio={1}
                    previewSize="lg"
                    quality={0.9}
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Full Name *</Label>
                  <Input 
                    id="name"
                    name="name" 
                    value={form.name} 
                    onChange={handleChange}
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">Phone Number</Label>
                  <Input 
                    id="phone"
                    name="phone" 
                    value={form.phone} 
                    onChange={handleChange}
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-semibold text-slate-700">Professional Bio</Label>
                <Textarea
                  id="bio"
                  name="bio" 
                  value={form.bio || ''} 
                  onChange={handleChange} 
                  rows={4} 
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 resize-none"
                  placeholder="Tell clients about your experience, approach to pet care, and what makes you special..."
                />
                     </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-slate-900">Location & Service Area</CardTitle>
                 </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-slate-700">Street Address</Label>
                <Input 
                  id="address"
                  name="address" 
                  value={form.address} 
                  onChange={handleChange}
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-semibold text-slate-700">City</Label>
                  <Input 
                    id="city"
                    name="city" 
                    value={form.city} 
                    onChange={handleChange}
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="Miami"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-semibold text-slate-700">State</Label>
                  <Input 
                    id="state"
                    name="state" 
                    value={form.state} 
                    onChange={handleChange}
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="FL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-sm font-semibold text-slate-700">ZIP Code</Label>
                  <Input 
                    id="postalCode"
                    name="postalCode" 
                    value={form.postalCode} 
                    onChange={handleChange}
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="33101"
                  />
                     </div>
                             </div>

              <div className="space-y-2">
                <Label htmlFor="drivingRange" className="text-sm font-semibold text-slate-700">Service Range</Label>
                <Input 
                  id="drivingRange"
                  name="drivingRange" 
                  value={form.drivingRange} 
                  onChange={handleChange}
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  placeholder="e.g., 15 miles, 30 minutes drive"
                />
                     </div>
                 </CardContent>
             </Card>
             


          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 text-sm font-medium">Error: {error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 text-sm font-medium">Profile updated successfully!</p>
            </div>
          )}
        </form>

        {/* Service Manager */}
        <div className="mt-8">
             {renderServiceManager()}
        </div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
             </div>
         </div>
  )
} 