const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

// Run the real hook with controlled browser events, without microphone permissions.
function setup({ failStart = false } = {}) {
  const cues = []
  let recognizer
  let cleanup
  class Recognition {
    constructor() { recognizer = this }
    start() { if (failStart) throw new Error('denied') }
    stop() {}
    abort() {}
  }
  const source = fs.readFileSync('frontend/src/hooks/useSpeechRecognition.ts', 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const context = {
    exports: {}, window: { SpeechRecognition: Recognition }, AudioContext: class {},
    require(name) {
      if (name === 'react') return {
        useRef: (current) => ({ current }), useState: (value) => [value, () => {}],
        useEffect: (effect) => { cleanup = effect() },
      }
      return { createEarcons: () => ({ unlock() {}, play: (cue) => cues.push(cue), dispose() {} }) }
    },
  }
  vm.runInNewContext(code, context)
  const hook = context.exports.useSpeechRecognition()
  hook.start(() => {})
  return { cues, recognizer, hook, cleanup }
}

test('plays start on capture, stop on capture end, without duplicate end cues', () => {
  const { cues, recognizer, hook } = setup()
  assert.deepEqual(cues, [])
  recognizer.onaudiostart()
  recognizer.onaudiostart()
  hook.stop()
  assert.deepEqual(cues, ['start'])
  recognizer.onaudioend()
  recognizer.onend()
  assert.deepEqual(cues, ['start', 'stop'])
})
test('automatic recognition end provides a stop fallback', () => {
  const { cues, recognizer } = setup()
  recognizer.onaudiostart()
  recognizer.onend()
  assert.deepEqual(cues, ['start', 'stop'])
})
test('permission denial and start exceptions do not claim recording began', () => {
  const denied = setup()
  denied.recognizer.onerror({ error: 'not-allowed' })
  denied.recognizer.onend()
  assert.deepEqual(denied.cues, [])
  assert.deepEqual(setup({ failStart: true }).cues, [])
})
test('unmount detaches recording handlers', () => {
  const { recognizer, cleanup } = setup()
  cleanup()
  assert.equal(recognizer.onaudiostart, null)
  assert.equal(recognizer.onaudioend, null)
})

test('audio player preloads both cues, resumes on gesture, and releases playback', async () => {
  const files = []
  const played = []
  let resumed = false
  let closed = false
  class Context {
    state = 'suspended'
    destination = {}
    decodeAudioData(data) { return Promise.resolve(data) }
    resume() { resumed = true; this.state = 'running'; return Promise.resolve() }
    close() { closed = true; return Promise.resolve() }
    createBufferSource() {
      return { connect() {}, start() { played.push(this.buffer) }, stop() {} }
    }
  }
  const source = fs.readFileSync('frontend/src/earcons.ts', 'utf8').replace('import.meta.env.BASE_URL', "'/'")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const context = {
    exports: {}, AudioContext: Context,
    fetch: async (url) => { files.push(url); return { ok: true, arrayBuffer: async () => url } },
  }
  vm.runInNewContext(code, context)
  const player = context.exports.createEarcons()
  await new Promise(setImmediate)
  assert.deepEqual(files, ['/audio/earcon-start.wav', '/audio/earcon-stop.wav'])
  player.unlock()
  player.play('start')
  player.play('stop')
  assert.equal(resumed, true)
  assert.deepEqual(played, files)
  player.dispose()
  assert.equal(closed, true)
  player.play('start')
  assert.equal(played.length, 2)
})
