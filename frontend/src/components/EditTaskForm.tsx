import { useState, type SubmitEvent } from 'react'
import type { Task } from 'shared'
import { toDateTimeLocalInput, toIsoTimestamp } from '../dateTime'

interface EditTaskFormProps {
  task: Task
  onSave: (task: Task) => void
  onCancel: () => void
}

export function EditTaskForm({
  task,
  onSave,
  onCancel,
}: EditTaskFormProps) {
  const [title, setTitle] = useState(task.title)
  const [dueAtInput, setDueAtInput] = useState(
    toDateTimeLocalInput(task.dueAt),
  )
  const [reminderAtInput, setReminderAtInput] = useState(
    toDateTimeLocalInput(task.reminderAt),
  )

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      return
    }

    onSave({
      ...task,
      title: trimmedTitle,
      dueAt: toIsoTimestamp(dueAtInput),
      reminderAt: toIsoTimestamp(reminderAtInput),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={`edit-title-${task.id}`}>Task</label>
      <input
        id={`edit-title-${task.id}`}
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <label htmlFor={`edit-due-${task.id}`}>Due date</label>
      <input
        id={`edit-due-${task.id}`}
        type="datetime-local"
        value={dueAtInput}
        onChange={(event) => setDueAtInput(event.target.value)}
      />

      <label htmlFor={`edit-reminder-${task.id}`}>Reminder</label>
      <input
        id={`edit-reminder-${task.id}`}
        type="datetime-local"
        value={reminderAtInput}
        onChange={(event) => setReminderAtInput(event.target.value)}
      />

      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}
