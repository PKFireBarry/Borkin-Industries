import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../../firebase'

export async function GET() {
  const bannedRef = collection(db, 'banned_contractors')
  const snap = await getDocs(bannedRef)
  const banned = snap.docs.map(doc => doc.data())
  return NextResponse.json({ banned })
} 