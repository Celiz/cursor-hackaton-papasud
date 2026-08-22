'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, Smartphone, Trash2, Search } from 'lucide-react'

type Contacto = {
  id: string
  nombre: string
  telefono: string
  email?: string
  empresa?: string
  updated_at: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function MisContactosPage() {
  const { data, mutate, isLoading } = useSWR<Contacto[]>('/api/persona-contactos', fetcher)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [canPick, setCanPick] = useState(false)

  useEffect(() => {
    setCanPick(typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window)
  }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMsg(null)
    try {
      const text = await file.text()
      const res = await fetch('/api/persona-contactos/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vcard: text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error')
      setMsg(`Importados ${json.inserted} nuevos, ${json.updated} actualizados, ${json.skipped} omitidos.`)
      mutate()
    } catch (err: any) {
      setMsg(`Error: ${err.message}`)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function handlePicker() {
    try {
      // @ts-expect-error Contact Picker API (Android Chrome)
      const picked: Array<{ name?: string[]; tel?: string[]; email?: string[] }> = await navigator.contacts.select(
        ['name', 'tel', 'email'],
        { multiple: true }
      )
      if (!picked || picked.length === 0) return
      const contacts = picked.flatMap(p => {
        const nombre = (p.name?.[0] || '').trim()
        const email = p.email?.[0]
        return (p.tel || []).map(t => ({ nombre, telefono: t, email }))
      })
      setBusy(true)
      setMsg(null)
      const res = await fetch('/api/persona-contactos/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contacts }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error')
      setMsg(`Importados ${json.inserted} nuevos, ${json.updated} actualizados.`)
      mutate()
    } catch (err: any) {
      setMsg(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Borrar este contacto de tu libreta?')) return
    await fetch(`/api/persona-contactos?id=${id}`, { method: 'DELETE' })
    mutate()
  }

  async function handleDeleteAll() {
    if (!confirm('¿Borrar TODOS tus contactos personales? Esta acción no se puede deshacer.')) return
    await fetch('/api/persona-contactos?all=true', { method: 'DELETE' })
    mutate()
  }

  const filtered = (data || []).filter(c => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mis contactos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Libreta personal. Los números de WhatsApp se mostrarán con el nombre que tenés acá.
          Sólo vos ves tus contactos.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {canPick && (
            <Button onClick={handlePicker} disabled={busy}>
              <Smartphone className="w-4 h-4 mr-2" />
              Importar del celular
            </Button>
          )}

          <label className="inline-flex">
            <input
              type="file"
              accept=".vcf,text/vcard,text/x-vcard"
              onChange={handleFile}
              disabled={busy}
              className="hidden"
            />
            <Button asChild disabled={busy} variant={canPick ? 'outline' : 'default'}>
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Subir archivo .vcf
              </span>
            </Button>
          </label>

          {(data?.length ?? 0) > 0 && (
            <Button onClick={handleDeleteAll} variant="ghost" className="ml-auto text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Borrar todo
            </Button>
          )}
        </div>

        {msg && <div className="mt-3 text-sm">{msg}</div>}

        {!canPick && (
          <div className="mt-4 text-xs text-muted-foreground border-l-2 border-muted pl-3 space-y-1">
            <div className="font-medium">¿Cómo exportar en iOS?</div>
            <div>Entrá a <a href="https://icloud.com/contacts" target="_blank" rel="noreferrer" className="underline">icloud.com/contacts</a> desde la compu → seleccioná todos (Cmd+A) → engranaje → Exportar vCard. Subí el .vcf acá.</div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {data?.length ?? 0} contactos
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {data?.length ? 'Ningún contacto coincide con la búsqueda.' : 'Todavía no importaste contactos.'}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{c.nombre}</div>
                  <div className="text-sm text-muted-foreground">
                    {c.telefono}{c.empresa ? ` · ${c.empresa}` : ''}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
