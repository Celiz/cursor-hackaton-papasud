"use client"

import { useMemo } from 'react';
import { useElectricLiveQuery, useElectricQuery } from './use-electric-query';

/**
 * Hook unificado para acceder a datos con Electric SQL
 * Proporciona acceso directo a todas las entidades principales del sistema
 * con sincronización automática offline-first
 */
export function useElectricData() {
  // Clientes - usar nombre en vez de razon_social
  const {
    data: clientes,
    loading: loadingClientes,
    error: errorClientes,
    refetch: refetchClientes,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM clientes ORDER BY created_at DESC',
  });

  // Productos
  const {
    data: productos,
    loading: loadingProductos,
    error: errorProductos,
    refetch: refetchProductos,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM productos ORDER BY nombre ASC',
  });

  // Servicios
  const {
    data: servicios,
    loading: loadingServicios,
    error: errorServicios,
    refetch: refetchServicios,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM servicios ORDER BY created_at DESC',
  });

  // Servicios Técnicos
  const {
    data: serviciosTecnicos,
    loading: loadingServiciosTecnicos,
    error: errorServiciosTecnicos,
    refetch: refetchServiciosTecnicos,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM servicios_tecnicos ORDER BY fecha_servicio DESC',
  });

  // Equipos
  const {
    data: equipos,
    loading: loadingEquipos,
    error: errorEquipos,
    refetch: refetchEquipos,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM equipos ORDER BY nombre ASC',
  });

  // Equipos Unidades
  const {
    data: equiposUnidades,
    loading: loadingEquiposUnidades,
    error: errorEquiposUnidades,
    refetch: refetchEquiposUnidades,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM equipos_unidades ORDER BY numero_serie ASC',
  });

  // Equipos Contratos
  const {
    data: equiposContratos,
    loading: loadingEquiposContratos,
    error: errorEquiposContratos,
    refetch: refetchEquiposContratos,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM equipos_contratos ORDER BY fecha_inicio DESC',
  });

  // Equipos Movimientos
  const {
    data: equiposMovimientos,
    loading: loadingEquiposMovimientos,
    error: errorEquiposMovimientos,
    refetch: refetchEquiposMovimientos,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM equipos_movimientos ORDER BY fecha DESC',
  });

  // Equipos Alertas
  const {
    data: equiposAlertas,
    loading: loadingEquiposAlertas,
    error: errorEquiposAlertas,
    refetch: refetchEquiposAlertas,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM equipos_alertas ORDER BY fecha_alerta DESC',
  });

  // Facturas
  const {
    data: facturas,
    loading: loadingFacturas,
    error: errorFacturas,
    refetch: refetchFacturas,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM facturas ORDER BY fecha DESC',
  });

  // Notas de Crédito
  const {
    data: notasCredito,
    loading: loadingNotasCredito,
    error: errorNotasCredito,
    refetch: refetchNotasCredito,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM notas_credito ORDER BY fecha DESC',
  });

  // Presupuestos
  const {
    data: presupuestos,
    loading: loadingPresupuestos,
    error: errorPresupuestos,
    refetch: refetchPresupuestos,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM presupuestos ORDER BY fecha DESC',
  });

  // Pedidos
  const {
    data: pedidos,
    loading: loadingPedidos,
    error: errorPedidos,
    refetch: refetchPedidos,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM pedidos ORDER BY fecha DESC',
  });

  // Pagos
  const {
    data: pagos,
    loading: loadingPagos,
    error: errorPagos,
    refetch: refetchPagos,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM pagos ORDER BY fecha DESC',
  });

  // Personas
  const {
    data: personas,
    loading: loadingPersonas,
    error: errorPersonas,
    refetch: refetchPersonas,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM personas ORDER BY nombre ASC',
  });

  // Laboratorios
  const {
    data: laboratorios,
    loading: loadingLaboratorios,
    error: errorLaboratorios,
    refetch: refetchLaboratorios,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM laboratorios ORDER BY nombre ASC',
  });

  // Proveedores
  const {
    data: proveedores,
    loading: loadingProveedores,
    error: errorProveedores,
    refetch: refetchProveedores,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM proveedores ORDER BY razon_social ASC',
  });

  // Tareas
  const {
    data: tareas,
    loading: loadingTareas,
    error: errorTareas,
    refetch: refetchTareas,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM tareas ORDER BY fecha_vencimiento ASC',
  });

  // Roles
  const {
    data: roles,
    loading: loadingRoles,
    error: errorRoles,
    refetch: refetchRoles,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM roles ORDER BY nivel DESC',
  });

  // Perfiles
  const {
    data: perfiles,
    loading: loadingPerfiles,
    error: errorPerfiles,
    refetch: refetchPerfiles,
  } = useElectricLiveQuery({
    query: 'SELECT * FROM perfiles',
  });

  // Estado de carga global
  const loading = useMemo(
    () =>
      loadingClientes ||
      loadingProductos ||
      loadingServicios ||
      loadingServiciosTecnicos ||
      loadingEquipos ||
      loadingEquiposUnidades ||
      loadingEquiposContratos ||
      loadingEquiposMovimientos ||
      loadingEquiposAlertas ||
      loadingFacturas ||
      loadingNotasCredito ||
      loadingPresupuestos ||
      loadingPedidos ||
      loadingPagos ||
      loadingPersonas ||
      loadingLaboratorios ||
      loadingProveedores ||
      loadingTareas ||
      loadingRoles ||
      loadingPerfiles,
    [
      loadingClientes,
      loadingProductos,
      loadingServicios,
      loadingServiciosTecnicos,
      loadingEquipos,
      loadingEquiposUnidades,
      loadingEquiposContratos,
      loadingEquiposMovimientos,
      loadingEquiposAlertas,
      loadingFacturas,
      loadingNotasCredito,
      loadingPresupuestos,
      loadingPedidos,
      loadingPagos,
      loadingPersonas,
      loadingLaboratorios,
      loadingProveedores,
      loadingTareas,
      loadingRoles,
      loadingPerfiles,
    ]
  );

  // Función para refrescar todos los datos
  const refetchAll = async () => {
    await Promise.all([
      refetchClientes(),
      refetchProductos(),
      refetchServicios(),
      refetchServiciosTecnicos(),
      refetchEquipos(),
      refetchEquiposUnidades(),
      refetchEquiposContratos(),
      refetchEquiposMovimientos(),
      refetchEquiposAlertas(),
      refetchFacturas(),
      refetchNotasCredito(),
      refetchPresupuestos(),
      refetchPedidos(),
      refetchPagos(),
      refetchPersonas(),
      refetchLaboratorios(),
      refetchProveedores(),
      refetchTareas(),
      refetchRoles(),
      refetchPerfiles(),
    ]);
  };

  return {
    // Datos
    clientes: clientes || [],
    productos: productos || [],
    servicios: servicios || [],
    serviciosTecnicos: serviciosTecnicos || [],
    equipos: equipos || [],
    equiposUnidades: equiposUnidades || [],
    equiposContratos: equiposContratos || [],
    equiposMovimientos: equiposMovimientos || [],
    equiposAlertas: equiposAlertas || [],
    facturas: facturas || [],
    notasCredito: notasCredito || [],
    presupuestos: presupuestos || [],
    pedidos: pedidos || [],
    pagos: pagos || [],
    personas: personas || [],
    laboratorios: laboratorios || [],
    proveedores: proveedores || [],
    tareas: tareas || [],
    roles: roles || [],
    perfiles: perfiles || [],

    // Estados de carga
    loading,
    loadingClientes,
    loadingProductos,
    loadingServicios,
    loadingServiciosTecnicos,
    loadingEquipos,
    loadingEquiposUnidades,
    loadingEquiposContratos,
    loadingEquiposMovimientos,
    loadingEquiposAlertas,
    loadingFacturas,
    loadingNotasCredito,
    loadingPresupuestos,
    loadingPedidos,
    loadingPagos,
    loadingPersonas,
    loadingLaboratorios,
    loadingProveedores,
    loadingTareas,
    loadingRoles,
    loadingPerfiles,

    // Errores
    errorClientes,
    errorProductos,
    errorServicios,
    errorServiciosTecnicos,
    errorEquipos,
    errorEquiposUnidades,
    errorEquiposContratos,
    errorEquiposMovimientos,
    errorEquiposAlertas,
    errorFacturas,
    errorNotasCredito,
    errorPresupuestos,
    errorPedidos,
    errorPagos,
    errorPersonas,
    errorLaboratorios,
    errorProveedores,
    errorTareas,
    errorRoles,
    errorPerfiles,

    // Funciones de recarga
    refetchAll,
    refetchClientes,
    refetchProductos,
    refetchServicios,
    refetchServiciosTecnicos,
    refetchEquipos,
    refetchEquiposUnidades,
    refetchEquiposContratos,
    refetchEquiposMovimientos,
    refetchEquiposAlertas,
    refetchFacturas,
    refetchNotasCredito,
    refetchPresupuestos,
    refetchPedidos,
    refetchPagos,
    refetchPersonas,
    refetchLaboratorios,
    refetchProveedores,
    refetchTareas,
    refetchRoles,
    refetchPerfiles,
  };
}

/**
 * Hook para ejecutar queries personalizadas con Electric SQL
 * Útil para consultas específicas o filtradas
 */
export function useElectricCustomQuery<T = any>(query: string, params?: any[], live = true) {
  if (live) {
    return useElectricLiveQuery<T>({ query, params });
  } else {
    return useElectricQuery<T>({ query, params });
  }
}
