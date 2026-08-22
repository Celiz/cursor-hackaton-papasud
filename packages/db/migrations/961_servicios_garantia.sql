-- Migracion 961: Seguimiento de garantía
--
-- Cuando un equipo se rompe y la reparación va por garantía, hay que trackear
-- todo el ida y vuelta con la fábrica: quién contactó, cuándo, qué repuesto
-- decidieron mandar, número de tracking, etc. Hasta ahora solo había el flujo
-- de "envío a reparar fuera del taller", que es distinto.
--
-- Un caso de garantía cuelga de un servicio (1:N — un mismo servicio puede
-- generar múltiples casos en escenarios raros). Sin workflow formal de
-- estados — el estado se infiere del último evento del timeline. La bandera
-- `cerrado` sirve solo para filtros.
--
-- Idempotente: re-ejecutable sin efectos secundarios.

CREATE TABLE IF NOT EXISTS servicios_garantia_casos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  servicio_id UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  resumen TEXT,
  proveedor TEXT, -- "fábrica" / distribuidor — texto libre (ej "Mindray Argentina")
  numero_caso_fabrica TEXT, -- ID que la fábrica le asigna al caso
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_cierre TIMESTAMPTZ,
  cerrado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garantia_casos_servicio ON servicios_garantia_casos(servicio_id);
CREATE INDEX IF NOT EXISTS idx_garantia_casos_org_abierto ON servicios_garantia_casos(org_id) WHERE NOT cerrado;
CREATE INDEX IF NOT EXISTS idx_garantia_casos_org_fecha ON servicios_garantia_casos(org_id, fecha_apertura DESC);

CREATE TABLE IF NOT EXISTS servicios_garantia_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL REFERENCES servicios_garantia_casos(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- denormalizado
  tipo TEXT NOT NULL CHECK (tipo IN (
    'contacto',
    'repuesto_solicitado',
    'repuesto_enviado',
    'repuesto_recibido',
    'nota'
  )),
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  descripcion TEXT,
  -- Campos opcionales según el tipo
  contacto_canal TEXT, -- 'email' | 'whatsapp' | 'telefono' | 'reunion'
  contacto_persona TEXT,
  repuesto_descripcion TEXT,
  repuesto_codigo TEXT,
  repuesto_cantidad INTEGER,
  tracking_codigo TEXT,
  tracking_courier TEXT,
  tracking_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garantia_eventos_caso ON servicios_garantia_eventos(caso_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_garantia_eventos_org_fecha ON servicios_garantia_eventos(org_id, fecha DESC);

COMMENT ON TABLE servicios_garantia_casos IS 'Casos de garantía abiertos contra fábrica. Cuelgan de un servicio.';
COMMENT ON TABLE servicios_garantia_eventos IS 'Timeline cronológico de un caso de garantía: contactos, repuestos, notas.';
