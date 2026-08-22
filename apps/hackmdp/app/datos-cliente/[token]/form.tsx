'use client'

import { useState, useMemo } from 'react'
import { getFiscalProvider, type FormFieldDef, type CountryCode } from '@studio/fiscal'

const THEME_COLORS: Record<string, { primary: string; bg: string; ring: string; button: string }> = {
  purple: { primary: 'text-purple-700', bg: 'bg-purple-50', ring: 'focus:ring-purple-500', button: 'bg-purple-600 hover:bg-purple-700' },
  amber: { primary: 'text-amber-700', bg: 'bg-amber-50', ring: 'focus:ring-amber-500', button: 'bg-amber-600 hover:bg-amber-700' },
  emerald: { primary: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'focus:ring-emerald-500', button: 'bg-emerald-600 hover:bg-emerald-700' },
  blue: { primary: 'text-blue-700', bg: 'bg-blue-50', ring: 'focus:ring-blue-500', button: 'bg-blue-600 hover:bg-blue-700' },
  rose: { primary: 'text-rose-700', bg: 'bg-rose-50', ring: 'focus:ring-rose-500', button: 'bg-rose-600 hover:bg-rose-700' },
  cyan: { primary: 'text-cyan-700', bg: 'bg-cyan-50', ring: 'focus:ring-cyan-500', button: 'bg-cyan-600 hover:bg-cyan-700' },
}

interface DatosClienteFormProps {
  token: string
  orgNombre: string
  orgTheme: string
  orgPais: string
  clienteData: Record<string, string | boolean>
}

export function DatosClienteForm({ token, orgNombre, orgTheme, orgPais, clienteData }: DatosClienteFormProps) {
  const [form, setForm] = useState<Record<string, string | boolean>>(clienteData)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const theme = THEME_COLORS[orgTheme] || THEME_COLORS.purple
  const provider = useMemo(() => getFiscalProvider(orgPais as CountryCode), [orgPais])

  // Group fields by section (fields without section go into default groups)
  const fieldGroups = useMemo(() => {
    const fields = provider.clientFields
    // Determine groups based on field types/names for a natural layout
    const fiscal: FormFieldDef[] = []
    const contact: FormFieldDef[] = []
    const address: FormFieldDef[] = []
    const consent: FormFieldDef[] = []

    for (const f of fields) {
      if (f.type === 'checkbox') {
        consent.push(f)
      } else if (['email', 'telefono'].includes(f.name)) {
        contact.push(f)
      } else if (['direccion', 'localidad', 'provincia', 'comunidad_autonoma', 'cp', 'codigo_postal'].includes(f.name)) {
        address.push(f)
      } else {
        fiscal.push(f)
      }
    }

    return { fiscal, contact, address, consent }
  }, [provider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const res = await fetch(`/api/datos-cliente/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar datos')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Check if the primary required field (razon_social) has a value
  const canSubmit = typeof form.razon_social === 'string' && form.razon_social.trim().length > 0

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Datos enviados correctamente</h1>
          <p className="text-gray-600">
            Gracias por completar sus datos de facturacion.
            {orgNombre} los recibira en breve.
          </p>
        </div>
      </div>
    )
  }

  function renderField(field: FormFieldDef, colSpan2 = false) {
    const cls = colSpan2 ? 'md:col-span-2' : ''
    const inputCls = `w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent`

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.name} className={cls}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}{field.required ? ' *' : ''}
          </label>
          <select
            value={(form[field.name] as string) || ''}
            onChange={(e) => update(field.name, e.target.value)}
            required={field.required}
            className={inputCls}
          >
            <option value="">Seleccionar...</option>
            {field.options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )
    }

    if (field.type === 'checkbox') {
      return (
        <div key={field.name} className="md:col-span-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form[field.name]}
              onChange={(e) => update(field.name, e.target.checked)}
              required={field.required}
              className="rounded border-gray-300 mt-0.5"
            />
            <span className="text-sm text-gray-700">{field.label}{field.required ? ' *' : ''}</span>
          </label>
          {field.name === 'rgpd_consent' && (
            <p className="text-xs text-gray-500 mt-1 ml-6">
              De conformidad con el RGPD (UE) 2016/679, sus datos seran tratados para gestionar la relacion comercial con {orgNombre}.
            </p>
          )}
        </div>
      )
    }

    // text, email, tel, number, textarea
    const inputType = field.type === 'textarea' ? undefined : (field.type || 'text')

    if (field.type === 'textarea') {
      return (
        <div key={field.name} className={cls}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}{field.required ? ' *' : ''}
          </label>
          <textarea
            value={(form[field.name] as string) || ''}
            onChange={(e) => update(field.name, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            className={inputCls}
            rows={3}
          />
        </div>
      )
    }

    return (
      <div key={field.name} className={cls}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}{field.required ? ' *' : ''}
        </label>
        <input
          type={inputType}
          value={(form[field.name] as string) || ''}
          onChange={(e) => update(field.name, e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          className={inputCls}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className={`${theme.bg} rounded-t-xl p-6 border border-b-0 border-gray-200`}>
          <h1 className={`text-2xl font-bold ${theme.primary}`}>{orgNombre}</h1>
          <p className="text-gray-600 mt-1">Datos de facturacion</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-b-xl border border-gray-200 p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Datos fiscales */}
          {fieldGroups.fiscal.length > 0 && (
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4">Datos fiscales</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldGroups.fiscal.map((f, i) =>
                  renderField(f, i === 0)
                )}
              </div>
            </fieldset>
          )}

          {/* Contacto */}
          {fieldGroups.contact.length > 0 && (
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4">Contacto</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldGroups.contact.map(f => renderField(f))}
              </div>
            </fieldset>
          )}

          {/* Direccion de facturacion */}
          {fieldGroups.address.length > 0 && (
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4">Direccion de facturacion</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldGroups.address.map((f, i) =>
                  renderField(f, i === 0 && f.name === 'direccion')
                )}
              </div>
            </fieldset>
          )}

          {/* Consent (RGPD for ES) */}
          {fieldGroups.consent.length > 0 && (
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4">Consentimiento</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldGroups.consent.map(f => renderField(f))}
              </div>
            </fieldset>
          )}

          {/* Direccion de entrega */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">Direccion de entrega</legend>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.entrega_igual_facturacion}
                onChange={(e) => update('entrega_igual_facturacion', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Igual a la direccion de facturacion</span>
            </label>

            {!form.entrega_igual_facturacion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direccion de entrega</label>
                <input
                  type="text"
                  value={(form.direccion_entrega as string) || ''}
                  onChange={(e) => update('direccion_entrega', e.target.value)}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent`}
                />
              </div>
            )}
          </fieldset>

          {/* Submit */}
          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className={`w-full ${theme.button} text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? 'Enviando...' : 'Enviar datos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
