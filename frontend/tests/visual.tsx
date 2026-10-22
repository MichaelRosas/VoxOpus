// Development-only visual fixture. No real microphone, API request, or browser storage writes.
import React from 'react'
import { createRoot } from 'react-dom/client'
import type { CommandResult } from 'shared'
import '../src/index.css'
let recording = 0
const operation: CommandResult['operations'][number] = {
  type: 'create', title: 'Chemistry quiz', description: 'Review chapters 3 and 4 before class.',
  startsAt: '2026-10-29T17:00:00-05:00', endsAt: '2026-10-29T18:00:00-05:00',
  dueAt: null, reminderAt: null,
  recurrence: { frequency: 'weekly', daysOfWeek: [4], timeZone: 'America/Chicago', until: null },
}
class Recognition {
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onresult: ((event: unknown) => void) | null = null
  onerror = null
  onaudiostart = null
  onaudioend = null
  start() {
    this.onstart?.()
    const transcript = recording++ === 0 ? 'Add a chemistry quiz every Thursday from five to six. Description: review chapters three and four.' : 'Confirm changes'
    window.setTimeout(() => {
      this.onresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript } }] })
      this.onend?.()
    }, 300)
  }
  stop() {}
  abort() {}
}
Object.defineProperty(window, 'SpeechRecognition', { value: Recognition })
Object.defineProperty(window, 'AudioContext', { value: undefined })
Object.defineProperty(window, 'localStorage', { value: { getItem: () => null, setItem() {} } })
const nativeFetch = window.fetch.bind(window)
window.fetch = async (url, options) => {
  if (String(url) === '/api/commands') {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return new Response(JSON.stringify({ operations: [operation], clarification: null }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return nativeFetch(url, options)
}
const { default: App } = await import('../src/App')
createRoot(document.getElementById('root')!).render(<App />)
