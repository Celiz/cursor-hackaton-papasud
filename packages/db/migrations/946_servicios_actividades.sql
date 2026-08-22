-- Actividades del servicio técnico: chatter al estilo CRM.
-- Mirror de oportunidades_actividades pero para órdenes de servicio.
-- Tipos:
--   nota, llamada, email, whatsapp, archivo      (manuales)
--   estado_cambio, precio_listo                   (auto)
--   presupuesto_creado, presupuesto_enviado       (auto desde presupuestos)
--   facturado                                     (auto)

CREATE TABLE IF NOT EXISTS servicios_actividades (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id    UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  tipo           VARCHAR(50) NOT NULL,
  titulo         VARCHAR(255),
  descripcion    TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  usuario_id     UUID REFERENCES personas(id),
  usuario_nombre VARCHAR(255),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT servicios_actividades_tipo_check CHECK (
    tipo IN (
      'nota', 'llamada', 'email', 'whatsapp', 'archivo',
      'estado_cambio', 'precio_listo',
      'presupuesto_creado', 'presupuesto_enviado',
      'facturado', 'comunicado'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_servicios_actividades_servicio
  ON servicios_actividades(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicios_actividades_created
  ON servicios_actividades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_servicios_actividades_tipo
  ON servicios_actividades(tipo);
