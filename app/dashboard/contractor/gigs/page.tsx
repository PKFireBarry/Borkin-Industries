"use client"
import { useRequireRole } from '../../use-require-role'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { getGigsForContractor, updateBookingStatus, setContractorCompleted } from '@/lib/firebase/bookings'
import { getClientById, getPetsByIds } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import dynamic from 'next/dynamic'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Pet } from '@/types/client'
import { PawPrint, Pill, Utensils, Clock, Dog, Info } from 'lucide-react'

interface Gig {
  id: string
  clientId?: string
  clientName: string
  pets: string[]
  serviceType: string
  date: string
  time: string
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'unpaid' | 'escrow' | 'paid' | 'cancelled'
  contractorCompleted: boolean
  paymentAmount?: number
  platformFee?: number
  stripeFee?: number
  netPayout?: number
  review?: { rating: number; comment?: string }
  petIds?: string[]
}

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const ContractorMap = dynamic(() => import('@/components/contractor-map'), { ssr: false })

export default function ContractorGigsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [filter, setFilter] = useState<'all' | Gig['status']>('all')
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [detailGig, setDetailGig] = useState<Gig | null>(null)
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [clientLatLng, setClientLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [contractorLatLng, setContractorLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null)
  const [contractorDrivingRange, setContractorDrivingRange] = useState<number>(0)
  const [bookedPetsDetails, setBookedPetsDetails] = useState<Pet[]>([])

  async function fetchGigs() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const bookings = await getGigsForContractor(user.id)
      const mapped = await Promise.all(bookings.map(async (b: any) => {
        let clientName = 'N/A'
        let petNames: string[] = []
        let bookingClientId: string | undefined = b.clientId;

        if (bookingClientId) {
          const client = await getClientById(bookingClientId)
          clientName = client?.name || 'N/A'
          if (b.petIds && b.petIds.length && client?.pets) {
            petNames = client.pets.filter((p: any) => b.petIds.includes(p.id)).map((p: any) => p.name)
          }
        }
        return {
          id: b.id,
          clientId: bookingClientId,
          clientName,
          pets: petNames,
          serviceType: b.serviceType || 'N/A',
          date: b.startDate || b.date || '',
          time: b.time || '',
          status: b.status || 'pending',
          paymentStatus: b.paymentStatus || 'unpaid',
          contractorCompleted: b.contractorCompleted || false,
          paymentAmount: b.paymentAmount,
          platformFee: b.platformFee,
          stripeFee: b.stripeFee,
          netPayout: b.netPayout,
          review: b.review,
          petIds: b.petIds,
        }
      }))
      setGigs(mapped)
    } catch {
      setError('Failed to load gigs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGigs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Fetch client profile and geocode both addresses when opening modal
  useEffect(() => {
    const fetchClientAndGeocode = async () => {
      if (!detailGig || !user) {
        // Clear previous data if no gig is selected or no user
        setClientProfile(null);
        setClientLatLng(null);
        setContractorLatLng(null);
        setDistanceMiles(null);
        setContractorDrivingRange(0);
        setBookedPetsDetails([]);
        return;
      }
      
      console.log('[Debug] useEffect fetchClientAndGeocode: Running for gig ID:', (detailGig as any).id);
      const gigClientId = (detailGig as any).clientId;
      const gigPetIds = (detailGig as any).petIds;
      console.log('[Debug] useEffect fetchClientAndGeocode: Attempting to fetch client with clientId:', gigClientId);

      // Reset states for new gig details
      setClientProfile(null);
      setClientLatLng(null);
      setContractorLatLng(null);
      setDistanceMiles(null);
      setContractorDrivingRange(0);
      setBookedPetsDetails([]);

      let clientData = null;
      if (gigClientId) {
        try {
          clientData = await getClientById(gigClientId);
          console.log('[Debug] useEffect fetchClientAndGeocode: Fetched client profile:', clientData);
          setClientProfile(clientData);

          if (clientData && clientData.pets && gigPetIds && gigPetIds.length > 0) {
            const petsForThisGig = clientData.pets.filter((p: Pet) => gigPetIds.includes(p.id));
            setBookedPetsDetails(petsForThisGig);
            console.log("[Debug] Fetched full pet details for gig:", petsForThisGig);
          } else {
            console.log("[Debug] No pet IDs in gig or no pets on client profile to filter.");
          }
        } catch (err) {
          console.error('[Debug] useEffect fetchClientAndGeocode: Error fetching client profile:', err);
        }
      }

      if (clientData) {
        const clientQuery = [clientData.address, clientData.city, clientData.state, clientData.postalCode].filter(Boolean).join(', ');
        console.log('[Debug] useEffect fetchClientAndGeocode: Client geocoding query:', clientQuery);
        if (clientQuery) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clientQuery)}`);
            const data = await res.json();
            console.log('[Debug] useEffect fetchClientAndGeocode: Client geocoding API response data:', data);
            if (data && data[0]) {
              const latLng = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
              console.log('[Debug] useEffect fetchClientAndGeocode: Setting clientLatLng:', latLng);
              setClientLatLng(latLng);
            } else {
              console.warn('[Debug] useEffect fetchClientAndGeocode: No client geocoding results.');
            }
          } catch (err) {
            console.error('[Debug] useEffect fetchClientAndGeocode: Error during client geocoding API call:', err);
          }
        } else {
          console.warn('[Debug] useEffect fetchClientAndGeocode: Client geocoding query is empty.');
        }
      } else {
        console.warn('[Debug] useEffect fetchClientAndGeocode: Client data is null, skipping client geocoding.');
        if (gigClientId) {
          console.warn('[Debug] useEffect fetchClientAndGeocode: Client was null despite having a clientId. Check getClientById or Firestore data for clients collection.');
        }
      }

      // Fetch and geocode contractor's address
      if (user.id) {
        try {
          const contractorProfile = await getContractorProfile(user.id);
          console.log('[Debug] useEffect fetchClientAndGeocode: Fetched contractor profile:', contractorProfile);
          if (contractorProfile) {
            // Set driving range from contractor's profile
            const drivingRange = typeof contractorProfile.drivingRange === 'number' ? contractorProfile.drivingRange : 0;
            console.log('[Debug] useEffect fetchClientAndGeocode: Contractor driving range:', drivingRange);
            setContractorDrivingRange(drivingRange);

            if (contractorProfile.address && contractorProfile.city && contractorProfile.state && contractorProfile.postalCode) {
              const contractorQuery = [contractorProfile.address, contractorProfile.city, contractorProfile.state, contractorProfile.postalCode].filter(Boolean).join(', ');
              console.log('[Debug] useEffect fetchClientAndGeocode: Contractor geocoding query:', contractorQuery);
              if (contractorQuery) {
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(contractorQuery)}`);
                  const data = await res.json();
                  console.log('[Debug] useEffect fetchClientAndGeocode: Contractor geocoding API response data:', data);
                  if (data && data[0]) {
                    const latLng = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                    console.log('[Debug] useEffect fetchClientAndGeocode: Setting contractorLatLng:', latLng);
                    setContractorLatLng(latLng);
                  } else {
                    console.warn('[Debug] useEffect fetchClientAndGeocode: No contractor geocoding results.');
                  }
                } catch (err) {
                  console.error('[Debug] useEffect fetchClientAndGeocode: Error during contractor geocoding API call:', err);
                }
              } else {
                console.warn('[Debug] useEffect fetchClientAndGeocode: Contractor geocoding query is empty, skipping contractor geocoding.');
              }
            } else {
              console.warn('[Debug] useEffect fetchClientAndGeocode: Contractor profile or address details missing, skipping contractor geocoding.');
            }
          } else {
            console.warn('[Debug] useEffect fetchClientAndGeocode: Contractor profile is null, skipping contractor geocoding.');
          }
        } catch (err) {
          console.error('[Debug] useEffect fetchClientAndGeocode: Error fetching contractor profile:', err);
        }
      } else {
        console.warn("[Debug] useEffect fetchClientAndGeocode: user.id not available for contractor geocoding.");
      }
    }
    fetchClientAndGeocode();
  }, [detailGig, user]);

  useEffect(() => {
    console.log('[Debug] clientProfile state updated:', clientProfile);
  }, [clientProfile]);

  useEffect(() => {
    console.log('[Debug] clientLatLng state updated:', clientLatLng);
  }, [clientLatLng]);

  // Optionally, calculate distance between client and contractor
  useEffect(() => {
    if (clientLatLng && contractorLatLng) {
      const toRad = (v: number) => (v * Math.PI) / 180
      const R = 3958.8 // miles
      const dLat = toRad(contractorLatLng.lat - clientLatLng.lat)
      const dLon = toRad(contractorLatLng.lng - clientLatLng.lng)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(clientLatLng.lat)) * Math.cos(toRad(contractorLatLng.lat)) * Math.sin(dLon / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      setDistanceMiles(R * c)
    } else {
      setDistanceMiles(null)
    }
  }, [clientLatLng, contractorLatLng])

  const handleAccept = async (gigId: string) => {
    setActionLoading(gigId)
    await updateBookingStatus(gigId, 'approved')
    await fetchGigs()
    setActionLoading(null)
  }

  const handleDecline = async (gigId: string) => {
    setActionLoading(gigId)
    await updateBookingStatus(gigId, 'cancelled')
    await fetchGigs()
    setActionLoading(null)
  }

  const handleMarkCompleted = async (gigId: string) => {
    setActionLoading(gigId)
    try {
      await setContractorCompleted(gigId, true)
      await fetchGigs()
    } catch {
      setError('Failed to mark as completed')
    } finally {
      setActionLoading(null)
    }
  }

  // Helper to format date(s)
  const safeDateString = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    return isNaN(d.getTime()) ? '' : d.toLocaleString()
  }
  const getGigDisplayDate = (g: Gig) => {
    const start = g.date ?? ''
    return safeDateString(start)
  }

  // Helper for net payout
  const getNetPayout = (gig: Gig) => {
    if (typeof gig.netPayout === 'number') return gig.netPayout
    if (typeof gig.paymentAmount === 'number') {
      const platformFee = gig.platformFee ?? gig.paymentAmount * 0.05
      const stripeFee = gig.stripeFee ?? (gig.paymentAmount * 0.029 + 0.3)
      return +(gig.paymentAmount - platformFee - stripeFee).toFixed(2)
    }
    return 0
  }

  // Helper for status badge
  function StatusBadge({ status }: { status: string }) {
    let color = 'bg-gray-200 text-gray-700'
    if (status === 'pending') color = 'bg-yellow-100 text-yellow-800'
    if (status === 'approved') color = 'bg-blue-100 text-blue-800'
    if (status === 'completed') color = 'bg-green-100 text-green-800'
    if (status === 'cancelled') color = 'bg-red-100 text-red-800'
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  // PetDetailItem helper component
  const PetDetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | null }) => (
    value ? (
        <div className="flex items-start text-sm">
            <Icon className="w-4 h-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
            <span className="font-medium text-muted-foreground">{label}:&nbsp;</span>
            <span className="text-foreground break-words">{String(value)}</span>
        </div>
    ) : null
  );

  if (!isLoaded || !isAuthorized) return null
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading gigs...</div>
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>

  const filteredGigs = filter === 'all' ? gigs : gigs.filter(g => g.status === filter)

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Gigs</h1>
      {/* Status Filter Bar */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? 'All' : statusLabels[status as keyof typeof statusLabels]}
          </Button>
        ))}
      </div>
      {/* Gigs List */}
      {filteredGigs.length === 0 ? (
        <div className="text-muted-foreground">No gigs found for this status.</div>
      ) : (
        <div className="space-y-6">
          {filteredGigs.map(gig => (
            <Card key={gig.id} className="shadow-sm">
              <CardContent className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="mb-2">{gig.serviceType}</CardTitle>
                  <div className="text-sm mb-1"><span className="font-medium">Client:</span> {gig.clientName}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Pets:</span> {gig.pets.join(', ')}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Date:</span> {getGigDisplayDate(gig)}{gig.time ? ` at ${gig.time}` : ''}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Status:</span> <StatusBadge status={gig.status} /></div>
                  {gig.review && (
                    <span className="text-xs text-muted-foreground">Review: <span className="font-medium text-foreground">{gig.review.rating}★</span> {gig.review.comment}</span>
                  )}
                </div>
                {/* Actions and Net Payout */}
                <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-sm px-2 py-1" onClick={() => setDetailGig(gig)}>
                      Details
                    </Button>
                    {gig.status === 'pending' && (
                      <>
                        <Button variant="default" disabled={actionLoading === gig.id} onClick={() => handleAccept(gig.id)}>
                          {actionLoading === gig.id ? 'Accepting...' : 'Accept'}
                        </Button>
                        <Button variant="destructive" disabled={actionLoading === gig.id} onClick={() => handleDecline(gig.id)}>
                          {actionLoading === gig.id ? 'Declining...' : 'Decline'}
                        </Button>
                      </>
                    )}
                    {gig.status === 'approved' && !gig.contractorCompleted && (
                      <Button variant="default" disabled={actionLoading === gig.id} onClick={() => handleMarkCompleted(gig.id)}>
                        {actionLoading === gig.id ? 'Marking...' : 'Mark as Completed'}
                      </Button>
                    )}
                    {gig.status === 'approved' && gig.contractorCompleted && (
                      <span className="text-xs text-muted-foreground">Waiting for client...</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Gig Details Modal */}
      <Dialog open={!!detailGig} onOpenChange={() => setDetailGig(null)}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gig Details</DialogTitle>
          </DialogHeader>
          {detailGig && (
            <div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-2">
              {/* Client Info Section */}
              {clientProfile && (
                <div className="flex items-center gap-4 border-b pb-4">
                  <Avatar className="h-16 w-16">
                    {clientProfile.avatar ? (
                      <AvatarImage src={clientProfile.avatar} alt={clientProfile.name} />
                    ) : (
                      <AvatarFallback>{clientProfile.name?.charAt(0) ?? '?'}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-semibold text-lg">{clientProfile.name}</div>
                    <div className="text-xs text-muted-foreground">{clientProfile.email}</div>
                    <div className="text-xs text-muted-foreground">{clientProfile.phone}</div>
                    <div className="text-xs text-muted-foreground">{[clientProfile.address, clientProfile.city, clientProfile.state, clientProfile.postalCode].filter(Boolean).join(', ')}</div>
                  </div>
                </div>
              )}
              {/* Map Section */}
              {contractorLatLng && clientLatLng && (
                <div className="w-full h-64 mb-4">
                  <ContractorMap
                    lat={contractorLatLng.lat}
                    lng={contractorLatLng.lng}
                    miles={contractorDrivingRange}
                    clientLat={clientLatLng?.lat}
                    clientLng={clientLatLng?.lng}
                  />
                </div>
              )}
              {!contractorLatLng && clientLatLng && (
                <div className="w-full h-64 mb-4">
                  <ContractorMap
                    lat={clientLatLng.lat}
                    lng={clientLatLng.lng}
                    miles={0}
                  />
                </div>
              )}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Booking Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Service Type</div>
                    <div className="font-medium text-base">{detailGig?.serviceType ?? ''}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      detailGig?.status === 'completed' ? 'bg-green-100 text-green-800' :
                      detailGig?.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      detailGig?.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800' // Default for pending or other statuses
                    }`}>
                      {detailGig?.status?.charAt(0).toUpperCase() + detailGig?.status?.slice(1)}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Date & Time</div>
                    <div className="font-medium text-base">{getGigDisplayDate(detailGig)}{detailGig.time ? ` at ${detailGig.time}` : ''}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Payment Status</div>
                     <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        detailGig?.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        detailGig?.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                        detailGig?.paymentStatus === 'escrow' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800' // Default for unpaid or pending (if applicable)
                    }`}>
                       {detailGig?.paymentStatus?.charAt(0).toUpperCase() + detailGig?.paymentStatus?.slice(1)}
                    </span>
                  </div>
                  {distanceMiles !== null && clientLatLng && contractorLatLng && (
                    <div className="sm:col-span-2 mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Distance to Gig</div>
                      <div className="font-medium text-base">{distanceMiles.toFixed(2)} miles</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Enhanced Pet Information Section */}
              {bookedPetsDetails.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center"><PawPrint className="w-5 h-5 mr-2 text-primary"/>Pet Information</h3>
                  {bookedPetsDetails.map((pet, index) => (
                    <div key={pet.id} className={`py-4 ${index < bookedPetsDetails.length - 1 ? 'border-b border-dashed' : ''}`}>
                      <div className="flex flex-col sm:flex-row items-center gap-4 mb-3">
                          <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary/50">
                              <AvatarImage src={pet.photoUrl || '/avatars/default-pet.png'} alt={pet.name} className="object-cover" />
                              <AvatarFallback className="bg-primary/10 text-primary text-xl">{pet.name ? pet.name[0].toUpperCase() : 'P'}</AvatarFallback>
                          </Avatar>
                          <div className="text-center sm:text-left">
                              <h4 className="text-lg font-semibold text-gray-800 mb-0.5">{pet.name}</h4>
                              <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  <span><strong>Age:</strong> {pet.age || 'N/A'} yrs</span>
                                  {pet.animalType && <span><strong>Type:</strong> {pet.animalType}</span>}
                                  {pet.breed && <span><strong>Breed:</strong> {pet.breed}</span>}
                                  {pet.weight && <span><strong>Weight:</strong> {pet.weight}</span>}
                              </div>
                          </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 mt-2">
                          <PetDetailItem icon={Pill} label="Medications" value={pet.medications} />
                          <PetDetailItem icon={Utensils} label="Food" value={pet.food} />
                          <PetDetailItem icon={Clock} label="Food Schedule" value={pet.foodSchedule} />
                          <PetDetailItem icon={Clock} label="General Schedule" value={pet.schedule} />
                          <PetDetailItem icon={Dog} label="Temperament" value={pet.temperament} />
                          <PetDetailItem icon={Info} label="Allergies" value={pet.allergies} />
                          <PetDetailItem icon={Info} label="Need to Know" value={pet.needToKnow} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-2 font-semibold">Net Payout</div>
                <div className="font-semibold text-base text-green-700">${getNetPayout(detailGig).toFixed(2)}</div>
              </div>
              {detailGig.review && (
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground mb-2 font-semibold">Review</div>
                  <div className="text-sm">Rating: <span className="font-bold">{detailGig.review.rating}</span></div>
                  {detailGig.review.comment && <div className="text-sm mt-1">"{detailGig.review.comment}"</div>}
                </div>
              )}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <div className="mb-1">Booking ID</div>
                <div className="font-mono break-all mb-1">{detailGig?.id ?? ''}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setDetailGig(null)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
} 