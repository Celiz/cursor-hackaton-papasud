-- Agrega código postal a clientes.
-- El formulario de "Nueva Empresa" no tenía dónde cargar el CP porque la
-- columna no existía.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_postal text;
