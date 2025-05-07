"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { useRequireRole } from '../use-require-role'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, MoreHorizontal, CheckCircle2, Check } from 'lucide-react'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

// Map brand names to card colors with enhanced visual design
const brandColors: Record<string, {bg: string, text: string, accent: string}> = {
  visa: { bg: 'bg-gradient-to-br from-blue-600 to-blue-700', text: 'text-white', accent: 'border-blue-400' },
  mastercard: { bg: 'bg-gradient-to-br from-red-600 to-red-800', text: 'text-white', accent: 'border-red-400' },
  amex: { bg: 'bg-gradient-to-br from-blue-700 to-blue-900', text: 'text-white', accent: 'border-blue-500' },
  discover: { bg: 'bg-gradient-to-br from-orange-500 to-orange-700', text: 'text-white', accent: 'border-orange-400' },
  default: { bg: 'bg-gradient-to-br from-gray-700 to-gray-900', text: 'text-white', accent: 'border-gray-500' }
};

// Get card logos based on brand
const getCardLogo = (brand: string) => {
  const brandLower = brand.toLowerCase();
  
  if (brandLower === 'visa') {
    return (
      <div className="text-white text-xl font-bold italic tracking-wider uppercase">
        VISA
      </div>
    );
  } else if (brandLower === 'mastercard') {
    return (
      <div className="flex items-center space-x-1">
        <div className="w-6 h-6 bg-red-500 rounded-full"></div>
        <div className="w-6 h-6 bg-yellow-500 rounded-full -ml-3"></div>
      </div>
    );
  } else if (brandLower === 'amex') {
    return (
      <div className="text-white text-xl font-bold tracking-wider uppercase">
        AMEX
      </div>
    );
  } else {
    return (
      <div className="text-white text-xl font-bold tracking-wider uppercase">
        {brand}
      </div>
    );
  }
};

export default function PaymentsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('saved-cards')

  useEffect(() => {
    async function fetchMethods() {
      if (!user) return
      setLoading(true)
      setError(null)
      try {
        const profile = await getClientProfile(user.id)
        console.log('[payments] profile:', profile)
        if (!profile?.stripeCustomerId) {
          setError('No Stripe customer ID found.')
          setLoading(false)
          return
        }
        console.log('[payments] stripeCustomerId:', profile.stripeCustomerId)
        const res = await fetch('/api/stripe/list-payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: profile.stripeCustomerId }),
        })
        if (!res.ok) throw new Error('Failed to fetch payment methods')
        const data = await res.json()
        console.log('[payments] paymentMethods API response:', data)
        setMethods(data.paymentMethods)
      } catch (err) {
        setError('Failed to load payment methods')
      } finally {
        setLoading(false)
      }
    }
    fetchMethods()
  }, [user])

  async function handleManagePayments() {
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create portal session')
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError('Failed to redirect to Stripe portal')
    }
  }

  if (!isLoaded || !isAuthorized) return null

  // Format MM/YY nicely
  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500 mb-6">
            Click the button below or the add another card button to manage your payment methods.
          </div>
          
          {loading ? (
            <div className="py-8 text-center">Loading your payment methods...</div>
          ) : error ? (
            <div className="text-destructive mb-4 py-4">{error}</div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {methods.map((method) => {
                const brandLower = method.brand?.toLowerCase() || 'default';
                const colors = brandColors[brandLower] || brandColors.default;
                
                return (
                  <div key={method.id} className="relative group perspective-1000">
                    {/* Default card badge */}
                    {method.isDefault && (
                      <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center shadow-md">
                        <Check size={12} className="mr-1" />
                        Default
                      </div>
                    )}
                    
                    {/* Card design */}
                    <div 
                      className={`relative ${colors.bg} ${colors.text} rounded-xl p-6 h-52 shadow-lg 
                      transition-all duration-300 
                      hover:shadow-xl transform-gpu hover:-translate-y-1 
                      border-2 ${method.isDefault ? 'border-green-500' : 'border-transparent'}`}
                    >
                      {/* EMV Chip - more realistic */}
                      <div className="absolute top-6 left-6 w-11 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md 
                        border border-yellow-600 overflow-hidden flex items-center justify-center">
                        <div className="w-full h-full grid grid-cols-4 grid-rows-3 gap-px opacity-50">
                          {[...Array(12)].map((_, i) => (
                            <div key={i} className="bg-gray-800"></div>
                          ))}
                        </div>
                      </div>

                      {/* Card Brand Logo - top right */}
                      <div className="absolute top-6 right-6">
                        {getCardLogo(method.brand || 'Card')}
                      </div>
                      
                      {/* Card Number */}
                      <div className="mt-16 mb-6">
                        <div className="text-xs text-white/70 mb-1 uppercase tracking-wider">Card Number</div>
                        <div className="text-lg font-mono tracking-wider">
                          •••• •••• •••• {method.last4}
                        </div>
                      </div>
                      
                      {/* Card Details (Expiry and Name) */}
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs text-white/70 mb-1 uppercase tracking-wider">Expiry</div>
                          <div className="text-sm font-mono">{formatExpiry(method.expMonth, method.expYear)}</div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs text-white/70 mb-1 uppercase tracking-wider">Name</div>
                          <div className="text-sm font-mono">{user?.fullName || 'Card Holder'}</div>
                        </div>
                      </div>
                      
                      {/* Decorative network lines */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-24 top-10 w-8 h-8 border-t-2 border-l-2 border-white/10 rounded-tl-xl"></div>
                        <div className="absolute right-24 bottom-10 w-10 h-10 border-b-2 border-r-2 border-white/10 rounded-br-xl"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Add New Card Button */}
              <div 
                className="flex items-center justify-center h-52 border-2 border-dashed 
                border-gray-300 rounded-xl hover:border-gray-400 transition-colors cursor-pointer
                bg-gray-50 hover:bg-gray-100" 
                onClick={handleManagePayments}
              >
                <div className="flex flex-col items-center text-gray-500">
                  <Plus size={24} className="mb-2" />
                  <div className="font-medium">Add another card</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex justify-end">
            <Button onClick={handleManagePayments} className="mt-4 px-6 py-2 text-base">
              Manage Payment Methods
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
} 