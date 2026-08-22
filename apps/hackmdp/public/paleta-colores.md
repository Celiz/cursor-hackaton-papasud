# Paleta de colores — Papasud (mascota "Papa Explorador")

Paleta extraída de la mascota de Papasud (la papa con chaleco de explorador,
sombrero, lupa y brotes verdes) para usar en la interfaz de tracking de
cultivos. La lógica: **tonos tierra/papa** como base neutra, **verde** para
todo lo que implica crecimiento/salud del cultivo, y **azul del logo** como
acento de datos e IA (copiloto, métricas).

## Primarios — Papa (base neutra / superficies)

Tonos cálidos de la piel de la papa. Sirven como fondo de tarjetas, superficies
secundarias y como color "tierra" del dominio (lotes, suelo).

| Nombre | Hex | Uso |
|---|---|---|
| `potato-900` | `#5C3D22` | texto sobre fondos claros, bordes fuertes |
| `potato-700` | `#8B5E34` | íconos, texto secundario cálido |
| `potato-500` | `#C89B6A` | acentos, hover de superficies tierra |
| `potato-300` | `#E4C49A` | superficies suaves, badges neutros |
| `potato-100` | `#F5E3C8` | fondo de tarjetas, fondo de página (modo claro) |
| `potato-050` | `#FBF1E2` | fondo general, tablas alternadas |

## Secundario — Verde chaleco / brote (crecimiento y estado)

El verde del chaleco y de los brotes es el color de "todo va bien": estados de
cultivo saludable, indicadores de crecimiento, botones de acción principal
relacionados al campo.

| Nombre | Hex | Uso |
|---|---|---|
| `sprout-900` | `#3D5A2A` | texto sobre chip verde, hover oscuro |
| `sprout-700` | `#5A7A3A` | chaleco (base), botón primario |
| `sprout-500` | `#7FA24C` | acento principal, gráficos de rendimiento |
| `sprout-300` | `#A8C97A` | brotes/hojas, estados "en crecimiento" |
| `sprout-100` | `#DCEBC2` | fondo de chip "activo/saludable" |

## Terciario — Sombrero / cuero (jerarquía y contraste)

Marrón grisáceo del sombrero de explorador. Útil para navegación, headers y
elementos que necesitan separarse del verde y del tono papa sin competir por
atención.

| Nombre | Hex | Uso |
|---|---|---|
| `explorer-800` | `#4A3B2A` | sidebar/topbar oscuro |
| `explorer-600` | `#6B5640` | bordes, iconografía secundaria |
| `explorer-400` | `#8F7A5E` | texto deshabilitado sobre oscuro |

## Acento — Placa "PAPASUD S.A." (dato, IA, marca)

Azul de la placa del chaleco. Reservado para lo que es "digital/inteligente"
dentro del producto: el copiloto de IA, links, estados informativos — para que
se distinga claramente de los estados de campo (verde) y alertas (rojo/ámbar).

| Nombre | Hex | Uso |
|---|---|---|
| `badge-blue-700` | `#1F3A6E` | texto de marca, botones de IA/copiloto |
| `badge-blue-500` | `#2C4E8C` | links, foco de inputs |
| `badge-blue-100` | `#DCE4F2` | fondo de mensajes del copiloto |
| `badge-white` | `#F7F7F5` | texto sobre azul, fondo de placa |

## Semánticos (estado de lote / orden de trabajo)

| Nombre | Hex | Uso |
|---|---|---|
| `success` | `#5A8A3C` | orden completada, lote sano — alineado a `sprout-700` |
| `warning` | `#C98A2E` | atención requerida, dosis límite — del tono `potato-700` calentado |
| `danger` | `#B14A3A` | plaga, incumplimiento, error de validación |
| `info` | `#2C4E8C` | mensajes del copiloto — igual a `badge-blue-500` |

## Neutros (texto e interfaz)

Grises con temperatura cálida (no grises puros), para no romper con el resto
de la paleta tierra.

| Nombre | Hex | Uso |
|---|---|---|
| `ink-900` | `#2A2420` | texto principal |
| `ink-700` | `#544A42` | texto secundario |
| `ink-400` | `#8C8078` | placeholder, texto deshabilitado |
| `ink-200` | `#D8D0C6` | bordes, separadores |
| `ink-050` | `#FAF7F2` | fondo base de la app (modo claro) |

## Detalles de la mascota (uso puntual, no como tokens de sistema)

Estos son colores muy específicos de ilustración — solo para avatares,
onboarding o ilustraciones, no para UI de datos:

- Mejillas / rubor: `#E8A07E`
- Ojos: `#3D2817` (iris), `#FFFFFF` (blanco del ojo)
- Cierre/metal: `#B5AFA6`

## Modo oscuro (sugerido)

Invertir sobre `explorer-800` / `ink-900` como fondo, manteniendo `sprout-500`
y `badge-blue-500` como acentos (suben ~1 paso de luminosidad para contraste
AA sobre fondo oscuro):

| Token | Claro | Oscuro |
|---|---|---|
| fondo base | `ink-050` `#FAF7F2` | `#1E1A16` |
| superficie | `potato-050` `#FBF1E2` | `#2A241F` |
| texto principal | `ink-900` `#2A2420` | `#F2ECE3` |
| acento primario | `sprout-700` `#5A7A3A` | `sprout-500` `#7FA24C` |
| acento IA | `badge-blue-700` `#1F3A6E` | `badge-blue-500` `#2C4E8C` |

## Variables CSS

```css
:root {
  --potato-900: #5C3D22;
  --potato-700: #8B5E34;
  --potato-500: #C89B6A;
  --potato-300: #E4C49A;
  --potato-100: #F5E3C8;
  --potato-050: #FBF1E2;

  --sprout-900: #3D5A2A;
  --sprout-700: #5A7A3A;
  --sprout-500: #7FA24C;
  --sprout-300: #A8C97A;
  --sprout-100: #DCEBC2;

  --explorer-800: #4A3B2A;
  --explorer-600: #6B5640;
  --explorer-400: #8F7A5E;

  --badge-blue-700: #1F3A6E;
  --badge-blue-500: #2C4E8C;
  --badge-blue-100: #DCE4F2;

  --success: #5A8A3C;
  --warning: #C98A2E;
  --danger: #B14A3A;
  --info: #2C4E8C;

  --ink-900: #2A2420;
  --ink-700: #544A42;
  --ink-400: #8C8078;
  --ink-200: #D8D0C6;
  --ink-050: #FAF7F2;
}
```

## Notas de contraste

- `ink-900` sobre `ink-050`/`potato-050`/`potato-100` cumple AA para texto de
  cuerpo.
- `sprout-700` y `badge-blue-700` sobre fondos claros (`potato-050`,
  `ink-050`) cumplen AA para texto y para botones con texto blanco encima.
- Evitar `sprout-300` o `potato-300` como fondo de texto pequeño: son tonos de
  acento/decorativos, no de lectura.
