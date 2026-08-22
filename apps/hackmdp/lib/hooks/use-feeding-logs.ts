"use client"

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch feeding logs')
  return res.json()
}

export function useFeedingLogs(loteId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    loteId ? `/api/cannabis/lotes/${loteId}/feeding-logs` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    feedingLogs: data?.data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export async function createFeedingLog(loteId: string, log: Record<string, unknown>) {
  const res = await fetch(`/api/cannabis/lotes/${loteId}/feeding-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create feeding log')
  }
  return res.json()
}
