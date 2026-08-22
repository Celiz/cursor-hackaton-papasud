/**
 * Contenido de ayuda contextual para cada página del sistema
 * Incluye título, descripción, casos de uso y ejemplos prácticos
 */

export interface PageHelpContent {
  title: string;
  description: string;
  useCases: string[];
  examples: string[];
  tips?: string[];
}

export const pageHelpContent: Record<string, PageHelpContent> = {
  // CONTABILIDAD
  'plan-cuentas': {
    title: '¿Qué es el Plan de Cuentas?',
    description: 'El Plan de Cuentas es la estructura básica de tu contabilidad. Es como el "esqueleto" donde se organizan todas las operaciones financieras de tu empresa.',
    useCases: [
      'Organizar tus ingresos, gastos, activos y pasivos',
      'Generar reportes contables y balances',
      'Cumplir con requisitos legales y fiscales',
      'Tomar decisiones financieras informadas'
    ],
    examples: [
      'Cuenta "Caja" (1.1.01): Para registrar el dinero en efectivo',
      'Cuenta "Bancos" (1.1.02): Para movimientos de cuentas bancarias',
      'Cuenta "Ventas" (4.1.01): Para registrar ingresos por ventas',
      'Cuenta "Sueldos" (5.1.01): Para registrar gastos de personal'
    ],
    tips: [
      'Las cuentas se organizan por niveles: Nivel 1 son las categorías principales',
      'Usa códigos numéricos consistentes (ej: 1.X para Activos, 4.X para Ingresos)',
      'No elimines cuentas con movimientos, mejor desactívalas'
    ]
  },

  // CLIENTES Y VENTAS
  'clientes': {
    title: '¿Para qué sirve Clientes?',
    description: 'Gestiona toda la información de tus clientes: datos de contacto, historial de compras, facturación y cuenta corriente.',
    useCases: [
      'Guardar información de contacto y datos fiscales',
      'Ver historial completo de ventas y servicios',
      'Gestionar cuenta corriente y saldos',
      'Generar reportes de mejores clientes'
    ],
    examples: [
      'Cliente "Farmacia Central": Ver todas sus compras del año',
      'Cliente con saldo a favor: Aplicar crédito a próxima compra',
      'Cliente moroso: Ver facturas pendientes de pago',
      'Análisis ABC: Identificar tus clientes más importantes'
    ],
    tips: [
      'Completa el CUIT/CUIL para facturación electrónica',
      'Usa etiquetas para segmentar clientes (VIP, Mayorista, etc.)',
      'Revisa periódicamente los saldos de cuenta corriente'
    ]
  },

  'presupuestos': {
    title: '¿Qué son los Presupuestos?',
    description: 'Crea cotizaciones para tus clientes antes de cerrar una venta. Puedes convertir presupuestos aprobados en pedidos o facturas directamente.',
    useCases: [
      'Enviar cotizaciones formales a clientes',
      'Dar seguimiento a oportunidades de venta',
      'Convertir presupuestos aprobados en pedidos',
      'Analizar tasas de conversión'
    ],
    examples: [
      'Presupuesto de equipamiento médico para hospital',
      'Cotización de mantenimiento anual',
      'Propuesta de venta de insumos con descuento por volumen',
      'Presupuesto vencido: Reactivar con nuevo precio'
    ]
  },

  'pedidos': {
    title: '¿Para qué son los Pedidos?',
    description: 'Registra órdenes de compra confirmadas de tus clientes. Los pedidos son el paso intermedio entre el presupuesto y la factura.',
    useCases: [
      'Confirmar ventas antes de facturar',
      'Gestionar stock reservado para entregas futuras',
      'Planificar producción y logística',
      'Hacer seguimiento del estado de cada orden'
    ],
    examples: [
      'Pedido pendiente: Stock reservado para entrega el viernes',
      'Pedido parcial: Ya se facturó 50%, falta 50%',
      'Pedido completo: Listo para archivar',
      'Pedido con instalación: Coordinar técnico'
    ]
  },

  'facturas': {
    title: '¿Qué son las Facturas?',
    description: 'Genera comprobantes de venta oficiales. Registra pagos, envía facturas por email y controla cobros pendientes.',
    useCases: [
      'Emitir comprobantes fiscales (A, B, C)',
      'Registrar ventas para contabilidad',
      'Controlar cobros y gestionar morosidad',
      'Generar reportes de ventas por período'
    ],
    examples: [
      'Factura A: Para cliente inscripto en IVA',
      'Factura B: Para consumidor final',
      'Nota de crédito: Anular o modificar factura anterior',
      'Factura con múltiples pagos: Efectivo + transferencia'
    ],
    tips: [
      'Verifica el tipo de factura según la condición del cliente',
      'Registra los pagos para mantener actualizada la cuenta corriente',
      'Usa notas de crédito para devoluciones o correcciones'
    ]
  },

  'pagos': {
    title: '¿Cómo funciona Pagos?',
    description: 'Registra todos los cobros de tus clientes: efectivo, cheques, transferencias, tarjetas. Controla qué facturas están pagas y cuáles pendientes.',
    useCases: [
      'Imputar pagos a facturas específicas',
      'Registrar anticipos y saldos a favor',
      'Conciliar pagos con extractos bancarios',
      'Gestionar cheques diferidos'
    ],
    examples: [
      'Pago parcial: Cliente paga 50% ahora, 50% en 30 días',
      'Pago múltiple: Un pago cubre 3 facturas',
      'Cheque diferido: Pago registrado pero no cobrado',
      'Anticipo: Cliente paga antes de recibir factura'
    ]
  },

  // PRODUCTOS E INVENTARIO
  'productos': {
    title: '¿Para qué sirve Productos?',
    description: 'Gestiona tu catálogo completo de productos y servicios: precios, stock, categorías, proveedores y más.',
    useCases: [
      'Mantener catálogo actualizado con precios',
      'Controlar stock mínimo y alertas de reposición',
      'Gestionar múltiples precios (lista, mayorista, etc.)',
      'Analizar productos más vendidos'
    ],
    examples: [
      'Producto con lotes: Medicamento con fecha de vencimiento',
      'Producto con variantes: Remera en 3 talles y 4 colores',
      'Servicio: Mantenimiento sin stock físico',
      'Producto bajo stock: Alerta para reordenar'
    ],
    tips: [
      'Usa códigos de barras para agilizar ventas',
      'Define stock mínimo para recibir alertas automáticas',
      'Marca productos como "Activo" o "Inactivo" en lugar de eliminarlos'
    ]
  },

  'inventario': {
    title: '¿Qué es Inventario?',
    description: 'Controla el stock en tiempo real: entradas, salidas, ajustes, movimientos entre depósitos y auditorías.',
    useCases: [
      'Registrar compras y aumentos de stock',
      'Descontar stock por ventas automáticamente',
      'Hacer inventarios físicos y ajustes',
      'Transferir productos entre sucursales'
    ],
    examples: [
      'Entrada por compra: Llegaron 100 unidades del proveedor',
      'Salida por venta: Descuento automático al facturar',
      'Ajuste por rotura: 5 unidades dañadas',
      'Transferencia: Mover 20 unidades a otra sucursal'
    ]
  },

  // SERVICIOS Y TÉCNICOS
  'servicios': {
    title: '¿Qué son Servicios Técnicos?',
    description: 'Gestiona todo el ciclo de servicios técnicos: desde la solicitud hasta la facturación, incluyendo técnicos, repuestos y garantías.',
    useCases: [
      'Registrar solicitudes de reparación',
      'Asignar técnicos y programar visitas',
      'Controlar repuestos utilizados',
      'Facturar mano de obra y materiales'
    ],
    examples: [
      'Reparación de equipo médico en garantía',
      'Mantenimiento preventivo programado',
      'Instalación de equipo nuevo en cliente',
      'Servicio express: Reparación en el día'
    ],
    tips: [
      'Adjunta fotos del antes/después de la reparación',
      'Registra los insumos para descontar stock automáticamente',
      'Usa estados para hacer seguimiento (Pendiente → En Proceso → Finalizado)'
    ]
  },

  'comodatos': {
    title: '¿Para qué sirven Comodatos?',
    description: 'Gestiona equipos prestados a clientes: contratos, movimientos, instalaciones, mantenimientos y alertas de vencimiento.',
    useCases: [
      'Controlar equipos en préstamo a clientes',
      'Programar mantenimientos preventivos',
      'Alertas de vencimiento de contratos',
      'Facturar servicios de mantenimiento'
    ],
    examples: [
      'Nebulizador en comodato en farmacia',
      'Equipo de oxígeno en préstamo a paciente',
      'Demo de equipo médico por 30 días',
      'Alquiler de compresor industrial'
    ]
  },

  'equipos-alertas': {
    title: '¿Qué son las Alertas de Equipos?',
    description: 'Notificaciones automáticas sobre equipos: vencimientos de contratos, mantenimientos pendientes, fallas reportadas.',
    useCases: [
      'Recibir avisos de vencimientos próximos',
      'Programar mantenimientos preventivos',
      'Gestionar prioridades de servicio técnico',
      'Automatizar seguimiento de garantías'
    ],
    examples: [
      'Alerta roja: Contrato vence en 3 días',
      'Alerta amarilla: Mantenimiento programado para la próxima semana',
      'Alerta de falla: Equipo reportó error crítico',
      'Alerta verde: Mantenimiento realizado con éxito'
    ]
  },

  // MANTENIMIENTO
  'mantenimiento': {
    title: '¿Cómo funciona Mantenimiento?',
    description: 'Planifica y ejecuta mantenimientos preventivos y correctivos de equipos. Crea planes recurrentes y órdenes de trabajo.',
    useCases: [
      'Crear planes de mantenimiento preventivo',
      'Generar órdenes de trabajo automáticas',
      'Registrar historial de mantenimientos',
      'Analizar frecuencia de fallas'
    ],
    examples: [
      'Plan mensual: Limpieza y calibración de equipos',
      'Plan anual: Cambio de filtros y aceites',
      'Mantenimiento correctivo: Reparación de falla',
      'Checklist: Verificación de 15 puntos'
    ]
  },

  // EMAIL MARKETING
  'email-marketing': {
    title: '¿Para qué sirve Email Marketing?',
    description: 'Envía campañas de email masivas a tus clientes: newsletters, promociones, seguimiento de presupuestos y automatizaciones.',
    useCases: [
      'Enviar promociones a todos los clientes',
      'Automatizar emails de seguimiento',
      'Segmentar listas por tipo de cliente',
      'Analizar tasas de apertura y clicks'
    ],
    examples: [
      'Campaña mensual: Nuevos productos y ofertas',
      'Workflow automático: Email 3 días después de presupuesto',
      'Email personalizado: Feliz cumpleaños con descuento',
      'Newsletter: Novedades y consejos técnicos'
    ]
  },

  'listas': {
    title: '¿Qué son las Listas de Email?',
    description: 'Organiza tus contactos en listas para enviar campañas segmentadas. Puedes crear listas manuales (agregar contactos uno por uno) o dinámicas (se actualizan automáticamente según criterios).',
    useCases: [
      'Agrupar clientes por tipo o interés',
      'Segmentar audiencia para campañas específicas',
      'Crear listas dinámicas que se actualicen automáticamente',
      'Gestionar suscripciones y bajas'
    ],
    examples: [
      'Lista "Clientes VIP": Tus mejores clientes para ofertas exclusivas',
      'Lista "Últimas Compras": Dinámica con clientes que compraron en los últimos 30 días',
      'Lista "Newsletter General": Todos los suscriptores a tu boletín',
      'Lista "Prospectos": Contactos que solicitaron presupuestos pero no compraron'
    ],
    tips: [
      'Usa listas dinámicas para mantener segmentación actualizada automáticamente',
      'Desactiva listas antiguas en lugar de eliminarlas',
      'Nombra las listas de forma clara para identificarlas fácilmente'
    ]
  },

  'campaigns': {
    title: '¿Qué son las Campañas de Email?',
    description: 'Envía emails masivos a tus listas de contactos. Puedes programar envíos, hacer A/B testing, y analizar resultados con métricas detalladas de apertura y clicks.',
    useCases: [
      'Enviar newsletters periódicas a clientes',
      'Lanzar promociones y ofertas especiales',
      'Hacer seguimiento de presupuestos pendientes',
      'Enviar novedades de productos o servicios'
    ],
    examples: [
      'Campaña "Ofertas del Mes": Email con descuentos especiales para toda tu base',
      'Campaña "Seguimiento Presupuestos": Recordatorio automático a clientes con presupuestos pendientes',
      'Campaña "Nuevos Productos": Presenta lanzamientos a clientes interesados',
      'A/B Test de Asuntos: Prueba 2 asuntos diferentes para ver cuál tiene más apertura'
    ],
    tips: [
      'Programa campañas para días y horarios con mejor tasa de apertura',
      'Usa A/B testing en asuntos para mejorar tasas de apertura',
      'Revisa métricas de cada campaña para optimizar futuras comunicaciones',
      'Personaliza el remitente y reply-to para generar confianza'
    ]
  },

  'templates': {
    title: '¿Para qué sirven los Templates?',
    description: 'Crea plantillas reutilizables de emails con diseño profesional. Usa el editor visual de bloques para armar layouts atractivos sin código.',
    useCases: [
      'Diseñar layouts reutilizables para diferentes campañas',
      'Mantener consistencia de marca en comunicaciones',
      'Ahorrar tiempo reutilizando diseños probados',
      'Crear templates para diferentes tipos de email (newsletter, promocional, transaccional)'
    ],
    examples: [
      'Template "Newsletter Mensual": Layout con header, 3 bloques de contenido y footer',
      'Template "Promoción": Diseño llamativo con botón de CTA destacado',
      'Template "Transaccional": Email simple para confirmaciones de pedido',
      'Template "Bienvenida": Email de onboarding para nuevos clientes'
    ],
    tips: [
      'Usa el editor visual de bloques para diseñar sin código HTML',
      'Personaliza colores de botones para resaltar llamados a la acción',
      'Crea categorías de templates para organizarlos mejor',
      'Prueba cómo se ven en móvil antes de usar en campañas'
    ]
  },

  'subscribers': {
    title: '¿Qué son los Suscriptores?',
    description: 'Gestiona tu base de contactos de email marketing. Controla estados (activo, desuscrito, rebotado), asigna tags para segmentación, y administra en qué listas está cada contacto.',
    useCases: [
      'Mantener base de datos de contactos actualizada',
      'Segmentar audiencia con tags personalizados',
      'Gestionar bajas y suscripciones',
      'Limpiar contactos inactivos o rebotados'
    ],
    examples: [
      'Suscriptor "Activo": Recibe todas las campañas de las listas en que está',
      'Suscriptor "Desuscrito": Se dio de baja y no recibe más emails',
      'Suscriptor "Rebotado": Email inválido o buzón lleno',
      'Suscriptor con tags "VIP + Interesado en Equipos": Para campañas muy segmentadas'
    ],
    tips: [
      'Importa contactos desde CSV para cargas masivas',
      'Usa tags para segmentación avanzada más allá de listas',
      'Respeta las bajas - no envíes a desuscritos para no ser marcado como spam',
      'Limpia periódicamente emails rebotados para mantener buena reputación'
    ]
  },

  'workflows': {
    title: '¿Qué son los Workflows de Automatización?',
    description: 'Crea secuencias automáticas de emails que se disparan según eventos o acciones. Arma flujos visuales con el canvas drag-and-drop estilo Zapier.',
    useCases: [
      'Automatizar seguimiento de nuevos clientes',
      'Enviar secuencias de bienvenida',
      'Recordatorios automáticos de facturas vencidas',
      'Reactivar clientes inactivos'
    ],
    examples: [
      'Workflow "Bienvenida": Cliente nuevo → Email día 1 → Esperar 3 días → Email con ofertas',
      'Workflow "Factura Vencida": Vence factura → Email recordatorio → Esperar 5 días → Email urgente',
      'Workflow "Abandono Presupuesto": Presupuesto sin respuesta → Esperar 3 días → Email de seguimiento',
      'Workflow "Reactivación": Sin compra 90 días → Email con descuento especial'
    ],
    tips: [
      'Usa el canvas visual para diseñar el flujo de pasos',
      'Combina esperas, condiciones y acciones para flujos complejos',
      'Activa workflows solo cuando estén completamente configurados',
      'Monitorea métricas de ejecución para optimizar las secuencias'
    ]
  },

  'analytics': {
    title: '¿Cómo funciona Analytics de Email?',
    description: 'Visualiza métricas completas de tus campañas: tasas de apertura, clicks, rebotes, desuscripciones. Identifica las campañas más exitosas y optimiza tu estrategia.',
    useCases: [
      'Medir rendimiento de cada campaña',
      'Comparar efectividad de diferentes asuntos (A/B testing)',
      'Identificar mejores horarios de envío',
      'Detectar problemas de deliverability'
    ],
    examples: [
      'Campaña con 45% apertura y 12% clicks: Excelente rendimiento',
      'Campaña con 8% apertura: Mejorar asunto y remitente',
      'Top 10 links más clickeados: Identificar contenido de interés',
      'Tasa de rebote alta: Limpiar base de datos'
    ],
    tips: [
      'Benchmarks típicos: 20-25% apertura, 3-5% clicks',
      'Tasas de rebote >5% indican necesidad de limpiar la lista',
      'Analiza patrones de horarios para envíos futuros',
      'Compara métricas por lista para identificar audiencias más engagement'
    ]
  },

  // REPORTES Y ANÁLISIS
  'dashboard': {
    title: '¿Qué es el Dashboard?',
    description: 'Visualiza indicadores clave de tu negocio en tiempo real: ventas, cobros, stock crítico, servicios pendientes.',
    useCases: [
      'Ver resumen ejecutivo del negocio',
      'Identificar problemas rápidamente',
      'Analizar tendencias de ventas',
      'Monitorear objetivos mensuales'
    ],
    examples: [
      'Gráfico de ventas: Comparar mes actual vs anterior',
      'Top 10 productos: Identificar best-sellers',
      'Servicios pendientes: Ver carga de trabajo del equipo',
      'Stock crítico: Productos que necesitan reposición'
    ]
  }
};

/**
 * Obtiene el contenido de ayuda para una ruta específica
 */
export function getPageHelp(pathname: string): PageHelpContent | null {
  // Extraer la última parte de la ruta
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  return pageHelpContent[lastSegment] || null;
}

/**
 * Verifica si es la primera visita del usuario a una página
 */
export function isFirstVisit(pageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  const key = `page-visit-${pageKey}`;
  const visited = localStorage.getItem(key);
  return !visited;
}

/**
 * Marca una página como visitada
 */
export function markAsVisited(pageKey: string): void {
  if (typeof window === 'undefined') return;
  const key = `page-visit-${pageKey}`;
  localStorage.setItem(key, new Date().toISOString());
}

/**
 * Resetea todas las visitas (útil para testing)
 */
export function resetAllVisits(): void {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter(key => key.startsWith('page-visit-'));
  keys.forEach(key => localStorage.removeItem(key));
}
