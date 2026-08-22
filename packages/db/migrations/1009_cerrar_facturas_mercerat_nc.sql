-- Reparación puntual: cerrar IVR-000268 e IVR-000302 de MERCERAT JULIO RICARDO
-- con la NC-00000005.
--
-- Contexto: la NC "devolución de insumos" ($215.512,37) cubre EXACTAMENTE el
-- saldo pendiente de esas 2 facturas (138.050,00 + 77.462,37 = 215.512,37),
-- pero quedó cargada como crédito a nivel cliente (factura_id NULL). Resultado:
-- saldo neto del cliente = 0 (al día), pero las 2 facturas seguían abiertas
-- (pendiente/parcial) y aparecían como "Remitos Pendientes" en el detail sheet
-- y en rojo en la pestaña Remitos.
--
-- Fix: marcamos esas 2 facturas como saldadas (total_pagado = total → estado
-- pagada). saldo_pendiente es GENERATED (total - total_pagado) → queda 0.
-- saldo_actual de la vista NO cambia: sigue restando la NC vía
-- total_notas_credito, y no referencia total_pagado (total_cobrado sale de
-- cobros.monto). El balance en Movimientos ya está cubierto por la NC.
--
-- Idempotente: tras correr, saldo_pendiente = 0 → re-ejecutar afecta 0 filas.

UPDATE facturas
   SET total_pagado = total,
       estado = 'pagada'
 WHERE tipo_factura = 'IVR'
   AND cliente_id = '12f39a69-cc48-4502-a846-043011f6a9da'
   AND nro_factura IN ('IVR-000268', 'IVR-000302')
   AND estado IN ('pendiente', 'parcial', 'vencida')
   AND saldo_pendiente > 0;
