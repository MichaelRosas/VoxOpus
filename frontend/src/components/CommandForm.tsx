import { useState, type SubmitEvent } from 'react'
import type { CommandResult, Task } from 'shared'
import { interpretCommand } from '../api'

interface CommandFormProps {
  onConfirm: (tasks: Task[]) => void
}

export function CommandForm({ onConfirm }: CommandFormProps) {
  const [command, setCommand] = useState('')
  const [result, setResult] = useState<CommandResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!command.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      setResult(await interpretCommand(command.trim()))
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

    const newTasks: Task[] = result.operations.map((operation) => ({
      id: crypto.randomUUID(),
      title: operation.title,
      completed: false,
      dueAt: operation.dueAt,
      reminderAt: operation.reminderAt,
    }))

    onConfirm(newTasks)
    setResult(null)
    setCommand('')
  }

  return (
    <section aria-labelledby="command-heading">
      <h2 id="command-heading">Task command</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="command-input">Command</label>
        <textarea
          id="command-input"
          value={command}
          disabled={isLoading}
          onChange={(event) => {
            setCommand(event.target.value)
            setResult(null)
            setError(null)
          }}
        />
        <button type="submit" disabled={isLoading || !command.trim()}>
          {isLoading ? 'Processing…' : 'Interpret'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result?.clarification && <p>{result.clarification}</p>}
      {result && result.clarification === null && (
        <div>
          <ul>
            {result.operations.map((operation, index) => (
              <li key={index}>
                <strong>{operation.title}</strong>
                {operation.dueAt && (
                  <p>Due: {new Date(operation.dueAt).toLocaleString()}</p>
                )}
                {operation.reminderAt && (
                  <p>
                    Reminder: {new Date(operation.reminderAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {result.operations.length === 0 && <p>No tasks proposed.</p>}
          <button
            type="button"
            onClick={confirmTasks}
            disabled={result.operations.length === 0}
          >
            Confirm
          </button>
          <button type="button" onClick={() => setResult(null)}>
            Cancel
          </button>
        </div>
      )}
    </section>
  )
}
