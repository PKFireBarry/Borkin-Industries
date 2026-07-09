"use client"

import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { db } from '../../../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export function useRequireContractorApproval() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !user) return
    (async () => {
      const q = query(
        collection(db, 'contractorApplications'),
        where('userId', '==', user.id)
      )
      const snap = await getDocs(q)
      if (snap.empty || snap.docs[0].data().status !== 'approved') {
        router.replace('/dashboard/contractor/apply')
      }
    })()
  }, [user, isLoaded, router])
} 