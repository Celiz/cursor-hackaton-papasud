-- Migration 928: Biblioteca de recursos internos

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Categorías de la biblioteca (por org)
CREATE TABLE IF NOT EXISTS biblioteca_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL,
  icono TEXT,
  color TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_biblioteca_categorias_org_slug
  ON biblioteca_categorias(org_id, slug);

-- Recursos
CREATE TABLE IF NOT EXISTS biblioteca_recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  categoria_id UUID REFERENCES biblioteca_categorias(id) ON DELETE SET NULL,
  tipo TEXT,
  formato TEXT,
  archivo_url TEXT,
  archivo_nombre TEXT,
  archivo_tamano BIGINT,
  link_externo TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  activo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES personas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_archivo_o_link CHECK (archivo_url IS NOT NULL OR link_externo IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_recursos_org_categoria
  ON biblioteca_recursos(org_id, categoria_id);

CREATE INDEX IF NOT EXISTS idx_biblioteca_recursos_org_tipo
  ON biblioteca_recursos(org_id, tipo);

CREATE INDEX IF NOT EXISTS idx_biblioteca_recursos_titulo_trgm
  ON biblioteca_recursos USING gin (titulo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_biblioteca_recursos_tags
  ON biblioteca_recursos USING gin (tags);

-- Vínculos many-to-many
CREATE TABLE IF NOT EXISTS biblioteca_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id UUID NOT NULL REFERENCES biblioteca_recursos(id) ON DELETE CASCADE,
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('equipo', 'producto')),
  entidad_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_biblioteca_vinculos_unique
  ON biblioteca_vinculos(recurso_id, entidad_tipo, entidad_id);

CREATE INDEX IF NOT EXISTS idx_biblioteca_vinculos_entidad
  ON biblioteca_vinculos(entidad_tipo, entidad_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_biblioteca_recursos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_biblioteca_recursos_updated_at ON biblioteca_recursos;
CREATE TRIGGER trg_biblioteca_recursos_updated_at
  BEFORE UPDATE ON biblioteca_recursos
  FOR EACH ROW EXECUTE FUNCTION update_biblioteca_recursos_updated_at();

-- Seed de categorías por org (solo orgs no-locus)
INSERT INTO biblioteca_categorias (org_id, nombre, slug, icono, color, orden)
SELECT o.id, x.nombre, x.slug, x.icono, x.color, x.orden
FROM organizations o
CROSS JOIN (VALUES
  ('Manuales', 'manuales', 'BookOpen', 'blue', 1),
  ('Folletos', 'folletos', 'Newspaper', 'purple', 2),
  ('Software', 'software', 'Download', 'emerald', 3),
  ('Fichas técnicas', 'fichas-tecnicas', 'FileText', 'amber', 4),
  ('Políticas internas', 'politicas', 'Shield', 'rose', 5),
  ('Otros', 'otros', 'Folder', 'gray', 6)
) AS x(nombre, slug, icono, color, orden)
WHERE (o.tipo IS NULL OR o.tipo != 'locus')
ON CONFLICT (org_id, slug) DO NOTHING;
