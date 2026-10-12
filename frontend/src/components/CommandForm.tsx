import { useState, type SubmitEvent } from 'react'
import type { CommandResult, Task } from 'shared'
import { interpretCommand } from '../api'

interface CommandFormProps {
  tasks: Task[]
  onConfirm: (operations: CommandResult['operations']) => void
}

export function CommandForm({ tasks, onConfirm }: CommandFormProps) {
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
