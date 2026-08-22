import { query } from '@/lib/db'
import { getFiscalProvider } from '@studio/fiscal'
import type { CountryCode } from '@studio/fiscal'
import { DatosClienteForm } from './form'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function DatosClientePage({ params }: PageProps) {
  const { token } = await params

  // Fetch solicitud by token
  const solicitudResult = await query(
    `SELECT s.*, o.nombre as org_nombre, o.theme as org_theme, o.pais as org_pais
     FROM solicitudes_datos_cliente s
     JOIN organizations o ON s.org_id = o.id
     WHERE s.token = $1`,
    [token]
  )

  const solicitud = solicitudResult.rows[0] as any

  if (!solicitud) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enlace no valido</h1>
          <p className="text-gray-600">Este enlace no existe o ya no esta disponible.</p>
        </div>
      </div>
    )
  }

  if (solicitud.estado === 'completado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Datos ya enviados</h1>
          <p className="text-gray-600">Sus datos de facturacion ya fueron completados. Gracias.</p>
        </div>
      </div>
    )
  }

  if (solicitud.expira_at && new Date(solicitud.expira_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enlace expirado</h1>
          <p className="text-gray-600">Este enlace ha expirado. Contacte a la empresa para solicitar uno nuevo.</p>
        </div>
      </div>
    )
  }

  // Fetch current client data
  const clienteResult = await query(
    `SELECT nombre, cuit, condicion_iva, email, telefono, direccion, localidad, provincia, codigo_postal
     FROM clientes WHERE id = $1 AND org_id = $2`,
    [solicitud.cliente_id, solicitud.org_id]
  )

  const cliente = clienteResult.rows[0] as any || {}
  const orgPais = (solicitud.org_pais || 'AR') as CountryCode
  const provider = getFiscalProvider(orgPais)

  // Map DB columns to provider field names
  const dbToField: Record<string, string | ((c: any) => string | boolean)> = {
    razon_social: (c: any) => c.nombre || '',
    cuit: (c: any) => c.cuit || '',
    nif: (c: any) => c.cuit || '',
    condicion_iva: (c: any) => c.condicion_iva || '',
    tipo_empresa: (c: any) => c.condicion_iva || '',
    email: (c: any) => Array.isArray(c.email) ? c.email[0] || '' : c.email || '',
    telefono: (c: any) => Array.isArray(c.telefono) ? c.telefono[0] || '' : c.telefono || '',
    direccion: (c: any) => c.direccion || '',
    localidad: (c: any) => c.localidad || '',
    provincia: (c: any) => c.provincia || '',
    cp: (c: any) => c.codigo_postal || '',
    codigo_postal: (c: any) => c.codigo_postal || '',
  }

  // Build initial form data from provider fields
  const clienteData: Record<string, string | boolean> = {}
  for (const field of provider.clientFields) {
    const mapper = dbToField[field.name]
    if (typeof mapper === 'function') {
      clienteData[field.name] = mapper(cliente)
    } else if (field.type === 'checkbox') {
      clienteData[field.name] = false
    } else {
      clienteData[field.name] = ''
    }
  }
  // Always include delivery fields
  clienteData.direccion_entrega = ''
  clienteData.entrega_igual_facturacion = true

  return (
    <DatosClienteForm
      token={token}
      orgNombre={solicitud.org_nombre}
      orgTheme={solicitud.org_theme || 'purple'}
      orgPais={orgPais}
      clienteData={clienteData}
    />
  )
}
