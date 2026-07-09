"use client"
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { generateW9Pdf, W9Data } from '@/lib/pdf/w9'

export interface W9FormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: (file: File) => Promise<void> | void
}

export function W9Form({ open, onOpenChange, onGenerated }: W9FormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)

  const [name, setName] = useState('')
  const [taxClassification] = useState<W9Data['taxClassification']>('individual')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [tinType, setTinType] = useState<W9Data['tinType']>('ssn')
  const [tin, setTin] = useState('')
  const [signature, setSignature] = useState('')
  const [signatureMode, setSignatureMode] = useState<'type' | 'draw'>('type')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null)
  const [hasSignatureStrokes, setHasSignatureStrokes] = useState(false)

  // Signature pad handlers (draw mode)
  function getCanvasCtx() {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    return { canvas, ctx }
  }

  function getPos(e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleSigPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (signatureMode !== 'draw') return
    const obj = getCanvasCtx()
    if (!obj) return
    const { canvas, ctx } = obj
    const { x, y } = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleSigPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || signatureMode !== 'draw') return
    const obj = getCanvasCtx()
    if (!obj) return
    const { canvas, ctx } = obj
    const { x, y } = getPos(e, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasSignatureStrokes) setHasSignatureStrokes(true)
  }

  function finalizeSignature(e?: React.PointerEvent<HTMLCanvasElement>) {
    if (signatureMode !== 'draw') return
    const { canvas } = getCanvasCtx() ?? {}
    if (canvas) setSigDataUrl(canvas.toDataURL('image/png'))
    if (e) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    }
    setIsDrawing(false)
  }

  function handleSigPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    finalizeSignature(e)
  }

  function handleClearSignature() {
    const obj = getCanvasCtx()
    if (!obj) return
    const { canvas, ctx } = obj
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSigDataUrl(null)
    setHasSignatureStrokes(false)
  }

  async function handlePreview() {
    setError(null)
    // Basic required validations
    const nameOk = name.trim().length > 0
    const addressOk = address.trim().length > 0
    const cityOk = city.trim().length > 0
    const stateNorm = state.trim().toUpperCase()
    const stateOk = /^[A-Z]{2}$/.test(stateNorm)
    const zipDigits = zip.replace(/\D/g, '')
    const zipOk = zipDigits.length === 5
    const tinDigits = tin.replace(/\D/g, '')
    const tinOk = tinDigits.length === 9

    if (!nameOk) return setError('Name is required.'), undefined
    if (!addressOk) return setError('Address is required.'), undefined
    if (!cityOk) return setError('City is required.'), undefined
    if (!stateOk) return setError('State must be a 2-letter code (e.g., NY).'), undefined
    if (!zipOk) return setError('ZIP code must be 5 digits.'), undefined
    if (!tinOk) return setError(`${tinType.toUpperCase()} must be 9 digits.`), undefined
    // Signature required
    if (signatureMode === 'type') {
      if (!(signature.trim().length > 0)) return setError('Signature is required. Please type your name.'), undefined
    } else {
      // capture latest drawing
      if (!sigDataUrl) finalizeSignature()
      if (!hasSignatureStrokes) return setError('Signature is required. Please draw your signature.'), undefined
    }
    try {
      setLoading(true)
      const file = await generateW9Pdf({
        name,
        taxClassification,
        address,
        city,
        state: stateNorm,
        zip: zipDigits,
        tinType,
        tin: tinDigits,
        signatureName: signatureMode === 'type' ? signature.trim() : '',
        signatureImageDataUrl: signatureMode === 'draw' ? (sigDataUrl ?? undefined) : undefined,
      })
      const url = URL.createObjectURL(file)
      // Cleanup previous preview if any
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(url)
      setPreviewFile(file)
    } catch (e) {
      console.error(e)
      setError('Failed to generate preview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAttach() {
    setError(null)
    // Validate required fields when attaching without preview
    const nameOk = name.trim().length > 0
    const addressOk = address.trim().length > 0
    const cityOk = city.trim().length > 0
    const stateNorm = state.trim().toUpperCase()
    const stateOk = /^[A-Z]{2}$/.test(stateNorm)
    const zipDigits = zip.replace(/\D/g, '')
    const zipOk = zipDigits.length === 5
    const tinDigits = tin.replace(/\D/g, '')
    const tinOk = tinDigits.length === 9
    if (!nameOk) return setError('Name is required.'), undefined
    if (!addressOk) return setError('Address is required.'), undefined
    if (!cityOk) return setError('City is required.'), undefined
    if (!stateOk) return setError('State must be a 2-letter code (e.g., NY).'), undefined
    if (!zipOk) return setError('ZIP code must be 5 digits.'), undefined
    if (!tinOk) return setError(`${tinType.toUpperCase()} must be 9 digits.`), undefined
    if (signatureMode === 'type') {
      if (!(signature.trim().length > 0)) return setError('Signature is required. Please type your name.'), undefined
    } else {
      if (!sigDataUrl) finalizeSignature()
      if (!hasSignatureStrokes) return setError('Signature is required. Please draw your signature.'), undefined
    }
    try {
      setLoading(true)
      // If the user hasn't previewed yet, generate once then attach
      let file = previewFile
      if (!file) {
        const stateNorm = state.trim().toUpperCase()
        const zipDigits = zip.replace(/\D/g, '')
        const tinDigits = tin.replace(/\D/g, '')
        // Ensure signature captured in draw mode
        if (signatureMode === 'draw' && !sigDataUrl) finalizeSignature()
        file = await generateW9Pdf({
          name,
          taxClassification,
          address,
          city,
          state: stateNorm,
          zip: zipDigits,
          tinType,
          tin: tinDigits,
          signatureName: signatureMode === 'type' ? signature.trim() : '',
          signatureImageDataUrl: signatureMode === 'draw' ? (sigDataUrl ?? undefined) : undefined,
        })
      }
      await onGenerated(file as File)
      onOpenChange(false)
      // Clear sensitive data and preview after success
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setPreviewFile(null)
      setTin('')
      setSignature('')
      setSigDataUrl(null)
      setHasSignatureStrokes(false)
    } catch (e) {
      console.error(e)
      setError('Failed to attach W-9. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleBackToEdit() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewFile(null)
  }

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setPreviewFile(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-auto max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fill W-9 In App</DialogTitle>
        </DialogHeader>
        {!previewUrl ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="w9-name">Name (as shown on tax return) *</Label>
            <Input id="w9-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="col-span-1 sm:col-span-2 text-sm text-muted-foreground">
            Federal tax classification is pre-filled on the form: <span className="font-medium text-foreground">Individual/sole proprietor</span>.
          </div>

          {/* Exemptions removed */}

          <div className="col-span-1 sm:col-span-2 flex flex-col gap-1">
            <Label htmlFor="w9-address">Address (number, street, and apt. or suite no.) *</Label>
            <Input id="w9-address" value={address} onChange={e => setAddress(e.target.value)} required autoComplete="street-address" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="w9-city">City or town *</Label>
            <Input id="w9-city" value={city} onChange={e => setCity(e.target.value)} required autoComplete="address-level2" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="w9-state">State (2 letters) *</Label>
            <Input id="w9-state" value={state} onChange={e => setState(e.target.value.toUpperCase())} required maxLength={2} autoComplete="address-level1" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="w9-zip">ZIP code (5 digits) *</Label>
            <Input id="w9-zip" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, ''))} required inputMode="numeric" maxLength={5} autoComplete="postal-code" />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <div className="text-sm font-medium mb-2">Taxpayer Identification Number (TIN) *</div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="tinType" value="ssn" checked={tinType === 'ssn'} onChange={() => setTinType('ssn')} />
                SSN
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="tinType" value="ein" checked={tinType === 'ein'} onChange={() => setTinType('ein')} />
                EIN
              </label>
            </div>
            <Label htmlFor="w9-tin" className="sr-only">{tinType === 'ssn' ? 'SSN (9 digits)' : 'EIN (9 digits)'} *</Label>
            <Input
              id="w9-tin"
              className="mt-2"
              type="password"
              autoComplete="new-password"
              inputMode="numeric"
              value={tin}
              onChange={e => setTin(e.target.value.replace(/\D/g, ''))}
              maxLength={9}
              required
            />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <div className="text-sm font-medium mb-2">Signature (required)</div>
            <div className="flex items-center gap-4 text-sm mb-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="signatureMode" value="type" checked={signatureMode === 'type'} onChange={() => setSignatureMode('type')} />
                Type
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="signatureMode" value="draw" checked={signatureMode === 'draw'} onChange={() => setSignatureMode('draw')} />
                Draw
              </label>
            </div>
            {signatureMode === 'type' ? (
              <div className="flex flex-col gap-1">
                <Label htmlFor="w9-sign-typed">Type your name *</Label>
                <Input id="w9-sign-typed" value={signature} onChange={e => setSignature(e.target.value)} required />
              </div>
            ) : (
              <div>
                <div className="border rounded-md border-dashed bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={150}
                    className="w-full h-36 touch-none"
                    onPointerDown={handleSigPointerDown}
                    onPointerMove={handleSigPointerMove}
                    onPointerUp={handleSigPointerUp}
                    onPointerLeave={handleSigPointerUp}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button type="button" variant="outline" onClick={handleClearSignature}>Clear</Button>
                </div>
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Preview your generated W-9. If anything looks off, go back and edit before attaching.</div>
            <div className="w-full">
              <object key={previewUrl || 'pdf'} data={previewUrl || ''} type="application/pdf" className="w-full h-[70dvh] rounded-md border">
                <div className="p-3 text-sm">
                  PDF preview may not be supported on this device. 
                  <a href={previewUrl || '#'} target="_blank" rel="noreferrer" className="underline ml-1">Open the PDF in a new tab</a>.
                </div>
              </object>
            </div>
          </div>
        )}
        {error && <div className="text-destructive text-sm mt-2">{error}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          {!previewUrl ? (
            <Button onClick={handlePreview} disabled={loading}>
              {loading ? 'Generating…' : 'Preview PDF'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleBackToEdit} disabled={loading}>Back to Edit</Button>
              <Button onClick={handleAttach} disabled={loading}>
                {loading ? 'Attaching…' : 'Attach This PDF'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default W9Form
