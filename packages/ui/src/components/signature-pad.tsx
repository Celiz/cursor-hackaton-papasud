'use client'

import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'

export interface SignatureData {
  firma_imagen: string
  firma_nombre: string
}

export interface SignaturePadProps {
  onSign: (data: SignatureData) => void
  nombrePrefill?: string
  width?: number
  height?: number
  disabled?: boolean
  loading?: boolean
}

export function SignaturePad({
  onSign,
  nombrePrefill = '',
  width = 400,
  height = 200,
  disabled = false,
  loading = false,
}: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null)
  const [nombre, setNombre] = useState(nombrePrefill)
  const [isEmpty, setIsEmpty] = useState(true)

  function handleClear() {
    sigRef.current?.clear()
    setIsEmpty(true)
  }

  function handleEnd() {
    setIsEmpty(sigRef.current?.isEmpty() ?? true)
  }

  function handleSign() {
    if (!sigRef.current || sigRef.current.isEmpty() || !nombre.trim()) return
    onSign({
      firma_imagen: sigRef.current.toDataURL('image/png'),
      firma_nombre: nombre.trim(),
    })
  }

  const canSign = !isEmpty && nombre.trim().length > 0 && !disabled && !loading

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="firma-nombre">Nombre completo del firmante</Label>
        <Input
          id="firma-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ingrese su nombre completo"
          disabled={disabled}
        />
      </div>

      <div>
        <Label>Firma</Label>
        <div className="border rounded-md bg-white overflow-hidden" style={{ width, height }}>
          <SignatureCanvas
            ref={sigRef}
            canvasProps={{
              width,
              height,
              className: 'signature-canvas',
              style: { width: '100%', height: '100%' },
            }}
            onEnd={handleEnd}
          />
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={disabled}>
            Limpiar
          </Button>
        </div>
      </div>

      <Button onClick={handleSign} disabled={!canSign} className="w-full">
        {loading ? 'Firmando...' : 'Firmar'}
      </Button>
    </div>
  )
}
