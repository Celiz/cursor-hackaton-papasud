"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
// @ts-ignore
import { PGlite } from '@electric-sql/pglite';
// @ts-ignore
import { electricSync } from '@electric-sql/pglite-sync';

interface ElectricContextValue {
  db: PGlite | null;
  isReady: boolean;
  isSyncing: boolean;
  error: Error | null;
}

const ElectricContext = createContext<ElectricContextValue>({
  db: null,
  isReady: false,
  isSyncing: false,
  error: null,
});

export function useElectric() {
  const context = useContext(ElectricContext);
  if (!context) {
    throw new Error('useElectric must be used within ElectricProvider');
  }
  return context;
}

interface ElectricProviderProps {
  children: React.ReactNode;
}

export function ElectricProvider({ children }: ElectricProviderProps) {
  const [db, setDb] = useState<PGlite | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initElectric() {
      try {
        console.log('[Electric] Inicializando PGlite...');

        // Crear instancia de PGlite con extensión de sync
        const pglite = await PGlite.create({
          dataDir: 'idb://gestie-local-db',
          extensions: {
            electric: electricSync(),
          },
        });

        if (!mounted) {
          await pglite.close();
          return;
        }

        console.log('[Electric] PGlite inicializado');

        // Configurar Electric Sync para todas las tablas principales
        const electricUrl = process.env.NEXT_PUBLIC_ELECTRIC_URL || 'http://localhost:5133';

        console.log('[Electric] Conectando a Electric SQL:', electricUrl);

        setIsSyncing(true);

        // Lista completa de tablas a sincronizar
        const tablesToSync = [
          'clientes',
          'productos',
          'servicios',
          'servicios_tecnicos',
          'equipos',
          'equipos_unidades',
          'equipos_contratos',
          'equipos_movimientos',
          'equipos_alertas',
          'facturas',
          'notas_credito',
          'presupuestos',
          'pedidos',
          'pagos',
          'personas',
          'laboratorios',
          'proveedores',
          'tareas',
          'roles',
          'perfiles',
        ];

        let syncedCount = 0;

        // Sincronizar cada tabla
        for (const tableName of tablesToSync) {
          try {
            console.log(`[Electric] Sincronizando tabla: ${tableName}`);

            // @ts-ignore - electric extension
            const shape = await pglite.electric.syncShapeToTable({
              shape: {
                url: `${electricUrl}/v1/shape`,
                params: {
                  table: tableName,
                },
              },
              table: tableName,
              primaryKey: ['id'],
            });

            console.log(`[Electric] ✓ ${tableName} sincronizada`);
            syncedCount++;

            if (syncedCount === tablesToSync.length) {
              setIsSyncing(false);
              console.log('[Electric] ✓ Todas las tablas sincronizadas');
            }
          } catch (err) {
            console.error(`[Electric] Error sincronizando ${tableName}:`, err);
          }
        }

        setDb(pglite);
        setIsReady(true);
        console.log('[Electric] Listo para usar');

      } catch (err) {
        console.error('[Electric] Error inicializando:', err);
        setError(err as Error);
      }
    }

    initElectric();

    return () => {
      mounted = false;
      if (db) {
        db.close();
      }
    };
  }, []);

  return (
    <ElectricContext.Provider value={{ db, isReady, isSyncing, error }}>
      {children}
    </ElectricContext.Provider>
  );
}
