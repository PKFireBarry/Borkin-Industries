import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface W9Data {
  name: string
  taxClassification:
    | 'individual'
    | 'c_corporation'
    | 's_corporation'
    | 'partnership'
    | 'trust'
    | 'llc'
    | 'other'
  taxClassificationOther?: string
  address: string
  city: string
  state: string
  zip: string
  tinType: 'ssn' | 'ein'
  tin: string // raw digits only
  signatureName: string
  signatureImageDataUrl?: string
  dateISO?: string // default: today
}

function chunkSSN(ssn: string) {
  const digits = ssn.replace(/\D/g, '')
  return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 9)]
}

function chunkEIN(ein: string) {
  const digits = ein.replace(/\D/g, '')
  return [digits.slice(0, 2), digits.slice(2, 9)]
}

// Convert a data URL (e.g., PNG) to a Uint8Array for pdf-lib embedding
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const [, base64] = dataUrl.split(',')
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function generateW9Pdf(data: W9Data): Promise<File> {
  const res = await fetch('/api/forms/w9-template')
  if (!res.ok) throw new Error('Failed to load W-9 template')
  const arrayBuffer = await res.arrayBuffer()

  const pdfDoc = await PDFDocument.load(arrayBuffer)
  const pages = pdfDoc.getPages()
  const page = pages[0]
  const { width, height } = page.getSize() // typically 612 x 792

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const mono = await pdfDoc.embedFont(StandardFonts.Courier) // better fit for fixed-width boxes (SSN/EIN)

  // Global nudge to better align with printed boxes; tweak if template revision changes
  const NUDGE_X = 0
  const NUDGE_Y = 6 // raise baseline slightly to sit centered vertically in fields

  const draw = (
    txt: string,
    x: number,
    y: number,
    size = 10,
    bold = false,
  ) => {
    page.drawText(txt, {
      x: x + NUDGE_X,
      y: y + NUDGE_Y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    })
  }

  // Draw text, shrinking font size to fit within maxWidth (down to minSize)
  const drawClamped = (
    txt: string,
    x: number,
    y: number,
    maxWidth: number,
    startSize = 11,
    minSize = 8,
    bold = false,
  ) => {
    let size = startSize
    const f = bold ? fontBold : font
    // Reduce size until it fits or we hit minSize
    while (size > minSize && f.widthOfTextAtSize(txt, size) > maxWidth) {
      size -= 0.25
    }
    page.drawText(txt, {
      x: x + NUDGE_X,
      y: y + NUDGE_Y,
      size,
      font: f,
      color: rgb(0, 0, 0),
    })
  }

  // Coordinates below are approximate for IRS Form W-9 (Rev. March 2024) first page
  // They can be fine-tuned later by visual testing.

  // Line 1: Name
  drawClamped(data.name, 72, height - 132, 460, 11)

  // Line 2: Business name (not used)

  // Tax classification checkboxes
  // Skipped: Template already has the contractor classification pre-filled.

  // Exemptions (codes) — not used

  // Address: move up one section to align with lines 5 and 6
  drawClamped(data.address, 72, height - 300, 470, 10)
  drawClamped(`${data.city}, ${data.state} ${data.zip}`, 72, height - 326, 470, 10)

  // Part I: TIN
  // Tunable coordinates for quick iteration
  const TIN_Y = height - 392 // move up so digits are inside boxes (were below)
  const SSN_XA = 420 // tiny left nudge
  const SSN_XB = 480
  const SSN_XC = 523
  const EIN_XA = 420
  const EIN_XB = 465
  const EIN_Y_OFFSET = -50 // adjust EIN vertical position relative to TIN_Y (positive moves up)
  const SSN_FONT_SIZE = 14
  // Per-group digit spacing so we can fine-tune 3-2-4 boxes independently
  const SSN_STEP_A = 14 // first 3 digits (looks good per feedback)
  const SSN_STEP_B = 12 // tighten slightly for middle 2 digits
  const SSN_STEP_C = 13 // tighten slightly for last 4 digits
  // EIN per-group spacing (2-7 layout)
  const EIN_STEP_A = 14 // first 2 digits
  const EIN_STEP_B = 14 // last 7 digits (slightly tighter like SSN last group)

  if (data.tinType === 'ssn') {
    const [a, b, c] = chunkSSN(data.tin)
    // Draw each digit separately to match segmented boxes precisely
    for (let i = 0; i < a.length; i++) {
      page.drawText(a[i], { x: SSN_XA + i * SSN_STEP_A + NUDGE_X, y: TIN_Y + NUDGE_Y, size: SSN_FONT_SIZE, font: mono, color: rgb(0,0,0) })
    }
    for (let i = 0; i < b.length; i++) {
      page.drawText(b[i], { x: SSN_XB + i * SSN_STEP_B + NUDGE_X, y: TIN_Y + NUDGE_Y, size: SSN_FONT_SIZE, font: mono, color: rgb(0,0,0) })
    }
    for (let i = 0; i < c.length; i++) {
      page.drawText(c[i], { x: SSN_XC + i * SSN_STEP_C + NUDGE_X, y: TIN_Y + NUDGE_Y, size: SSN_FONT_SIZE, font: mono, color: rgb(0,0,0) })
    }
  } else {
    const [ea, eb] = chunkEIN(data.tin)
    // Draw EIN digits per-box with adjustable spacing
    for (let i = 0; i < ea.length; i++) {
      page.drawText(ea[i], { x: EIN_XA + i * EIN_STEP_A + NUDGE_X, y: TIN_Y + EIN_Y_OFFSET + NUDGE_Y, size: SSN_FONT_SIZE, font: mono, color: rgb(0,0,0) })
    }
    for (let i = 0; i < eb.length; i++) {
      page.drawText(eb[i], { x: EIN_XB + i * EIN_STEP_B + NUDGE_X, y: TIN_Y + EIN_Y_OFFSET + NUDGE_Y, size: SSN_FONT_SIZE, font: mono, color: rgb(0,0,0) })
    }
  }

  // Part II: Certification (signature and date). We'll place typed signature and date.
  const dateISO = data.dateISO ?? new Date().toISOString().slice(0, 10)
  // Coordinates and box sizing for signature image
  const SIGN_X = 120
  const SIGN_BASELINE_Y = height - 595 // same baseline used for typed signature
  const SIGN_W = 220
  const SIGN_H = 25 // smaller height to avoid overlapping adjacent text
  const SIGN_Y = SIGN_BASELINE_Y - SIGN_H / 2 // vertically center around baseline

  // Require a signature: either drawn image or typed name
  const hasImage = !!data.signatureImageDataUrl && data.signatureImageDataUrl.startsWith('data:image')
  const hasTyped = !!data.signatureName && data.signatureName.trim().length > 0
  if (!hasImage && !hasTyped) {
    throw new Error('Signature is required')
  }

  if (hasImage) {
    try {
      const bytes = dataUrlToUint8Array(data.signatureImageDataUrl as string)
      // Prefer PNG for crisp lines
      const img = await pdfDoc.embedPng(bytes)
      const scale = Math.min(SIGN_W / img.width, SIGN_H / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      page.drawImage(img, { x: SIGN_X + NUDGE_X, y: SIGN_Y + NUDGE_Y, width: dw, height: dh })
    } catch (e) {
      // Fallback to typed if embedding fails and typed exists
      if (hasTyped) {
        draw(data.signatureName, 120, height - 604, 12)
      } else {
        throw e
      }
    }
  } else {
    // Typed signature
    draw(data.signatureName, 120, height - 604, 12)
  }

  // Date stays aligned with the right-side date field
  draw(dateISO, 480, height - 604, 12)

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const file = new File([blob], 'W-9.pdf', { type: 'application/pdf' })
  return file
}
