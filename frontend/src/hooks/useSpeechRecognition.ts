import { useEffect, useRef, useState } from 'react'
import { createEarcons } from '../earcons'

interface SpeechResult {
  isFinal: boolean
  length: number
  [index: number]: { transcript: string }
}

interface SpeechResultEvent {
  results: { length: number; [index: number]: SpeechResult }
}

interface SpeechRecognizer {
  lang: string
  continuous: boolean
  interimResults: boolean
  onaudiostart: (() => void) | null
  onaudioend: (() => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechConstructor = new () => SpeechRecognizer
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechConstructor
  webkitSpeechRecognition?: SpeechConstructor
}

function getSpeechConstructor() {
  if (typeof window === 'undefined') return undefined
  const speechWindow = window as SpeechWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

function errorMessage(code: string) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone or speech recognition access was denied. Check browser permissions.'
    case 'audio-capture':
      return 'No microphone is available. Check your microphone connection.'
    case 'no-speech':
      return 'No speech was detected. Try again.'
    case 'network':
      return 'Speech recognition could not connect. Check your internet connection.'
    case 'language-not-supported':
      return 'English speech recognition is not available in this browser.'
    default:
      return 'Speech recognition failed. Try again or type your command.'
  }
}

export function useSpeechRecognition() {
  const earconsRef = useRef<ReturnType<typeof createEarcons> | null>(null)
  const recognitionRef = useRef<SpeechRecognizer | null>(null)
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'stopping'>('idle')
  const [error, setError] = useState<string | null>(null)
  const isSupported = Boolean(getSpeechConstructor())

  useEffect(() => {
    if (isSupported && typeof AudioContext !== 'undefined') {
      try {
        earconsRef.current = createEarcons()
      } catch {
        // Restricted audio environments must not prevent the existing speech workflow.
        earconsRef.current = null
      }
    }
    return () => {
      earconsRef.current?.dispose()
      earconsRef.current = null
      const recognition = recognitionRef.current
      if (!recognition) return
      recognition.onaudiostart = null
      recognition.onaudioend = null
      recognition.onstart = null
      recognition.onend = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.abort()
      recognitionRef.current = null
    }
  }, [isSupported])

  function start(onTranscript: (text: string) => void) {
    if (recognitionRef.current) return
    const Constructor = getSpeechConstructor()
    if (!Constructor) return

    const recognition = new Constructor()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    let finalTranscript = ''
    let isRecording = false
    earconsRef.current?.unlock()

    // Cue actual microphone capture, not button clicks or failed permission requests.
    recognition.onaudiostart = () => {
      if (isRecording) return
      isRecording = true
      earconsRef.current?.play('start')
    }
    const finishRecording = () => {
      if (!isRecording) return
      isRecording = false
      earconsRef.current?.play('stop')
    }
    recognition.onaudioend = finishRecording

    recognition.onstart = () => setStatus('listening')
    recognition.onresult = (event) => {
      const finalParts: string[] = []
      const interimParts: string[] = []

      // Rebuild the session transcript because interim results can be replaced.
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index]
        if (!result || !result.length) continue
        const text = result[0].transcript.trim()
        if (result.isFinal) finalParts.push(text)
        else interimParts.push(text)
      }

      finalTranscript = finalParts.join(' ')
      onTranscript([...finalParts, ...interimParts].join(' '))
    }
    recognition.onerror = (event) => {
      if (event.error !== 'aborted') setError(errorMessage(event.error))
    }
    recognition.onend = () => {
      // Some engines end recognition without a separate audioend event.
      finishRecording()
      onTranscript(finalTranscript)
      recognitionRef.current = null
      setStatus('idle')
    }

    recognitionRef.current = recognition
    setError(null)
    setStatus('starting')

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setStatus('idle')
      setError('Could not start speech recognition. Try again.')
    }
  }

  function stop() {
    if (!recognitionRef.current) return
    setStatus('stopping')
    try {
      recognitionRef.current.stop()
    } catch {
      recognitionRef.current.abort()
    }
  }

  return { isSupported, status, error, start, stop, isActive: status !== 'idle' }
}
