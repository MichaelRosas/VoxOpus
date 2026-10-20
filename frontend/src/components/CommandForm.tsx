import { useEffect, useImperativeHandle, useRef, useState, type Ref, type SubmitEvent } from 'react'
import { Mic, Square } from 'lucide-react'
import type { CommandResult, Task } from 'shared'
import { interpretCommand } from '../api'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

export interface CommandFormHandle {
  startEditing: (task: Task) => void
}

interface CommandFormProps {
  ref?: Ref<CommandFormHandle>
  tasks: Task[]
  onConfirm: (operations: CommandResult['operations']) => void
  onBusyChange: (isBusy: boolean) => void
}

export function CommandForm({ ref, tasks, onConfirm, onBusyChange }: CommandFormProps) {
  const [command, setCommand] = useState('')
  const [result, setResult] = useState<CommandResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const speech = useSpeechRecognition()
  const sectionRef = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const requestInFlightRef = useRef(false)

  useEffect(() => {
    onBusyChange(isLoading || speech.isActive)
  }, [isLoading, speech.isActive, onBusyChange])

  useImperativeHandle(ref, () => ({
    startEditing(task) {
      if (isLoading || speech.isActive) return
      startDictation(`Update the task ${JSON.stringify(task.title)}:`)
      sectionRef.current?.scrollIntoView({ block: 'nearest' })
      inputRef.current?.focus()
    },
  }))

  function startDictation(initialCommand = command) {
    if (isLoading || speech.isActive) return
    const originalCommand = initialCommand.trimEnd()
    setCommand(originalCommand)
    setResult(null)
    setError(null)
    speech.start(
      (transcript) => {
        setCommand([originalCommand, transcript].filter(Boolean).join(' '))
      },
      (finalTranscript) => {
        const finalCommand = [originalCommand, finalTranscript].filter(Boolean).join(' ')
        void submitCommand(finalCommand)
      },
    )
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!command.trim() || isLoading || speech.isActive) return
    await submitCommand(command)
  }

  async function submitCommand(text: string) {
    if (!text.trim() || requestInFlightRef.current) return

    requestInFlightRef.current = true
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      setResult(await interpretCommand(text.trim(), tasks))
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Command request failed',
      )
    } finally {
      requestInFlightRef.current = false
      setIsLoading(false)
    }
  }

  function confirmTasks() {
    if (!result || result.clarification !== null) return
    if (result.operations.length === 0) return

    try {
      onConfirm(result.operations)
      setResult(null)
      setCommand('')
      setError(null)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not apply changes',
      )
    }
  }

  return (
    <section ref={sectionRef} className="command-section" aria-labelledby="command-heading">
      <h2 id="command-heading">Task command</h2>
      <form className="command-form" onSubmit={handleSubmit}>
        <label htmlFor="command-input">Type a command or use dictation</label>
        <textarea
          ref={inputRef}
          id="command-input"
          value={command}
          disabled={isLoading || speech.isActive}
          rows={3}
          aria-describedby="dictation-status"
          onChange={(event) => {
            setCommand(event.target.value)
            setResult(null)
            setError(null)
          }}
        />
        <div className="form-actions">
          {speech.isSupported && (
            <button
              type="button"
              className="dictation-button"
              onClick={speech.isActive ? speech.stop : () => startDictation()}
              disabled={isLoading || speech.status === 'starting' || speech.status === 'stopping'}
              title={speech.isActive ? 'Stop dictation' : 'Start dictation'}
              aria-label={speech.isActive ? 'Stop dictation' : 'Start dictation'}
            >
              {speech.isActive ? <Square size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
              {speech.isActive ? 'Stop dictation' : 'Start dictation'}
            </button>
          )}
          <button className="primary-button" type="submit" disabled={isLoading || speech.isActive || !command.trim()}>
            {isLoading ? 'Processing…' : 'Interpret'}
          </button>
        </div>
      </form>
      <p className="command-status" id="dictation-status" role="status">
        {isLoading
          ? 'Interpreting command...'
          : !speech.isSupported
          ? 'Voice dictation is unavailable in this browser.'
          : speech.status === 'starting'
            ? 'Starting microphone...'
            : speech.status === 'listening'
              ? 'Listening...'
              : speech.status === 'stopping'
                ? 'Finishing dictation...'
                : 'Ready for a command.'}
      </p>
      {speech.error && <p className="command-error" role="alert">{speech.error}</p>}
      {error && <p className="command-error" role="alert">{error}</p>}
      {result?.clarification && <p className="command-clarification">{result.clarification}</p>}
      {result && result.clarification === null && (
        <div className="command-preview">
          <h3>Review changes</h3>
          <ul>
            {result.operations.map((operation, index) => {
              if (operation.type === 'create') {
                return (
                  <li key={index}>
                    <strong>Create: {operation.title}</strong>
                    {operation.dueAt && (
                      <p>Due: {new Date(operation.dueAt).toLocaleString()}</p>
                    )}
                    {operation.reminderAt && (
                      <p>
                        Reminder: {new Date(operation.reminderAt).toLocaleString()}
                      </p>
                    )}
                  </li>
                )
              }

              const task = tasks.find((task) => task.id === operation.taskId)

              return (
                <li key={index}>
                  <strong>Update: {task?.title ?? 'Task no longer available'}</strong>

                  {operation.title.action === 'set' && (
                    <p>Title: {operation.title.value}</p>
                  )}

                  {operation.completed.action === 'set' && (
                    <p>
                      Status: {operation.completed.value ? 'Complete' : 'Incomplete'}
                    </p>
                  )}

                  {operation.dueAt.action === 'set' && (
                    <p>
                      Due:{' '}
                      {operation.dueAt.value === null
                        ? 'Remove due date'
                        : new Date(operation.dueAt.value).toLocaleString()}
                    </p>
                  )}

                  {operation.reminderAt.action === 'set' && (
                    <p>
                      Reminder:{' '}
                      {operation.reminderAt.value === null
                        ? 'Remove reminder'
                        : new Date(operation.reminderAt.value).toLocaleString()}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          {result.operations.length === 0 && <p>No changes proposed.</p>}
          <div className="form-actions">
            <button
              className="primary-button"
              type="button"
              onClick={confirmTasks}
              disabled={result.operations.length === 0}
            >
              Confirm changes
            </button>
            <button type="button" onClick={() => setResult(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
