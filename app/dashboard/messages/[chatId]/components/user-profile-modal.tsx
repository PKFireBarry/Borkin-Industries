'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, Phone, Mail, PawPrint, Package } from 'lucide-react';
import { getBookingById } from '@/lib/firebase/bookings';
import { getClientProfile } from '@/lib/firebase/client';
import { getContractorProfile } from '@/lib/firebase/contractors';
import { getAllPlatformServices } from '@/lib/firebase/services';
import { format, parseISO } from 'date-fns';
import { Booking } from '@/types/booking';
import { Client } from '@/types/client';
import { Contractor } from '@/types/contractor';
import { ChatParticipant } from '@/types/messaging';
import { PlatformService } from '@/types/service';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: ChatParticipant;
  bookingId: string;
  currentUserId: string;
}

function getInitials(name: string) {
  return name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '';
}

export function UserProfileModal({ isOpen, onClose, participant, bookingId, currentUserId }: UserProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [userProfile, setUserProfile] = useState<Client | Contractor | null>(null);
  const [platformServices, setPlatformServices] = useState<PlatformService[]>([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!isOpen) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch platform services first to get service names
        const services = await getAllPlatformServices();
        setPlatformServices(services);
        
        // Fetch booking details
        const bookingData = await getBookingById(bookingId);
        
        // Map service names if services exist
        if (bookingData && bookingData.services && bookingData.services.length > 0) {
          const serviceNameMap = new Map(services.map(s => [s.id, s.name]));
          
          // Create a new booking object with mapped service names
          const servicesWithNames = bookingData.services.map(service => ({
            ...service,
            name: service.name || serviceNameMap.get(service.serviceId) || service.serviceId,
          }));
          
          setBooking({
            ...bookingData,
            services: servicesWithNames
          });
        } else {
          setBooking(bookingData);
        }
        
        // Determine if participant is client or contractor
        const isParticipantClient = participant.userId !== currentUserId && bookingData?.clientId === participant.userId;
        
        // Fetch appropriate profile
        if (isParticipantClient) {
          const clientProfile = await getClientProfile(participant.userId);
          setUserProfile(clientProfile);
        } else {
          const contractorProfile = await getContractorProfile(participant.userId);
          setUserProfile(contractorProfile);
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [isOpen, participant.userId, bookingId, currentUserId]);

  const isClient = userProfile && 'pets' in userProfile;
  
  function formatDate(dateString?: string) {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  }
  
  function getStatusBadgeVariant(status?: string) {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  }
  
  // Format price for display - fixing the Stripe cents formatting issue
  function formatPrice(price: number, paymentType: 'one_time' | 'daily', numberOfDays: number = 1) {
    // Convert from cents to dollars if price is over 100
    // This handles the case where prices might be stored in cents in the database
    const isInCents = price > 100 && price % 100 === 0;
    const displayPrice = isInCents ? price / 100 : price;

    if (paymentType === 'one_time') {
      return `$${displayPrice.toFixed(2)}`;
    } else {
      // For daily services, show total and rate
      const dailyRate = displayPrice;
      const totalPrice = dailyRate * numberOfDays;
      return `$${dailyRate.toFixed(2)}/day × ${numberOfDays} day${numberOfDays !== 1 ? 's' : ''} = $${totalPrice.toFixed(2)}`;
    }
  }
  
  // Format booking date range
  function getBookingDateTimeRange(booking: Booking) {
    function parseLocalDate(dateStr?: string) {
      if (!dateStr) return null;
      // If format is YYYY-MM-DD, treat as local date
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      // If ISO string, extract date part and treat as local
      if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
        const [datePart] = dateStr.split('T');
        const [y, m, d] = datePart.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      return new Date(dateStr);
    }
    
    const start = parseLocalDate(booking.startDate);
    const end = parseLocalDate(booking.endDate);
    const startTime = booking.time?.startTime;
    const endTime = booking.time?.endTime;
    
    if (!start || !end) return '';
    
    const startStr = `${start.toLocaleDateString()}${startTime ? ', ' + startTime : ''}`;
    const endStr = `${end.toLocaleDateString()}${endTime ? ', ' + endTime : ''}`;
    return `${startStr} — ${endStr}`;
  }
  
  // Format amount to dollars
  function formatAmount(amount: number) {
    return amount.toFixed(2);
  }
  
  // Helper to get service name from platform services
  function getServiceName(serviceId: string) {
    return platformServices.find(s => s.id === serviceId)?.name || serviceId;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading profile information...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={participant.avatarUrl || ''} alt={participant.displayName} />
                <AvatarFallback>{getInitials(participant.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{participant.displayName}</h3>
                <p className="text-sm text-muted-foreground">{isClient ? 'Client' : 'Contractor'}</p>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="booking">Booking Details</TabsTrigger>
              </TabsList>
              
              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4 pt-2">
                {userProfile && (
                  <>
                    {/* Contact Information */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Contact Information</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {userProfile.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{userProfile.email}</span>
                          </div>
                        )}
                        {userProfile.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{userProfile.phone}</span>
                          </div>
                        )}
                        {userProfile.address && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {[
                                userProfile.address,
                                userProfile.city,
                                userProfile.state,
                                userProfile.postalCode
                              ].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Client-specific information */}
                    {isClient && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Pets</h4>
                        <div className="space-y-2">
                          {(userProfile as Client).pets?.map(pet => (
                            <div key={pet.id} className="flex items-center space-x-2">
                              <PawPrint className="h-4 w-4 text-muted-foreground" />
                              <span>{pet.name} ({pet.animalType || 'Pet'}{pet.breed ? `, ${pet.breed}` : ''})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Contractor-specific information */}
                    {!isClient && (
                      <div className="space-y-4">
                        {(userProfile as Contractor).bio && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Bio</h4>
                            <p className="text-sm">{(userProfile as Contractor).bio}</p>
                          </div>
                        )}
                        
                        {(userProfile as Contractor).veterinarySkills?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Skills</h4>
                            <div className="flex flex-wrap gap-1">
                              {(userProfile as Contractor).veterinarySkills.map((skill, i) => (
                                <Badge key={i} variant="outline">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
              
              {/* Booking Tab */}
              <TabsContent value="booking" className="space-y-4 pt-2">
                {booking ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Booking Status</h4>
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{getBookingDateTimeRange(booking)}</span>
                      </div>
                      
                      {booking.numberOfDays && booking.numberOfDays > 0 && (
                        <div className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md mt-2">
                          <span className="font-medium">Duration:</span>
                          <span>{booking.numberOfDays} day{booking.numberOfDays !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Services */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Services</h4>
                      {booking.services && booking.services.length > 0 ? (
                        <div className="space-y-3">
                          {booking.services.map((service, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-muted/50 rounded-md px-3 py-2">
                              <div className="flex flex-col">
                                <span className="font-semibold">{service.name || getServiceName(service.serviceId)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {service.paymentType === 'one_time' ? 'One-time payment' : 'Daily rate'}
                                </span>
                              </div>
                              <div className="text-right mt-2 sm:mt-0">
                                <span className="font-bold">
                                  {formatPrice(service.price, service.paymentType, booking.numberOfDays || 1)}
                                </span>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between items-center border-t pt-3 mt-2">
                            <span className="font-semibold text-base">Total Payment</span>
                            <span className="font-bold text-primary text-xl">${formatAmount(booking.paymentAmount || 0)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {booking.serviceType || 'No services specified'}
                        </p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Payment Status */}
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Payment Status</h4>
                      <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                        {booking.paymentStatus?.charAt(0).toUpperCase() + booking.paymentStatus?.slice(1)}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Booking details not available</p>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 