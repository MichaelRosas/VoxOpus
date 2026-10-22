import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CommandForm } from '../src/components/CommandForm.tsx'
import type { CommandResult } from 'shared'

let dom: JSDOM
let root: Root
let requests: { command: string; previousCommands: string[] }[]
let confirmations: CommandResult['operations'][]
let proposal: CommandResult
let dismissals = 0
class Recognition {
  static current: Recognition
  onstart: (() => void) | null = null
  onaudiostart: (() => void) | null = null
  onaudioend: (() => void) | null = null
  onend: (() => void) | null = null
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  constructor() { Recognition.current = this }
  start() { this.onstart?.(); this.onaudiostart?.() }
  stop() { this.onaudioend?.(); this.onend?.() }
  abort() {}
}
const add = (title: string): CommandResult => ({ clarification: null, operations: [{ type: 'create', title, description: 'Chapters 1 and 2', completed: false, dueAt: null, reminderAt: null, startsAt: '2026-10-29T17:00:00-05:00', endsAt: '2026-10-29T18:00:00-05:00', recurrence: null } as CommandResult['operations'][number]] })
const text = () => dom.window.document.body.textContent ?? ''
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
async function speak(words: string, manualStop = false) {
  const button = dom.window.document.querySelector('button')!
  await act(async () => { button.click() })
  await act(async () => {
    Recognition.current.onresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript: words } }] })
    if (manualStop) button.click()
    else { Recognition.current.onaudioend?.(); Recognition.current.onend?.() }
    await tick()
  })
}
beforeEach(async () => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost' })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  Object.assign(dom.window, { SpeechRecognition: Recognition })
  requests = []; confirmations = []; dismissals = 0; proposal = add('Quiz')
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options!.body as string))
    return new Response(JSON.stringify(proposal), { status: 200 })
  }
  root = createRoot(document.getElementById('root')!)
  await act(async () => { root.render(<CommandForm tasks={[]} onConfirm={(ops) => confirmations.push(ops)} onDismissReminders={() => { dismissals++ }} />) })
})
afterEach(async () => { await act(async () => { root.unmount() }); dom.window.close() })

test('no editable fields or Interpret controls; automatic end interprets and voice confirms', async () => {
  assert.equal(document.querySelector('textarea,input,[contenteditable]'), null)
  assert.equal(document.querySelector('output'), null)
  await speak('Add a quiz Thursday from five to six')
  assert.equal(requests.length, 1); assert.equal(confirmations.length, 0)
  assert.match(text(), /Proposed changes/)
  await speak('confirm changes', true)
  assert.equal(confirmations.length, 1); assert.equal(requests.length, 1)
  assert.match(text(), /Changes saved/)
  assert.match(text(), /Added: Quiz/)
})
test('recording corrections retains original request and sends it as context', async () => {
  await speak('Add a quiz Thursday from five to six with a description')
  proposal = add('Revised quiz')
  await speak('Remove only the description')
  assert.deepEqual(requests[1]?.previousCommands, ['Add a quiz Thursday from five to six with a description'])
  assert.match(text(), /Add a quiz Thursday from five to six with a description/)
  assert.match(text(), /Remove only the description/)
  assert.equal(confirmations.length, 0)
})
test('voice cancellation preserves visible request and never changes saved tasks', async () => {
  await speak('Add a quiz Thursday')
  await speak('cancel changes')
  assert.match(text(), /Changes discarded/); assert.match(text(), /Add a quiz Thursday/)
  assert.equal(confirmations.length, 0)
  await speak('Add a different task')
  assert.deepEqual(requests[1]?.previousCommands, [])
})
test('clarification answers keep original request and cannot be prematurely confirmed', async () => {
  proposal = { operations: [], clarification: 'Which date?' }
  await speak('Add a quiz from five to six')
  await speak('confirm changes')
  assert.equal(confirmations.length, 0)
  proposal = add('Quiz')
  await speak('Next Thursday')
  assert.deepEqual(requests[1]?.previousCommands, ['Add a quiz from five to six'])
})
test('recognition errors do not submit or erase a pending request; duplicate end submits once', async () => {
  await speak('Add a quiz Thursday')
  await act(async () => { document.querySelector('button')!.click() })
  await act(async () => { Recognition.current.onerror?.({ error: 'network' }); Recognition.current.onend?.(); Recognition.current.onend?.() })
  assert.equal(requests.length, 1); assert.match(text(), /Add a quiz Thursday/)
  await speak('Make it Friday')
  await act(async () => { Recognition.current.onend?.() })
  assert.equal(requests.length, 2)
})
test('voice can dismiss reminders without model call or a typed control', async () => {
  await speak('Dismiss reminders')
  assert.equal(dismissals, 1); assert.equal(requests.length, 0)
})


test('Safari interim-only confirmation is retained and applied when recording ends', async () => {
  await speak('Add a quiz Thursday')
  await act(async () => { document.querySelector('button')!.click() })
  await act(async () => {
    Recognition.current.onresult?.({ results: [{ isFinal: false, length: 1, 0: { transcript: 'Confirm changes' } }] })
    Recognition.current.onend?.()
  })
  assert.equal(confirmations.length, 1)
  assert.match(text(), /Changes saved/)
  assert.doesNotMatch(text(), /No speech was detected/)
})
test('Safari no-speech after interim words does not discard a real utterance', async () => {
  await act(async () => { document.querySelector('button')!.click() })
  await act(async () => {
    Recognition.current.onresult?.({ results: [{ isFinal: false, length: 1, 0: { transcript: 'Add a quiz Thursday' } }] })
    Recognition.current.onerror?.({ error: 'no-speech' })
    Recognition.current.onend?.()
    await tick()
  })
  assert.equal(requests.length, 1)
  assert.equal(requests[0]?.command, 'Add a quiz Thursday')
})
test('network failure after interim confirmation never applies a change', async () => {
  await speak('Add a quiz Thursday')
  await act(async () => { document.querySelector('button')!.click() })
  await act(async () => {
    Recognition.current.onresult?.({ results: [{ isFinal: false, length: 1, 0: { transcript: 'Confirm changes' } }] })
    Recognition.current.onerror?.({ error: 'network' })
    Recognition.current.onend?.()
  })
  assert.equal(confirmations.length, 0)
  assert.equal(requests.length, 1)
})
test('unavailable backend reports a service error and preserves the request for retry', async () => {
  globalThis.fetch = async () => new Response('', { status: 502 })
  await speak('Add a quiz Thursday')
  assert.match(text(), /interpretation service is unavailable/)
  assert.match(text(), /Add a quiz Thursday/)
  assert.equal(confirmations.length, 0)
})


test('interpretation shows a busy loading symbol only while the request is pending', async () => {
  let finish!: (response: Response) => void
  globalThis.fetch = () => new Promise<Response>((resolve) => { finish = resolve })
  await speak('Add a quiz Thursday')
  assert.ok(document.querySelector('.interpretation-spinner'))
  assert.equal(document.querySelector('button')?.getAttribute('aria-busy'), 'true')
  assert.equal(document.querySelector('button')?.disabled, true)
  assert.match(text(), /Interpreting your request/)
  await act(async () => { finish(new Response(JSON.stringify(proposal), { status: 200 })); await tick() })
  assert.equal(document.querySelector('.interpretation-spinner'), null)
  assert.equal(document.querySelector('button')?.disabled, false)
})
