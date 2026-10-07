import { useState, type SubmitEvent } from 'react'
import type { Task } from 'shared'
import { toIsoTimestamp } from '../dateTime'

interface CreateTaskFormProps {
  onCreate: (task: Task) => void
}

export function CreateTaskForm({ onCreate }: CreateTaskFormProps) {
  const [title, setTitle] = useState('')
  const [dueAtInput, setDueAtInput] = useState('')
  const [reminderAtInput, setReminderAtInput] = useState('')

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      return
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      completed: false,
      dueAt: toIsoTimestamp(dueAtInput),
      reminderAt: toIsoTimestamp(reminderAtInput),
    }

    onCreate(newTask)
    setTitle('')
    setDueAtInput('')
    setReminderAtInput('')
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <label htmlFor="task-title">New task</label>
      <input
        id="task-title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What needs to be done?"
      />

      <fieldset className="schedule-fields">
        <legend>Schedule (optional)</legend>
        <label htmlFor="task-due-at">Due date</label>
        <input
          id="task-due-at"
          type="datetime-local"
          value={dueAtInput}
          onChange={(event) => setDueAtInput(event.target.value)}
        />

        <label htmlFor="task-reminder-at">Reminder</label>
        <input
          id="task-reminder-at"
          type="datetime-local"
          value={reminderAtInput}
          onChange={(event) => setReminderAtInput(event.target.value)}
        />
      </fieldset>

      <div className="form-actions">
        <button className="primary-button" type="submit">Add task</button>
      </div>
    </form>
  )
}
