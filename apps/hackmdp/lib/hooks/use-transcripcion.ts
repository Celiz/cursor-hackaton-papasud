import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export function useTranscripcionByEvent(eventId: string | null) {
  return useSWR(
    eventId ? `/api/escuela/transcripciones?event_id=${eventId}` : null,
    fetcher,
    { dedupingInterval: 5000 }
  )
}

export function useTranscripcionBySession(sessionId: string | null) {
  return useSWR(
    sessionId ? `/api/escuela/transcripciones?mentorship_session_id=${sessionId}` : null,
    fetcher,
    { dedupingInterval: 5000 }
  )
}

export function useTranscripcionPolling(transcripcionId: string | null, enabled: boolean) {
  return useSWR(
    transcripcionId && enabled ? `/api/escuela/transcripciones/${transcripcionId}` : null,
    fetcher,
    { refreshInterval: enabled ? 3000 : 0 }
  )
}
