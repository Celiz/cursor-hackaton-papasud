# Papasud — ERP

ERP para **Papasud**, productora de semilla de papa del sudeste bonaerense.
Construido para la hackathon de Cursor en Mar del Plata.

Tiene las dos mitades que necesita una productora: el **ERP clásico** (contactos,
stock multi-ubicación, insumos y precios) y lo **propio del campo** (lotes,
órdenes de trabajo, campañas, copiloto sobre el histórico).

## Arrancar desde cero

```bash
pnpm install                          # en la raíz del monorepo
cd apps/hackmdp
cp .env.example .env.local            # completar DATABASE_URL y la clave del modelo
npx next dev --port 3200
```

Con `DEMO_AUTOLOGIN=true` se entra derecho al panel, sin pantalla de login.

### Cargar la base

Contra una base vacía, en este orden:

```bash
psql "$DATABASE_URL" -f packages/db/migrations/000_baseline.sql   # esquema del ERP
for f in packages/db/migrations/1[23]*_papasud*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

| Migración | Qué hace |
|---|---|
| `1200_papasud.sql` | Tablas `pap_*` y la vista del copiloto |
| `1201_papasud_seed.sql` | Organización, usuario y catálogos base |
| `1203_papasud_stock_ot.sql` | Depósitos, productos y lotes de stock |
| `1204_papasud_vocabulario_real.sql` | Pivote/tercio, marcas comerciales, categorías reales |
| `1300_papasud_datos_reales.sql` | **Los datos de verdad**: 436 movimientos, 39 variedades, 24 lotes del plano, 3 órdenes, 66 agroquímicos |

Todas son idempotentes: correrlas de nuevo no duplica nada.

### Trampa con Supabase

El host `db.<proyecto>.supabase.co` resuelve **solo a IPv6**. Desde una máquina
sin salida IPv6 la conexión da timeout y parece contraseña equivocada. No lo es:
hay que habilitar *Connection pooling* en el panel y usar la cadena del pooler,
que va por IPv4 en el puerto 6543 y con el usuario `postgres.<proyecto>`.

## Qué incluye

| Sección | Qué hace |
|---|---|
| **Panel** | Campaña en curso, rinde por año, estado de los lotes, stock por ubicación |
| **Copiloto** | Preguntas en lenguaje natural sobre el histórico |
| **Campo** | Mapa de lotes, órdenes de trabajo por voz, establecimientos, insumos y dosis |
| **Producción** | Histórico, campañas, variedades |
| **Contactos** | Clientes y contactos |
| **Stock** | Cuatro ubicaciones, lotes de semilla, movimientos, conteos, reposición |
| **Insumos y precios** | Catálogo y listas de precios |
| **Reportes** · **Configuración** | Analytics, actividad, auditoría, alertas, aprobaciones |

## Las piezas que importan

### Copiloto — `app/api/copiloto/route.ts`

El modelo **no recuerda los números**: escribe SQL, el SQL corre, y la respuesta se
redacta sobre las filas que volvieron. Si la consulta no devuelve nada, se dice que
no hay datos. La interfaz muestra la consulta y la tabla que respaldan cada
respuesta.

Tres candados sobre el SQL que escribe el modelo: solo `SELECT`, filtro de
organización inyectado aunque el modelo se olvide, y límite de filas.

### Extracción de órdenes — `lib/campo/extraccion.ts`

Es el corazón del prototipo, y es **puro y determinista**. El modelo interpreta el
dictado; quién decide qué lote, qué tarea y qué insumo son reales es esta capa,
contra los catálogos de la base. No puede inventar un lote que no existe ni colar
una dosis fuera de rango sin que se marque.

La ubicación se dice de dos maneras y acepta las dos: por número de lote
("el 8", "lote 811") o por posición en el pivote ("pivote B, tercio 2"), que es
como la escribe la orden en papel. Si lo dictado es ambiguo, **no adivina**: avisa.

```bash
cd apps/hackmdp && npx tsx --test 'lib/campo/*.test.ts'   # 20 tests
```

### Mapa — `components/campo/MapaLotes.tsx`

Leaflet con capa satelital. Color = estado, radio = superficie, **borde rojo
punteado = sin orden de trabajo hace más de 21 días**.

Se carga con `dynamic({ ssr: false })` porque leaflet toca `window` al importarse.
Los colores y tipos viven aparte en `lotes-estado.ts` para poder importarlos desde
el server sin arrastrar leaflet.

## De dónde salen los datos

**Son reales**, extraídos de los archivos de Papasud (`1300_papasud_datos_reales.sql`):

- `Plano_Santa_Ana_2023.pdf` → los 24 lotes del campo Marisol. Cada lote es un
  **sector del círculo de riego**, ubicado por pivote (A/B), cuadrante y tercio
  del radio. No es un punto en un mapa.
- `Orden_de_trabajo.xlsx` → 3 órdenes de aplicación con sus renglones, aplicador,
  hora y herramienta (aplican con **drone**), más el catálogo de 66 agroquímicos
  del presupuesto de campaña con su precio en dólares.
- `Planilla_de_movimientos_2026.xls` → **436 movimientos de stock** en seis
  circuitos, con remito, DTV de SENASA, bolsas, kilos, transportista y destino.
  Y las 39 variedades que realmente siembran.

Lo único sintético que queda es el histórico de rendimientos por campaña
(`1202`), porque los archivos solo cubren 2026.

## Trampas del dominio

- **"Lote" significa dos cosas.** En el campo es la parcela (`pap_parcelas`,
  "Lote 8"); en el depósito es un batch de semilla (`productos_lotes`). Están
  deliberadamente separados. No los mezcles.
- Las cantidades de stock se guardan en **kilos** (`stock_depositos` usa `integer`).
- `stock_depositos.cantidad_total` y `conteos_ciclicos_items.diferencia` son
  **columnas generadas**: no se insertan.

## Navegación

`getSidebarLinks(orgTipo)` en `lib/sidebar-links.ts` es un switch por tipo de
organización. Papasud usa `case 'agro'`, con secciones propias en vez de reusar las
del ERP base — las de allá traen subitems a módulos que esta app no incluye y
quedarían links muertos.

`modulos_ocultos` en `org_members.permisos` es la poda de grano fino. **Los valores
tienen que ser del enum `Modulo`** (`lib/types/roles.ts`): se comparan contra
`item.permission`, así que un slug de URL ahí no hace nada.

## Detrás de un túnel

`lib/base-url.ts` arma el origen público desde `x-forwarded-*`. Hay un detalle que
cuesta encontrar: varios túneles terminan el TLS pero reenvían
`x-forwarded-proto: http`, porque describen el salto interno y no el que hizo el
navegador. Confiar en esa cabecera devuelve al visitante a `http://`, y ahí Chrome
deja de dar micrófono — que es justo lo que necesita el dictado.

## Reglas de la casa

- **UI en español, sin anglicismos.**
- **Las sheets van sólidas**: `components/ui/sheet.tsx` usa
  `bg-white dark:bg-gray-900`. Nada de `bg-*/opacity` ni `backdrop-blur`.
- Bottom sheets grandes antes que drawers laterales.

## Proveedor del modelo

`lib/ai/ai-service.ts` abstrae Groq / Gemini / Ollama. El cliente "groq" es
compatible con OpenAI, así que apunta a **OpenRouter** cuando solo hay
`OPENROUTER_API_KEY`. Cambiar de proveedor es una variable de entorno.
