import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  if (!id) return NextResponse.json({ error: 'Missing contractor ID' }, { status: 400 })
  try {
    const contractorRef = doc(db, 'contractors', id)
    const snap = await getDoc(contractorRef)
    if (!snap.exists()) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    return NextResponse.json({ ...snap.data(), id })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch contractor' }, { status: 500 })
  }
} 