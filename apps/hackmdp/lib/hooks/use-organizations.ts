"use client"

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface Organization {
  id: string
  nombre: string
  slug: string
  rol: string
  logo_url?: string
  tipo?: string
  theme?: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useOrganizations() {
  const { data, error, isLoading, mutate } = useSWR<Organization[]>(
    '/api/auth/organizations',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    organizations: data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useOrgSwitcher() {
  const router = useRouter()
  const [isSwitching, setIsSwitching] = useState(false)

  const switchOrg = async (orgId: string) => {
    setIsSwitching(true)
    try {
      const res = await fetch('/api/auth/select-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })

      if (!res.ok) throw new Error('Failed to switch org')

      // Redirect to dashboard to apply new session
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Error switching org:', error)
      throw error
    } finally {
      setIsSwitching(false)
    }
  }

  return { switchOrg, isSwitching }
}
