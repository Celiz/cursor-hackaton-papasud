"use client"

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'

interface SessionUser {
  id: string
  personaId?: string
  email: string
  name: string
  role?: string
  isAdmin?: boolean
  orgId?: string
  orgName?: string
  orgLogo?: string
  orgTheme?: string
  orgTipo?: string
  orgPais?: string
  modulosOcultos?: string[]
  modulosSoloLectura?: string[]
}

interface Session {
  user: SessionUser | null
}

interface UseSessionReturn {
  data: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  update: () => Promise<Session | null>
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch session')
  }
  return res.json()
}

/**
 * Custom useSession hook to replace NextAuth's useSession
 * Fetches session from our JWT-based auth API
 */
export function useSession(): UseSessionReturn {
  const { data, error, isLoading, mutate } = useSWR<Session>(
    '/api/auth/session',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  const update = useCallback(async (): Promise<Session | null> => {
    const result = await mutate()
    return result ?? null
  }, [mutate])

  let status: 'loading' | 'authenticated' | 'unauthenticated' = 'loading'

  if (isLoading) {
    status = 'loading'
  } else if (error || !data?.user) {
    status = 'unauthenticated'
  } else {
    status = 'authenticated'
  }

  return {
    data: data || null,
    status,
    update,
  }
}
