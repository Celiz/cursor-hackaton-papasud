import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
});

export function useCreaciones() {
  return useSWR('/api/locus/creaciones', fetcher, { dedupingInterval: 30000 });
}

export function useTablon(limit = 30) {
  return useSWR(`/api/locus/creaciones/tablon?limit=${limit}`, fetcher, { dedupingInterval: 15000 });
}

export function useCreacion(id: string | null) {
  return useSWR(id ? `/api/locus/creaciones/${id}` : null, fetcher, { dedupingInterval: 10000 });
}

export function useExplorar(dimension?: string | null) {
  const params = dimension ? `?dimension=${dimension}` : '';
  return useSWR(`/api/locus/creaciones/explorar${params}`, fetcher, { dedupingInterval: 15000 });
}
