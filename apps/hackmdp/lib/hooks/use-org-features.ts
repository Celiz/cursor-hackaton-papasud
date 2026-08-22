"use client"

import useSWR from 'swr'
import type { OrgFeatures } from '@studio/erp-core/organizations'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch org features')
  return res.json()
}

export function useOrgFeatures() {
  const { data, error, isLoading, mutate } = useSWR<{ features: OrgFeatures }>(
    '/api/org-features',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 min
    }
  )

  return {
    features: data?.features ?? null,
    isLoading,
    error,
    mutate,
  }
}
