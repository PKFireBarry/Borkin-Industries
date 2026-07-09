import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'app', 'forms', 'Form W-9 (Rev. March 2024).pdf')
    const data = await fs.readFile(filePath)
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="w9-template.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Failed to read W-9 template:', err)
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
}
