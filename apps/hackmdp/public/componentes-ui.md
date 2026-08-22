# Componentes UI — Papasud S.A.

Complemento de [paleta-colores.md](./paleta-colores.md): acá se definen los
tokens de forma (radios, sombras, espaciados) y las especificaciones de los
componentes base de la interfaz. Línea de diseño: **botones con esquinas
redondeadas al máximo (pill/cápsula)**, coherente con la mascota — todo en la
ilustración es orgánico y sin ángulos rectos (la papa, el chaleco, el
sombrero).

## Radios (border-radius)

Escala de radios. Botones y elementos interactivos usan `radius-full`
(cápsula) como default; el resto de la interfaz usa radios más chicos para no
competir visualmente con los botones.

| Token | Valor | Uso |
|---|---|---|
| `radius-xs` | `6px` | inputs de texto, checkboxes |
| `radius-sm` | `10px` | tags, badges pequeños |
| `radius-md` | `14px` | cards, modales, tooltips |
| `radius-lg` | `20px` | paneles grandes, hero cards |
| `radius-full` | `999px` | **botones, chips de estado, avatar, campo de búsqueda** |

```css
:root {
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-full: 999px;
}
```

## Botones

Todos los botones son cápsula (`border-radius: var(--radius-full)`), con
padding horizontal generoso para que la forma se note. Altura fija por
tamaño para que el radio siempre luzca circular en los extremos.

| Tamaño | Alto | Padding horizontal | Texto |
|---|---|---|---|
| `sm` | 32px | 16px | 13px / 600 |
| `md` | 40px | 20px | 14px / 600 |
| `lg` | 48px | 28px | 16px / 600 |

### Variantes

| Variante | Fondo | Texto | Borde | Uso |
|---|---|---|---|---|
| **Primario** | `sprout-700` → hover `sprout-900` | `#FFFFFF` | ninguno | acción principal de campo (crear orden, guardar lote) |
| **IA / Copiloto** | `badge-blue-700` → hover `badge-blue-500`* | `#FFFFFF` | ninguno | acciones relacionadas al copiloto |
| **Secundario** | transparente | `ink-900` | `1.5px solid ink-200` | acciones neutras (cancelar, cerrar) |
| **Tierra (ghost)** | `potato-100` → hover `potato-300` | `potato-900` | ninguno | acciones suaves dentro de tarjetas |
| **Peligro** | `danger` → hover `#8F3A2D` | `#FFFFFF` | ninguno | eliminar, rechazar orden |
| **Deshabilitado** | `ink-200` | `ink-400` | ninguno | — |

\* en hover el azul se aclara un paso para dar feedback sin perder contraste con texto blanco (verificar AA al implementar).

```css
.btn {
  border-radius: var(--radius-full);
  border: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 120ms ease, transform 80ms ease;
}
.btn:active { transform: scale(0.97); }

.btn--sm { height: 32px; padding: 0 16px; font-size: 13px; }
.btn--md { height: 40px; padding: 0 20px; font-size: 14px; }
.btn--lg { height: 48px; padding: 0 28px; font-size: 16px; }

.btn--primary   { background: var(--sprout-700); color: #FFFFFF; }
.btn--primary:hover { background: var(--sprout-900); }

.btn--ia        { background: var(--badge-blue-700); color: #FFFFFF; }
.btn--ia:hover  { background: var(--badge-blue-500); }

.btn--secondary { background: transparent; color: var(--ink-900); border: 1.5px solid var(--ink-200); }
.btn--secondary:hover { background: var(--ink-050); }

.btn--ghost     { background: var(--potato-100); color: var(--potato-900); }
.btn--ghost:hover { background: var(--potato-300); }

.btn--danger    { background: var(--danger); color: #FFFFFF; }
.btn--danger:hover { background: #8F3A2D; }

.btn--disabled  { background: var(--ink-200); color: var(--ink-400); cursor: not-allowed; }
```

### Botón de ícono (FAB / acción rápida en el campo)

Circular puro (`border-radius: 50%`, ancho = alto), pensado para acciones
tipo "dictar orden" en mobile mientras el ingeniero está en el lote.

```css
.btn-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--sprout-700);
  color: #FFFFFF;
  display: grid;
  place-items: center;
}
```

## Chips / badges de estado

Cápsula también (`radius-full`), coherente con los botones. Representan
estado de lote u orden de trabajo.

| Estado | Fondo | Texto |
|---|---|---|
| Saludable / activo | `sprout-100` | `sprout-900` |
| En crecimiento | `potato-100` | `potato-900` |
| Atención | `#F5E1C4` | `warning` |
| Alerta / plaga | `#F3D9D4` | `danger` |
| Copiloto / IA | `badge-blue-100` | `badge-blue-700` |

```css
.chip {
  border-radius: var(--radius-full);
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
```

## Inputs y buscador

Los campos de texto normales usan `radius-xs` (más cuadrados que los
botones, para diferenciar "esto se escribe" de "esto se toca"). El buscador
global, en cambio, es cápsula para que combine con la barra de acciones.

```css
.input {
  border-radius: var(--radius-xs);
  border: 1.5px solid var(--ink-200);
  height: 40px;
  padding: 0 14px;
  background: var(--ink-050);
}
.input:focus { border-color: var(--badge-blue-500); outline: none; }

.search-bar {
  border-radius: var(--radius-full);
  height: 40px;
  padding: 0 16px 0 40px; /* espacio para ícono de lupa */
  background: #FFFFFF;
  border: 1.5px solid var(--ink-200);
}
```

## Cards

`radius-md` (14px) para tarjetas de lote/orden/campaña, `radius-lg` (20px)
para paneles hero o el resumen del dashboard.

```css
.card {
  border-radius: var(--radius-md);
  background: var(--potato-050);
  border: 1px solid var(--ink-200);
  padding: 20px;
}

.card--hero {
  border-radius: var(--radius-lg);
}
```

## Avatares

Siempre circulares (`50%`), reflejando la cara redonda de la mascota.

```css
.avatar { border-radius: 50%; }
```

## Sombras (elevación)

Sombras suaves y cálidas (no negro puro), para que combinen con la paleta
tierra.

| Token | Valor | Uso |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(74, 59, 42, 0.08)` | cards en reposo |
| `shadow-md` | `0 4px 12px rgba(74, 59, 42, 0.12)` | dropdowns, popovers |
| `shadow-lg` | `0 12px 32px rgba(74, 59, 42, 0.18)` | modales |

```css
:root {
  --shadow-sm: 0 1px 2px rgba(74, 59, 42, 0.08);
  --shadow-md: 0 4px 12px rgba(74, 59, 42, 0.12);
  --shadow-lg: 0 12px 32px rgba(74, 59, 42, 0.18);
}
```

## Espaciado

Escala de 4px, para mantener ritmo consistente entre botones cápsula y el
resto de los componentes.

| Token | Valor |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |

## Reglas rápidas

- Si es **interactivo y se toca directo** (botón, chip, FAB, buscador,
  avatar): forma cápsula o circular.
- Si es **contenedor de contenido** (card, modal, input de texto): radio
  chico a mediano, nunca cápsula completa.
- El azul (`badge-blue-*`) queda reservado a IA/copiloto — no usarlo en
  botones de acciones de campo para no confundir "lo que decide la IA" con
  "lo que registra el ingeniero".
