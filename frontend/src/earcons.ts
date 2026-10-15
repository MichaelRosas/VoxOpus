// Decode the supplied earcons ahead of recording. WAV avoids FLAC codec differences.
export function createEarcons() {
  const context = new AudioContext()
  let disposed = false
  let activeSource: AudioBufferSourceNode | null = null
  const buffers = new Map<string, AudioBuffer>()
  for (const name of ['start', 'stop']) {
    void fetch(`${import.meta.env.BASE_URL}audio/earcon-${name}.wav`)
      .then((response) => {
        if (!response.ok) throw new Error('Earcon unavailable')
        return response.arrayBuffer()
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => { if (!disposed) buffers.set(name, buffer) })
      // Sound failure must never block dictation; the visible status remains available.
      .catch(() => {})
  }

  return {
    // Called directly from the Start button gesture to satisfy autoplay policy.
    unlock() { void context.resume().catch(() => {}) },
    play(name: 'start' | 'stop') {
      const buffer = buffers.get(name)
      if (disposed || !buffer || context.state !== 'running') return
      activeSource?.stop()
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      activeSource = source
      source.onended = () => { if (activeSource === source) activeSource = null }
      source.start()
    },
    dispose() {
      disposed = true
      activeSource?.stop()
      void context.close().catch(() => {})
    },
  }
}
