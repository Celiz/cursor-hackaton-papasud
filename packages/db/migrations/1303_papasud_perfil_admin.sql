-- 1303_papasud_perfil_admin.sql
--
-- El usuario demo no tenía fila en `perfiles`, y por eso la app se veía
-- "muerta": no abría el detalle de un producto, no dejaba crear, y las tabs no
-- respondían.
--
-- Por qué: la sesión y el sidebar leen el rol del JWT (org_members.rol = owner),
-- pero los BOTONES de cada pantalla preguntan por `useUserPermissions`, que va
-- a /api/auth/permissions. Ese endpoint busca al usuario en `perfiles`; si no
-- está, devuelve `isAdmin: false` y una lista de permisos vacía. Con eso
-- `hasPermission('productos','editar')` da false, `onNew` y `onEdit` llegan
-- undefined a la tabla, y los controles quedan inertes sin ningún error visible.
--
-- Son dos sistemas de permisos que conviven en el ERP heredado: el de la
-- organización (org_members) y el de perfiles y roles. Hay que sembrar los dos.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_persona uuid;
  v_rol     uuid;
BEGIN
  SELECT p.id INTO v_persona
    FROM personas p WHERE p.email = 'demo@papasud.com.ar' LIMIT 1;
  IF v_persona IS NULL THEN
    RAISE EXCEPTION 'Falta el usuario demo. Corré 1201_papasud_seed.sql primero.';
  END IF;

  -- Contra una base recién creada la tabla `roles` viene vacía: el rol se crea
  -- acá, así la migración funciona sobre un esquema limpio y no solo sobre una
  -- copia de la base de desarrollo.
  SELECT id INTO v_rol FROM roles WHERE es_admin ORDER BY nombre LIMIT 1;
  IF v_rol IS NULL THEN
    INSERT INTO roles (nombre, descripcion, es_admin, color)
    VALUES ('Admin', 'Acceso total al sistema', true, 'purple')
    RETURNING id INTO v_rol;
    RAISE NOTICE 'No había rol de administrador: se creó uno.';
  END IF;

  -- `perfiles.id` es la persona: la clave primaria es compartida.
  INSERT INTO perfiles (id, rol_id, permisos_custom, metadata)
  VALUES (v_persona, v_rol, '[]'::jsonb, '{}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET rol_id = EXCLUDED.rol_id;

  RAISE NOTICE 'Perfil de administrador asignado al usuario demo.';
END $$;
