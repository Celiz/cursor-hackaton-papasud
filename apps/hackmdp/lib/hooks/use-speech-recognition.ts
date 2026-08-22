"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  procesarResultados,
  estadoInicial,
  type EstadoDictado,
  type ResultadoVoz,
} from "@/lib/campo/dictado"

// Web Speech API type declarations (not included in all TS dom libs)
interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

interface UseSpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  onResult?: (transcript: string) => void
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
}

function getIsSupported(): boolean {
  if (typeof window === "undefined") return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function useSpeechRecognition({
  lang = "es-AR",
  continuous = true,
  onResult,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [isSupported] = useState(getIsSupported)
  const [transcript, setTranscript] = useState("")

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onResultRef = useRef(onResult)
  // Qué índices ya se emitieron. Chrome reenvía resultados que ya dio por
  // finales, y sin esto la misma frase entra dos y tres veces.
  const dictadoRef = useRef<EstadoDictado>(estadoInicial)

  // Keep onResult ref up to date without re-creating recognition
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  // Initialize recognition instance once
  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()

    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Se recorre TODO `results`, no desde `resultIndex`: en dictado continuo
      // Chrome deja ese índice quieto y reenvía finales ya entregados. Quién
      // decide qué es novedad es `procesarResultados`, por índice.
      const resultados: ResultadoVoz[] = []
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]
        resultados.push({ indice: i, texto: r[0].transcript, esFinal: r.isFinal })
      }

      const salida = procesarResultados(resultados, dictadoRef.current)
      dictadoRef.current = salida.estado

      if (salida.parcial) setTranscript(salida.parcial)

      if (salida.definitivo) {
        setTranscript(salida.definitivo)
        onResultRef.current?.(salida.definitivo)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("SpeechRecognition error:", event.error, event.message)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.abort()
      } catch {
        // ignore if already stopped
      }
      recognitionRef.current = null
    }
  }, [isSupported, lang, continuous])

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || isListening) return

    setTranscript("")
    // Sesión nueva: los índices arrancan de cero otra vez.
    dictadoRef.current = estadoInicial
    try {
      recognition.start()
      setIsListening(true)
    } catch (err) {
      console.error("SpeechRecognition start error:", err)
      setIsListening(false)
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    try {
      recognition.stop()
    } catch {
      // ignore if already stopped
    }
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  }
}
