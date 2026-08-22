-- Calendario interno del sistema
-- Eventos generales: reuniones, viajes, instalaciones, capacitaciones, etc.

CREATE TABLE IF NOT EXISTS eventos_calendario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL DEFAULT 'evento',

  -- Temporal
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  todo_el_dia BOOLEAN DEFAULT false,

  -- Participantes
  creado_por UUID REFERENCES users(id),
  asignados UUID[] DEFAULT '{}',

  -- Relaciones opcionales
  oportunidad_id UUID REFERENCES oportunidades_venta(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  servicio_id UUID,

  -- Metadata
  ubicacion TEXT,
  color VARCHAR(20),
  google_event_id TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_eventos_cal_org_fecha ON eventos_calendario(org_id, fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_cal_asignados ON eventos_calendario USING GIN(asignados);
CREATE INDEX IF NOT EXISTS idx_eventos_cal_google ON eventos_calendario(google_event_id) WHERE google_event_id IS NOT NULL;

-- Add tipo CHECK (loose — allows future types without migration)
ALTER TABLE eventos_calendario ADD CONSTRAINT chk_eventos_cal_tipo
  CHECK (tipo IN ('evento', 'reunion', 'viaje', 'instalacion', 'capacitacion', 'servicio', 'visita', 'otro'));
