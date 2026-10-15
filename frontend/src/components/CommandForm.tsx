import { useState, type SubmitEvent } from 'react'
import { Mic, Square } from 'lucide-react'
import type { CommandResult, Task } from 'shared'
import { interpretCommand } from '../api'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

interface CommandFormProps {
  tasks: Task[]
  onConfirm: (operations: CommandResult['operations']) => void
}

export function CommandForm({ tasks, onConfirm }: CommandFormProps) {
  const [command, setCommand] = useState('')
  const [result, setResult] = useState<CommandResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const speech = useSpeechRecognition()

  function startDictation() {
    if (isLoading || speech.isActive) return
    const originalCommand = command.trimEnd()
    setResult(null)
    setError(null)
    speech.start((transcript) => {
      setCommand([originalCommand, transcript].filter(Boolean).join(' '))
    })
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!command.trim() || isLoading || speech.isActive) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      setResult(await interpretCommand(command.trim(), tasks))
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Command request failed',
      )
    } finally {
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
    <section className="command-section" aria-labelledby="command-heading">
      <h2 id="command-heading">Task command</h2>
      <form className="command-form" onSubmit={handleSubmit}>
        <label htmlFor="command-input">Type a command or use dictation</label>
        <textarea
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
          <button className="primary-button" type="submit" disabled={isLoading || speech.isActive || !command.trim()}>
            {isLoading ? 'Processing…' : 'Interpret'}
          </button>
          {speech.isSupported && (
            <button
              type="button"
              className="dictation-button"
              onClick={speech.isActive ? speech.stop : startDictation}
              disabled={isLoading || speech.status === 'starting' || speech.status === 'stopping'}
              title={speech.isActive ? 'Stop dictation' : 'Start dictation'}
              aria-label={speech.isActive ? 'Stop dictation' : 'Start dictation'}
            >
              {speech.isActive ? <Square size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
              {speech.isActive ? 'Stop dictation' : 'Start dictation'}
            </button>
          )}
        </div>
      </form>
      <p className="command-status" id="dictation-status" role="status">
        {!speech.isSupported
          ? 'Voice dictation is unavailable in this browser.'
          : speech.status === 'starting'
            ? 'Starting microphone...'
            : speech.status === 'listening'
              ? 'Listening...'
              : speech.status === 'stopping'
                ? 'Finishing dictation...'
                : 'Ready. Dictate or type, then interpret your command.'}
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
