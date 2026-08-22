-- Migration 997 — Portal de cliente: columnas y tablas de funcionalidad.
--
-- Cubre:
--   - servicios.solicitado_via, servicios.fotos_portal: para servicios pedidos
--     desde el portal.
--   - pedidos.origen, pedidos.estado_nuevo: para distinguir origen y cola de
--     aprobación.
--   - solicitudes_cotizacion: el "carrito" del portal (sin precios).
--   - pedidos_recurrentes: suscripciones.

BEGIN;

-- =================================================================
-- servicios: origen + fotos del portal
-- =================================================================
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS solicitado_via TEXT,
  ADD COLUMN IF NOT EXISTS fotos_portal JSONB DEFAULT '[]'::jsonb;
  -- fotos_portal = [{ url, filename, uploaded_at }]

CREATE INDEX IF NOT EXISTS idx_servicios_solicitado_via
  ON servicios(solicitado_via)
  WHERE solicitado_via IS NOT NULL;

-- =================================================================
-- pedidos: origen + estado pendiente_aprobacion
-- =================================================================
-- 'pendiente_aprobacion' es un valor nuevo del enum/text de pedidos.estado.
-- Como estado es TEXT, no requiere ALTER TYPE.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS origen TEXT;
  -- 'portal' | 'manual' | 'recurrente' | 'cotizacion'

CREATE INDEX IF NOT EXISTS idx_pedidos_origen
  ON pedidos(origen)
  WHERE origen IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_pendiente_aprobacion
  ON pedidos(org_id, created_at DESC)
  WHERE estado = 'pendiente_aprobacion';

-- =================================================================
-- solicitudes_cotizacion: el "carrito" del portal (sin precios)
-- =================================================================
CREATE TABLE IF NOT EXISTS solicitudes_cotizacion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  persona_id      UUID REFERENCES personas(id) ON DELETE SET NULL,
  numero          TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente',
  -- pendiente: esperando que Uno cotice
  -- cotizado: Uno ya emitió presupuesto (presupuesto_id set)
  -- rechazado: Uno rechazó la solicitud
  -- cancelado: el cliente la canceló antes de cotizarla
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ producto_id, equipo_id, descripcion, cantidad, notas }]
  notas           TEXT,
  presupuesto_id  UUID REFERENCES presupuestos_equipos(id) ON DELETE SET NULL,
  motivo_rechazo  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_cotizacion_cliente
  ON solicitudes_cotizacion(cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solicitudes_cotizacion_estado_org
  ON solicitudes_cotizacion(org_id, estado, created_at DESC);

-- =================================================================
-- pedidos_recurrentes: suscripciones del portal
-- =================================================================
CREATE TABLE IF NOT EXISTS pedidos_recurrentes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id          UUID REFERENCES clientes(id) ON DELETE CASCADE,
  persona_id          UUID REFERENCES personas(id) ON DELETE SET NULL,
  nombre              TEXT,
  frecuencia_dias     INT NOT NULL,
  proxima_fecha       DATE NOT NULL,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  pausado_hasta       DATE,
  items               JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ producto_id, cantidad, descripcion }]
  notas               TEXT,
  ultimo_pedido_id    UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  ultimo_pedido_at    TIMESTAMPTZ,
  total_pedidos       INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_recurrentes_cliente
  ON pedidos_recurrentes(cliente_id)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_pedidos_recurrentes_proxima
  ON pedidos_recurrentes(proxima_fecha)
  WHERE activo = true;

COMMIT;
