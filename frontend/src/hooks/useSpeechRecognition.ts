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
  processLocally?: boolean
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

type SpeechConstructor = {
  new (): SpeechRecognizer
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>
}
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
      return 'The browser’s speech service could not connect. Try another network or check your VPN or proxy. Your pending request is still here.'
    case 'language-not-supported':
      return 'English speech recognition is not available in this browser.'
    default:
      return 'Speech recognition failed. Please record your request again.'
  }
}

export function useSpeechRecognition() {
  const earconsRef = useRef<ReturnType<typeof createEarcons> | null>(null)
  const localRecognitionReady = useRef(false)
  const recognitionRef = useRef<SpeechRecognizer | null>(null)
  const stopRequestedRef = useRef(false)
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'stopping'>('idle')
  const [error, setError] = useState<string | null>(null)
  const isSupported = Boolean(getSpeechConstructor())

  useEffect(() => {
    let active = true
    const Constructor = getSpeechConstructor()
    // Prefer an already-installed local language pack. Never download one silently.
    if (Constructor?.available) {
      void Constructor.available({ langs: ['en-US'], processLocally: true })
        .then((availability) => { if (active) localRecognitionReady.current = availability === 'available' })
        .catch(() => { /* Older browsers or policy restrictions retain normal recognition. */ })
    }
    if (isSupported && typeof AudioContext !== 'undefined') {
      try {
        earconsRef.current = createEarcons()
      } catch {
        // Restricted audio environments must not prevent the existing speech workflow.
        earconsRef.current = null
      }
    }
    return () => {
      active = false
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

  function start(
    onTranscript: (text: string) => void,
    onStopped?: (finalTranscript: string) => void,
  ) {
    if (recognitionRef.current) return
    const Constructor = getSpeechConstructor()
    if (!Constructor) return

    const recognition = new Constructor()
    recognition.lang = 'en-US'
    if (localRecognitionReady.current && 'processLocally' in recognition) recognition.processLocally = true
    recognition.continuous = false
    recognition.interimResults = true
    let latestTranscript = ''
    let isRecording = false
    let hasError = false
    let ended = false
    stopRequestedRef.current = false
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

      latestTranscript = [...finalParts, ...interimParts].join(' ').trim()
      onTranscript(latestTranscript)
    }
    recognition.onerror = (event) => {
      // Safari can report no-speech at session end despite having delivered interim words.
      if (event.error === 'no-speech' && latestTranscript) return
      hasError = true
      if (event.error !== 'aborted') setError(errorMessage(event.error))
    }
    recognition.onend = () => {
      if (ended) return
      ended = true
      // Some engines end recognition without a separate audioend event.
      finishRecording()
      // Safari may finish without marking its last visible result final. Keep those words.
      onTranscript(latestTranscript)
      recognitionRef.current = null
      setStatus('idle')
      stopRequestedRef.current = false
      if (!hasError) {
        if (latestTranscript) onStopped?.(latestTranscript)
        else setError('No speech was detected. Please record your request again.')
      }
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
    if (!recognitionRef.current || stopRequestedRef.current) return
    stopRequestedRef.current = true
    setStatus('stopping')
    try {
      recognitionRef.current.stop()
    } catch {
      stopRequestedRef.current = false
      setError('Could not finish dictation. Your tasks are unchanged. Please record again.')
      recognitionRef.current.abort()
    }
  }

  return { isSupported, status, error, start, stop, isActive: status !== 'idle' }
}
