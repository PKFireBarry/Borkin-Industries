"use client"
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getContractorProfile, updateContractorProfile, getContractorServiceOfferings } from '@/lib/firebase/contractors'
import { getContractorCoupons } from '@/lib/firebase/coupons'
import dynamic from 'next/dynamic'
import type { ContractorServiceOffering, PlatformService } from '@/types/service';
import type { Contractor, ContractorApplication, Availability, PaymentInfo, WorkHistory, Rating } from '@/types/contractor';
import type { Coupon } from '@/types/coupon';
import { ContractorProfileServiceManager } from './components/contractor-profile-service-manager';
import { getAllPlatformServices } from '@/lib/firebase/services'
import { PhotoUpload } from '@/components/PhotoUpload'
import { MapPin, Phone, Mail, Edit3, Save, X, Star, Award, Tag, Copy, ChevronLeft, ChevronRight } from 'lucide-react'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../../components/dashboard-shell'
import { RailDots } from '../../components/rail-dots'
import { useRailScroll } from '@/hooks/use-rail-scroll'
import { useSwipeSteps } from '@/hooks/use-swipe-steps'


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

const DEFAULT_DESKTOP_PAGINATION_HEIGHT = 96
const DESKTOP_PROFILE_BOTTOM_BUFFER = 72
const DESKTOP_PROFILE_FIT_SAFETY_BUFFER = 32

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

function ContractorProfilePageContent() {
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [formValid, setFormValid] = useState(true)
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'services' | 'coupons'>('profile')
  const [activeViewStep, setActiveViewStep] = useState(0)
  const [activeEditStep, setActiveEditStep] = useState(0)
  const couponRailContainerRef = useRef<HTMLDivElement | null>(null)
  const couponsSectionRef = useRef<HTMLDivElement | null>(null)
  const firstCouponCardRef = useRef<HTMLDivElement | null>(null)
  const couponDesktopPaginationRef = useRef<HTMLDivElement | null>(null)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [activeCouponDesktopPage, setActiveCouponDesktopPage] = useState(1)
  const [desktopCouponsPerPage, setDesktopCouponsPerPage] = useState(6)
  const [couponDesktopPaginationHeight, setCouponDesktopPaginationHeight] = useState(DEFAULT_DESKTOP_PAGINATION_HEIGHT)
  const [couponDesktopViewportSectionHeight, setCouponDesktopViewportSectionHeight] = useState<number | null>(null)

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

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
      setActiveEditStep(0)
      setEditing(false); 
    } catch (err) {
      console.error("Profile update detailed error:", err);
      setError(err instanceof Error ? err.message : 'Failed to update profile. Please check console for details.');
    } finally {
      console.log('Submit process complete, setting saving to false');
      setSaving(false);
    }
  }

  // Handle avatar upload - save immediately to database
  const handleAvatarUpload = async (url: string) => {
    setIsUploadingAvatar(true)
    setError(null)
    try {
      if (!user) throw new Error('User not found')
      
      // Update local form state
      setForm(prev => ({ ...prev, profileImage: url }))
      
      // Save immediately to database
      await updateContractorProfile(user.id, { profileImage: url })
      
      // Show success message briefly
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to update profile picture')
      console.error('Avatar upload error:', err)
    } finally {
      setIsUploadingAvatar(false)
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

  const viewSections = [
    { id: 'overview', title: 'Overview' },
    { id: 'about', title: 'About' },
    { id: 'location', title: 'Location' },
  ] as const

  const hasCoupons = coupons.length > 0
  const mobileViewSections = viewSections
  const maxViewStep = Math.max(mobileViewSections.length - 1, 0)

  const swipeHandlers = useSwipeSteps({
    step: activeViewStep,
    maxStep: maxViewStep,
    onNext: () => setActiveViewStep((current) => Math.min(current + 1, maxViewStep)),
    onPrevious: () => setActiveViewStep((current) => Math.max(current - 1, 0)),
    maxVerticalDelta: 80,
  })

  const editSections = [
    { id: 'basic', title: 'Basic Information' },
    { id: 'location', title: 'Location & Service Area' },
  ] as const

  const profileDesktopEditSections = [
    { id: 'basic', title: 'Basic Information' },
    { id: 'location', title: 'Location & Service Area' },
  ] as const

  const maxEditStep = Math.max(editSections.length - 1, 0)

  const editSwipeHandlers = useSwipeSteps({
    step: activeEditStep,
    maxStep: maxEditStep,
    onNext: () => setActiveEditStep((current) => Math.min(current + 1, maxEditStep)),
    onPrevious: () => setActiveEditStep((current) => Math.max(current - 1, 0)),
    maxVerticalDelta: 80,
  })

  const { railRef: couponRailRef, clampedDotIndex: couponRailDotIndex, onScroll: handleCouponRailScroll } = useRailScroll({
    slideSelector: '[data-contractor-coupon-slide="true"]',
    itemCount: coupons.length,
  })

  const couponDesktopPageCount = Math.max(1, Math.ceil(coupons.length / desktopCouponsPerPage))
  const visibleCoupons = isDesktopViewport
    ? coupons.slice((activeCouponDesktopPage - 1) * desktopCouponsPerPage, activeCouponDesktopPage * desktopCouponsPerPage)
    : coupons

  useEffect(() => {
    setActiveCouponDesktopPage(1)
  }, [coupons.length])

  useEffect(() => {
    if (activeCouponDesktopPage > couponDesktopPageCount) {
      setActiveCouponDesktopPage(couponDesktopPageCount)
    }
  }, [activeCouponDesktopPage, couponDesktopPageCount])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 639px)')

    const updateCouponRailCardHeight = () => {
      if (!mediaQuery.matches) {
        couponRailContainerRef.current?.style.removeProperty('--coupon-rail-card-height')
        return
      }

      const railContainer = couponRailContainerRef.current
      if (!railContainer) return

      const topOffset = railContainer.getBoundingClientRect().top
      const dotsAndBottomSpacing = 28
      const nextCardHeight = Math.max(260, window.innerHeight - topOffset - dotsAndBottomSpacing)

      railContainer.style.setProperty('--coupon-rail-card-height', `${nextCardHeight}px`)
    }

    const frameId = window.requestAnimationFrame(updateCouponRailCardHeight)
    window.addEventListener('resize', updateCouponRailCardHeight)
    mediaQuery.addEventListener('change', updateCouponRailCardHeight)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateCouponRailCardHeight)
      mediaQuery.removeEventListener('change', updateCouponRailCardHeight)
    }
  }, [coupons.length])

  useEffect(() => {
    if (!isDesktopViewport) {
      setCouponDesktopViewportSectionHeight(null)
      return
    }

    const updateDesktopCouponsPerPage = () => {
      const sectionTop = couponsSectionRef.current?.getBoundingClientRect().top
      const firstCardHeight = firstCouponCardRef.current?.getBoundingClientRect().height
      const paginationHeight = couponDesktopPaginationRef.current?.getBoundingClientRect().height

      if (typeof sectionTop !== 'number') return

      const sectionHeight = Math.max(0, window.innerHeight - sectionTop - DESKTOP_PROFILE_BOTTOM_BUFFER)
      setCouponDesktopViewportSectionHeight((previousHeight) => (previousHeight === sectionHeight ? previousHeight : sectionHeight))

      if (typeof paginationHeight === 'number') {
        setCouponDesktopPaginationHeight((previousHeight) => (previousHeight === paginationHeight ? previousHeight : paginationHeight))
      }

      if (typeof firstCardHeight !== 'number') return

      const gridGap = 16
      const availableHeight = Math.max(0, sectionHeight - couponDesktopPaginationHeight - DESKTOP_PROFILE_FIT_SAFETY_BUFFER)
      const visibleRows = Math.max(1, Math.floor((availableHeight + gridGap) / (firstCardHeight + gridGap)))
      const desktopColumns = window.innerWidth >= 1536 ? 4 : window.innerWidth >= 1280 ? 3 : 2
      const maxRows = window.innerWidth >= 1536 ? 2 : 2
      const nextPageSize = Math.max(desktopColumns, Math.min(visibleRows, maxRows) * desktopColumns)

      setDesktopCouponsPerPage((previousPageSize) => (previousPageSize === nextPageSize ? previousPageSize : nextPageSize))
    }

    const frameId = window.requestAnimationFrame(updateDesktopCouponsPerPage)
    window.addEventListener('resize', updateDesktopCouponsPerPage)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateDesktopCouponsPerPage)
    }
  }, [activeCouponDesktopPage, couponDesktopPaginationHeight, coupons.length, isDesktopViewport])

  if (!isLoaded || !isAuthorized) {
    return (
      <DashboardPageShell className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-medium text-slate-600">Loading your profile...</p>
        </div>
      </DashboardPageShell>
    )
  }

  if (loading) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
        <DashboardPageContent className="space-y-6 pb-8 pt-5 sm:space-y-8 lg:pb-12">
          <DashboardPageHeader
            variant="summary"
            title="Your Profile"
            description="Manage your professional information, service area, and client-facing details."
            eyebrow={
              <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                Contractor profile
              </Badge>
            }
          />
          <div className="animate-pulse space-y-8">
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
        </DashboardPageContent>
      </DashboardPageShell>
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

  const renderCouponsView = () => {
    if (!hasCoupons) {
      return (
        <Card className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No active coupons available right now.
          </CardContent>
        </Card>
      )
    }

    return (
      <div
        ref={couponsSectionRef}
        className="flex flex-col gap-4"
        style={isDesktopViewport && couponDesktopViewportSectionHeight ? { minHeight: `${couponDesktopViewportSectionHeight}px` } : undefined}
      >
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Available Coupons</h3>
              <p className="mt-1 text-xs text-slate-600">Share these active discounts with clients.</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {coupons.length} coupons
            </div>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0">
          <div
            ref={(node) => {
              couponRailContainerRef.current = node
              couponRailRef.current = node
            }}
            onScroll={handleCouponRailScroll}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[8vw] pl-[8vw] pr-[8vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pl-0 sm:pr-0 lg:grid-cols-3 2xl:grid-cols-4"
          >
            {visibleCoupons.map((coupon, index) => (
              <div
                key={coupon.id}
                ref={index === 0 ? firstCouponCardRef : undefined}
                data-contractor-coupon-slide="true"
                className="block w-[calc(100vw-3rem)] min-w-[calc(100vw-3rem)] max-w-none shrink-0 snap-center snap-always sm:w-auto sm:min-w-0 sm:max-w-none"
              >
                <Card className="flex h-full rounded-[1.5rem] border border-green-200 bg-white shadow-sm">
                  <CardContent className="flex h-[var(--coupon-rail-card-height,21rem)] min-h-[12.5rem] flex-1 flex-col gap-3 p-4 sm:h-full sm:p-4">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3 min-h-[2.75rem]">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-base font-semibold text-green-800">{coupon.name}</p>
                          <p className="mt-1 text-xs text-green-700">Active client offer</p>
                        </div>
                        <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-green-500"></div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 min-h-[2rem]">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {coupon.code}
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(coupon.code)}
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="min-h-[3.25rem]">
                        {coupon.description ? (
                          <p className="line-clamp-2 text-sm leading-6 text-green-700">{coupon.description}</p>
                        ) : (
                          <p className="text-sm text-green-700">No additional coupon description provided.</p>
                        )}
                      </div>

                      <div className="grid min-h-[4.25rem] grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-green-50 px-3 py-2.5 ring-1 ring-green-200">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-green-700">Discount</div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {coupon.type === 'fixed_price' ? `$${coupon.value.toFixed(2)} per day` : `${coupon.value}% off`}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Usage</div>
                          <div className="mt-1 font-semibold text-slate-900">Used {coupon.usageCount} times</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-slate-200/80 pt-3 text-xs text-slate-500">
                      {coupon.expirationDate ? `Expires ${new Date(coupon.expirationDate).toLocaleDateString()}` : 'No expiration date set'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
        <div className="sm:hidden">
          <RailDots count={visibleCoupons.length} activeIndex={couponRailDotIndex} className="mt-1" />
        </div>

        {isDesktopViewport && coupons.length > desktopCouponsPerPage ? (
          <div
            ref={couponDesktopPaginationRef}
            className="hidden lg:mt-auto lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-[1.35rem] lg:border lg:border-slate-200/80 lg:bg-white/92 lg:px-5 lg:py-4 lg:shadow-lg lg:backdrop-blur"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Page {activeCouponDesktopPage} of {couponDesktopPageCount}</p>
              <p className="text-xs text-slate-500">Showing {visibleCoupons.length} of {coupons.length} coupons</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="pillSm"
                onClick={() => setActiveCouponDesktopPage((prev) => Math.max(prev - 1, 1))}
                disabled={activeCouponDesktopPage === 1}
                className="min-w-[7rem]"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="pillSm"
                onClick={() => setActiveCouponDesktopPage((prev) => Math.min(prev + 1, couponDesktopPageCount))}
                disabled={activeCouponDesktopPage === couponDesktopPageCount}
                className="min-w-[7rem]"
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const renderProfileInfoView = () => (
    <>
      <div className="space-y-4 sm:hidden">
        <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Profile sections</p>
            <p className="text-sm font-semibold text-slate-900">{mobileViewSections[activeViewStep]?.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => setActiveViewStep((current) => Math.max(current - 1, 0))}
              disabled={activeViewStep === 0}
              aria-label="Previous profile section"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => setActiveViewStep((current) => Math.min(current + 1, maxViewStep))}
              disabled={activeViewStep === maxViewStep}
              aria-label="Next profile section"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div {...swipeHandlers} className="overflow-hidden">
          {mobileViewSections[activeViewStep]?.id === 'overview' ? (
            <Card className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-5">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                      <AvatarImage src={form.profileImage} alt={form.name} objectPosition="center" className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-4xl font-bold text-primary">
                        {form.name ? form.name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {form.ratings && form.ratings.length > 0 ? (
                      <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-primary/20 bg-white p-2 shadow-lg">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-slate-700">
                            {(form.ratings.reduce((sum, rating) => sum + rating.rating, 0) / form.ratings.length).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{form.name || 'Your Name'}</h2>
                      <p className="mt-1 text-sm text-slate-600">{serviceOfferings.length} services listed</p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{form.email}</span>
                      </div>
                      {form.phone ? (
                        <div className="flex items-center justify-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{form.phone}</span>
                        </div>
                      ) : null}
                      {form.city || form.state ? (
                        <div className="flex items-center justify-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{[form.city, form.state].filter(Boolean).join(', ')}</span>
                        </div>
                      ) : null}
                      {form.drivingRange ? (
                        <div className="flex items-center justify-center gap-2">
                          <Award className="h-4 w-4" />
                          <span>Service range: {form.drivingRange} miles</span>
                        </div>
                      ) : null}
                    </div>

                    {form.veterinarySkills && form.veterinarySkills.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-2">
                        {form.veterinarySkills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="secondary" className="rounded-full border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                            {skill}
                          </Badge>
                        ))}
                        {form.veterinarySkills.length > 4 ? (
                          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                            +{form.veterinarySkills.length - 4} more
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {mobileViewSections[activeViewStep]?.id === 'about' ? (
            <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <div className="h-6 w-2 rounded-full bg-primary"></div>
                  About Me
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {form.bio || 'No bio provided yet. Click "Edit Profile" to add information about your experience and approach to pet care.'}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {mobileViewSections[activeViewStep]?.id === 'location' ? (
            <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <div className="h-6 w-2 rounded-full bg-primary"></div>
                  <MapPin className="h-5 w-5" />
                  Location & Service Area
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.address ? (
                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div>
                        <Label className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Address</Label>
                        <p className="font-medium text-slate-900">
                          {`${form.address}, ${form.city}, ${form.state} ${form.postalCode}`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Service Range</Label>
                        <p className="font-medium text-slate-900">{form.drivingRange || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {form.locationLat && form.locationLng ? (
                  <div className="h-64 w-full overflow-hidden rounded-[1.25rem] border border-slate-200 shadow-sm">
                    <MapWithCircle lat={form.locationLat} lng={form.locationLng} miles={getDrivingRangeMiles()} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

        </div>
        <RailDots count={mobileViewSections.length} activeIndex={activeViewStep} className="mt-1" />
      </div>

      <div className="hidden h-full min-h-0 flex-col gap-4 sm:flex">
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="min-h-0 pr-1">
            <div className="grid h-full grid-rows-[auto_1fr] gap-4 pb-1">
              <Card className="overflow-hidden rounded-2xl border-0 bg-white/80 shadow-lg backdrop-blur-sm">
                <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8">
                  <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                    <div className="relative">
                      <Avatar className="h-32 w-32 border-4 border-white shadow-xl md:h-40 md:w-40">
                        <AvatarImage src={form.profileImage} alt={form.name} objectPosition="center" className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-5xl font-bold text-primary">
                          {form.name ? form.name.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {form.ratings && form.ratings.length > 0 ? (
                        <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-primary/20 bg-white p-2 shadow-lg">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-bold text-slate-700">
                              {(form.ratings.reduce((sum, rating) => sum + rating.rating, 0) / form.ratings.length).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <h2 className="mb-2 text-3xl font-bold text-slate-900 md:text-4xl">{form.name || 'Your Name'}</h2>
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-center gap-2 text-slate-600 md:justify-start">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{form.email}</span>
                        </div>
                        {form.phone ? (
                          <div className="flex items-center justify-center gap-2 text-slate-600 md:justify-start">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm">{form.phone}</span>
                          </div>
                        ) : null}
                        {form.city || form.state ? (
                          <div className="flex items-center justify-center gap-2 text-slate-600 md:justify-start">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{[form.city, form.state].filter(Boolean).join(', ')}</span>
                          </div>
                        ) : null}
                        {form.drivingRange ? (
                          <div className="flex items-center justify-center gap-2 text-slate-600 md:justify-start">
                            <Award className="h-4 w-4" />
                            <span className="text-sm">Service Range: {form.drivingRange} miles</span>
                          </div>
                        ) : null}
                      </div>
                      {form.veterinarySkills && form.veterinarySkills.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                          {form.veterinarySkills.slice(0, 6).map((skill) => (
                            <Badge key={skill} variant="secondary" className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                              {skill}
                            </Badge>
                          ))}
                          {form.veterinarySkills.length > 6 ? (
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              +{form.veterinarySkills.length - 6} more
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border-0 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                    <div className="h-6 w-2 rounded-full bg-primary"></div>
                    About Me
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-600">
                    {form.bio || 'No bio provided yet. Click "Edit Profile" to add information about your experience and approach to pet care.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="min-h-0 pl-1">
            <div className="grid h-full grid-rows-[1fr] gap-4 pb-1">
              <Card className="rounded-2xl border-0 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                    <div className="h-6 w-2 rounded-full bg-primary"></div>
                    <MapPin className="h-5 w-5" />
                    Location & Service Area
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-4">
                  {form.address ? (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                        <div>
                          <Label className="text-xs uppercase tracking-wide text-slate-500">Address</Label>
                          <p className="font-medium text-slate-900">
                            {`${form.address}, ${form.city}, ${form.state} ${form.postalCode}`}
                          </p>
                        </div>
                        <div>
                        <Label className="text-xs uppercase tracking-wide text-slate-500">Service Range</Label>
                        <p className="font-medium text-slate-900">{form.drivingRange ? `${form.drivingRange} miles` : 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {form.locationLat && form.locationLng ? (
                    <div className="h-[18rem] max-h-[18rem] w-full overflow-hidden rounded-xl border-2 border-slate-200/60 shadow-sm xl:h-[19rem] xl:max-h-[19rem]">
                      <MapWithCircle lat={form.locationLat} lng={form.locationLng} miles={getDrivingRangeMiles()} />
                    </div>
                ) : null}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </>
  )

  const renderProfileEditContent = () => (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="space-y-4 sm:hidden">
        <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Edit steps</p>
            <p className="text-sm font-semibold text-slate-900">{editSections[activeEditStep]?.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => setActiveEditStep((current) => Math.max(current - 1, 0))}
              disabled={activeEditStep === 0}
              aria-label="Previous edit step"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => setActiveEditStep((current) => Math.min(current + 1, maxEditStep))}
              disabled={activeEditStep === maxEditStep}
              aria-label="Next edit step"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <RailDots count={editSections.length} activeIndex={activeEditStep} className="mt-1" />
      </div>

      <div className="hidden items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-sm sm:flex">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Profile pages</p>
          <p className="text-sm font-semibold text-slate-900">{profileDesktopEditSections[activeEditStep]?.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setActiveEditStep((current) => Math.max(current - 1, 0))}
            disabled={activeEditStep === 0}
            aria-label="Previous edit page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setActiveEditStep((current) => Math.min(current + 1, maxEditStep))}
            disabled={activeEditStep === maxEditStep}
            aria-label="Next edit page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div {...editSwipeHandlers} className="flex min-h-0 flex-1 flex-col gap-4">
        <Card className={activeEditStep !== 0 ? 'hidden rounded-2xl border-0 bg-white shadow-sm' : 'rounded-2xl border-0 bg-white shadow-sm sm:flex sm:min-h-0 sm:flex-1 sm:flex-col'}>
          <CardHeader className="pb-5">
            <CardTitle className="text-lg font-semibold text-slate-900 sm:text-xl">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 sm:min-h-0 sm:flex-1 sm:space-y-6">
            <div className="w-full max-w-sm mx-auto">
              <PhotoUpload
                label="Profile Picture"
                storagePath={`contractor-avatars/${user?.id || 'unknown'}`}
                initialUrl={form.profileImage}
                onUpload={handleAvatarUpload}
                disabled={saving || isUploadingAvatar}
                enableCropping={true}
                aspectRatio={1}
                previewSize="md"
                quality={0.9}
              />
              {isUploadingAvatar ? <p className="mt-2 text-sm text-blue-600">Saving profile picture...</p> : null}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
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

        <Card className={activeEditStep !== 1 ? 'hidden rounded-2xl border-0 bg-white shadow-sm' : 'rounded-2xl border-0 bg-white shadow-sm sm:flex sm:min-h-0 sm:flex-1 sm:flex-col'}>
          <CardHeader className="pb-5">
            <CardTitle className="text-lg font-semibold text-slate-900 sm:text-xl">Location & Service Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 sm:min-h-0 sm:flex-1 sm:space-y-6">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      </div>
    </div>
  )

  if (!editing) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
        <DashboardPageContent className="space-y-6 pb-8 pt-5 sm:space-y-8 lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:pb-6">
          <DashboardPageHeader
            variant="summary"
            title="Your Profile"
            description="Manage your professional information and services. Keep your client-facing details polished and current."
            eyebrow={
              <>
                <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                  Contractor profile
                </Badge>
                <Badge variant="secondary" className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                  {serviceOfferings.length} services listed
                </Badge>
              </>
            }
            actions={
              <Button
                onClick={() => {
                  setActiveEditStep(0)
                  setActiveProfileTab('profile')
                  setEditing(true)
                }}
                variant="petCta"
                size="pill"
                className="w-full sm:w-auto"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            }
          />

          <Tabs value={activeProfileTab} onValueChange={(value) => setActiveProfileTab(value as 'profile' | 'services' | 'coupons')} className="flex min-h-0 flex-1 flex-col gap-4">
            <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm lg:w-[32rem]">
              <TabsTrigger value="profile" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                Profile Info
              </TabsTrigger>
              <TabsTrigger value="services" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                Services
              </TabsTrigger>
              <TabsTrigger value="coupons" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                Coupons
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="min-h-0 flex-1 overflow-hidden">
              {renderProfileInfoView()}
            </TabsContent>

            <TabsContent value="services" className="min-h-0 flex-1 overflow-hidden">
              <div className="min-h-0 pr-1">
                {renderServiceManager()}
              </div>
            </TabsContent>

            <TabsContent value="coupons" className="min-h-0 flex-1 overflow-hidden">
              <div className="min-h-0 pr-1">
                {renderCouponsView()}
              </div>
            </TabsContent>
          </Tabs>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
      <DashboardPageContent className="space-y-6 pb-8 pt-5 sm:space-y-8 lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:pb-6">
        <DashboardPageHeader
          variant="summary"
          title="Edit Profile"
          description="Update your professional information and keep your services current for clients."
          eyebrow={
            <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
              Editing
            </Badge>
          }
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="pill"
                onClick={() => {
                  setForm(originalForm)
                  setActiveEditStep(0)
                  setActiveProfileTab('profile')
                  setEditing(false)
                  setError(null)
                  setSuccess(false)
                }}
                className="w-full sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                form="contractorProfileForm"
                variant="petCta"
                size="pill"
                disabled={saving || !formValid}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          }
        />

        <Tabs value={activeProfileTab} onValueChange={(value) => setActiveProfileTab(value as 'profile' | 'services' | 'coupons')} className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm lg:w-[32rem]">
            <TabsTrigger value="profile" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Profile Info
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Services
            </TabsTrigger>
            <TabsTrigger value="coupons" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Coupons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="min-h-0 flex-1 overflow-hidden">
            <form id="contractorProfileForm" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
              {renderProfileEditContent()}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">Error: {error}</p>
                </div>
              ) : null}
              {success ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">Profile updated successfully!</p>
                </div>
              ) : null}

              <div className="flex justify-end lg:mt-auto">
                <Button
                  type="submit"
                  form="contractorProfileForm"
                  variant="petCta"
                  size="pill"
                  disabled={saving || !formValid}
                  className="w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="services" className="min-h-0 flex-1 overflow-hidden">
            <div className="min-h-0 pr-1">
              {renderServiceManager()}
            </div>
          </TabsContent>

          <TabsContent value="coupons" className="min-h-0 flex-1 overflow-hidden">
            <div className="min-h-0 pr-1">
              {renderCouponsView()}
            </div>
          </TabsContent>
        </Tabs>
      </DashboardPageContent>
    </DashboardPageShell>
  )
}

export default function ContractorProfilePage() {
  return (
    <Suspense fallback={null}>
      <ContractorProfilePageContent />
    </Suspense>
  )
} 
