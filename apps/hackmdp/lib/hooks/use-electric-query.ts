"use client"

import { useState, useEffect } from 'react';
import { useElectric } from '@/lib/contexts/ElectricProvider';

interface UseElectricQueryOptions {
  /**
   * SQL query a ejecutar
   */
  query: string;

  /**
   * Parámetros para la query
   */
  params?: any[];

  /**
   * Si es true, ejecuta la query automáticamente al montar
   */
  enabled?: boolean;
}

interface UseElectricQueryReturn<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para ejecutar queries SQL con Electric PGlite
 * Proporciona datos sincronizados localmente con soporte offline
 */
export function useElectricQuery<T = any>(
  options: UseElectricQueryOptions
): UseElectricQueryReturn<T> {
  const { db, isReady } = useElectric();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { query, params = [], enabled = true } = options;

  const executeQuery = async () => {
    if (!db || !isReady) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[Electric Query] Ejecutando:', query, params);

      const result = await db.query(query, params);

      console.log('[Electric Query] Resultado:', result.rows.length, 'filas');

      setData(result.rows as T[]);
    } catch (err) {
      console.error('[Electric Query] Error:', err);
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && isReady) {
      executeQuery();
    }
  }, [enabled, isReady, query, JSON.stringify(params)]);

  return {
    data,
    loading,
    error,
    refetch: executeQuery,
  };
}

/**
 * Hook para ejecutar una query y subscribirse a cambios en tiempo real
 * Nota: Electric SQL sincroniza automáticamente los datos, por lo que
 * esta función ejecuta la query una vez y confía en la sincronización
 */
export function useElectricLiveQuery<T = any>(
  options: UseElectricQueryOptions
): UseElectricQueryReturn<T> {
  const { db, isReady, isSyncing } = useElectric();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { query, params = [], enabled = true } = options;

  const executeQuery = async () => {
    if (!db || !isReady) {
      setLoading(false);
      return;
    }

    // Wait for sync to complete before querying
    if (isSyncing) {
      console.log('[Electric Live Query] Esperando sincronización...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[Electric Live Query] Ejecutando:', query);

      const result = await db.query(query, params);

      console.log('[Electric Live Query] Resultado:', result.rows.length, 'filas');

      setData(result.rows as T[]);
    } catch (err) {
      console.error('[Electric Live Query] Error:', err);
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && isReady && !isSyncing) {
      executeQuery();
    }
  }, [enabled, isReady, isSyncing, query, JSON.stringify(params)]);

  return {
    data,
    loading,
    error,
    refetch: executeQuery,
  };
}
