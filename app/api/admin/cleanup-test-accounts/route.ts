import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase'
import { isStripeTestMode } from '@/lib/utils'

export async function POST(_req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // Only allow admin users (you can customize this check)
    const isAdmin = user.emailAddresses?.[0]?.emailAddress === 'admin@borkinindustries.com'
    if (!isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const currentIsTestMode = isStripeTestMode()
    let cleanedContractors = 0
    let cleanedClients = 0

    // Clean up contractor accounts
    const contractorsRef = collection(db, 'contractors')
    const contractorsSnap = await getDocs(contractorsRef)
    
    for (const contractorDoc of contractorsSnap.docs) {
      const data = contractorDoc.data()
      const stripeAccountId = data.stripeAccountId
      const accountMode = data.stripeAccountMode
      
      // If account mode doesn't match current mode, clear the Stripe account
      if (stripeAccountId && accountMode && accountMode !== (currentIsTestMode ? 'test' : 'live')) {
        await updateDoc(doc(db, 'contractors', contractorDoc.id), {
          stripeAccountId: null,
          stripeAccountMode: null,
          stripeAccountCreatedAt: null
        })
        cleanedContractors++
        console.log(`Cleaned contractor ${contractorDoc.id} - removed ${accountMode} mode account`)
      }
    }

    // Clean up client accounts (if they have mode tracking)
    const clientsRef = collection(db, 'clients')
    const clientsSnap = await getDocs(clientsRef)
    
    for (const clientDoc of clientsSnap.docs) {
      const data = clientDoc.data()
      const stripeCustomerId = data.stripeCustomerId
      const customerMode = data.stripeCustomerMode
      
      // If customer mode doesn't match current mode, clear the Stripe customer
      if (stripeCustomerId && customerMode && customerMode !== (currentIsTestMode ? 'test' : 'live')) {
        await updateDoc(doc(db, 'clients', clientDoc.id), {
          stripeCustomerId: null,
          stripeCustomerMode: null,
          stripeCustomerCreatedAt: null
        })
        cleanedClients++
        console.log(`Cleaned client ${clientDoc.id} - removed ${customerMode} mode customer`)
      }
    }

    return NextResponse.json({
      success: true,
      currentMode: currentIsTestMode ? 'test' : 'live',
      cleanedContractors,
      cleanedClients,
      message: `Cleaned up ${cleanedContractors} contractor accounts and ${cleanedClients} client accounts`
    })
  } catch (err) {
    console.error('Failed to cleanup test accounts:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 