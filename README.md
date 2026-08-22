# Papasud — ERP

ERP para **Papasud S.A.**, productora de semilla de papa del sudeste
bonaerense. Construido en la hackathon de Cursor, Mar del Plata.

Tiene las dos mitades que necesita una productora: el **ERP clásico**
—contactos, stock multi-ubicación, insumos y precios— y lo **propio del campo**:
el plano de los pivotes de riego, órdenes de trabajo por voz, análisis de fotos
del cultivo y un copiloto sobre el histórico.

## Arrancar

```bash
pnpm install
cd apps/hackmdp
cp .env.example .env.local     # completar DATABASE_URL y la clave del modelo
npx next dev --port 3200
```

Con `DEMO_AUTOLOGIN=true` se entra derecho al panel, sin pantalla de login.

## Lo que hace

| | |
|---|---|
| **El campo en vivo** | El plano del pivote como el del plano en papel. Los teléfonos se ven moverse por GPS, las fotos aparecen donde se sacaron, y la cámara está ahí mismo. |
| **Órdenes por voz** | El ingeniero dicta lo que hizo y sale la orden estructurada: lote, tarea, insumo, dosis y horas. |
| **Foto del cultivo** | Diagnóstico con confianza declarada, ficha de la enfermedad e imágenes de referencia para comparar. |
| **Avisos del campo** | Lo que detectó una foto queda pendiente, con sus coordenadas, hasta que alguien va a mirarlo y anota qué encontró. |
| **Copiloto** | Preguntas en lenguaje natural sobre el histórico. Muestra la consulta que corrió. |
| **Stock** | Las cuatro ubicaciones, lotes de semilla, movimientos y conteos. |

## Los datos son reales

Salen de los archivos que pasó Papasud:

- **436 movimientos de stock** de la campaña 2026, con remito, DTV de SENASA,
  bolsas, kilos, transportista y destino
- **24 lotes** del plano de Santa Ana, cada uno un sector del círculo de riego
  ubicado por pivote, cuadrante y anillo
- **39 variedades**, **66 agroquímicos** con su marca comercial, y **3 órdenes
  de aplicación** con aplicador, hora y herramienta

Lo único estimado es el histórico de rendimientos anterior a 2026, porque los
archivos solo cubren la campaña en curso. Está marcado como tal en la base.

## Reconocimiento de imágenes

No es un clasificador entrenado, y es a propósito. Los datasets públicos de
enfermedad de papa derivan de PlantVillage: hojas sobre fondo blanco, de
laboratorio. Un modelo entrenado ahí saca 99% en su propio test y cae a 30-40%
con fotos de campo — fallando con mucha confianza, que es lo peor cuando de un
diagnóstico sale una aplicación que cuesta dinero.

En su lugar: un modelo con visión acotado al dominio, con un **umbral del 60%
por debajo del cual el sistema dice "no concluyente"** en vez de arriesgar, un
catálogo cerrado de diez hallazgos, y las imágenes del dataset usadas como
**referencia visual** para que el agrónomo compare.

## Documentación

`CLAUDE.md` tiene el detalle: cómo cargar la base, las trampas del dominio
(«lote» significa dos cosas distintas), la geometría de los pivotes y las
decisiones de diseño.
