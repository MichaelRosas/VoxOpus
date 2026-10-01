import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import type { Task } from 'shared'
import { loadTasks, saveTasks } from './storage'
import './App.css'

function toIsoTimestamp(value: string): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function toDateTimeLocalInput(timestamp: string | null): string {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp)
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  const localDate = new Date(date.getTime() - timezoneOffset)

  return localDate.toISOString().slice(0, 16)
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [title, setTitle] = useState('')
  const [dueAtInput, setDueAtInput] = useState('')
  const [reminderAtInput, setReminderAtInput] = useState('')
  const triggeredReminderIds = useRef(new Set<string>())

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueAtInput, setEditDueAtInput] = useState('')
  const [editReminderAtInput, setEditReminderAtInput] = useState('')

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  useEffect(() => {
    function checkReminders() {
      const now = Date.now()

      for (const task of tasks) {
        const shouldTrigger =
          !task.completed &&
          task.reminderAt !== null &&
          new Date(task.reminderAt).getTime() <= now &&
          !triggeredReminderIds.current.has(task.id)

        if (shouldTrigger) {
          triggeredReminderIds.current.add(task.id)
          window.alert(`Reminder: ${task.title}`)
        }
      }
    }

    checkReminders()

    const intervalId = window.setInterval(checkReminders, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [tasks])

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

    setTasks((currentTasks) => [...currentTasks, newTask])
    setTitle('')
    setDueAtInput('')
    setReminderAtInput('')
  }

  function toggleTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task,
      ),
    )
  }

  function deleteTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    )
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id)
    setEditTitle(task.title)
    setEditDueAtInput(toDateTimeLocalInput(task.dueAt))
    setEditReminderAtInput(toDateTimeLocalInput(task.reminderAt))
  }

  function cancelEditing() {
    setEditingTaskId(null)
    setEditTitle('')
    setEditDueAtInput('')
    setEditReminderAtInput('')
  }

  function saveEditingTask(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (editingTaskId === null) {
      return
    }

    const trimmedTitle = editTitle.trim()

    if (!trimmedTitle) {
      return
    }

    const updatedDueAt = toIsoTimestamp(editDueAtInput)
    const updatedReminderAt = toIsoTimestamp(editReminderAtInput)
    const originalTask = tasks.find((task) => task.id === editingTaskId)

    if (!originalTask) {
      cancelEditing()
      return
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              title: trimmedTitle,
              dueAt: updatedDueAt,
              reminderAt: updatedReminderAt,
            }
          : task,
      ),
    )

    if (originalTask.reminderAt !== updatedReminderAt) {
      triggeredReminderIds.current.delete(editingTaskId)
    }

    cancelEditing()
  }

  return (
    <main>
      <h1>VoxOpus</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="task-title">New task</label>

        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to be done?"
        />

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

        <button type="submit">Add task</button>
      </form>

      <section>
        <h2>Tasks</h2>

        {tasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                {editingTaskId === task.id ? (
                  <form onSubmit={saveEditingTask}>
                    <label htmlFor={`edit-title-${task.id}`}>Task</label>
                    <input
                      id={`edit-title-${task.id}`}
                      type="text"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                    />

                    <label htmlFor={`edit-due-${task.id}`}>Due date</label>
                    <input
                      id={`edit-due-${task.id}`}
                      type="datetime-local"
                      value={editDueAtInput}
                      onChange={(event) =>
                        setEditDueAtInput(event.target.value)
                      }
                    />

                    <label htmlFor={`edit-reminder-${task.id}`}>
                      Reminder
                    </label>
                    <input
                      id={`edit-reminder-${task.id}`}
                      type="datetime-local"
                      value={editReminderAtInput}
                      onChange={(event) =>
                        setEditReminderAtInput(event.target.value)
                      }
                    />

                    <button type="submit">Save</button>
                    <button type="button" onClick={cancelEditing}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                      />

                      <span
                        style={{
                          textDecoration: task.completed
                            ? 'line-through'
                            : 'none',
                        }}
                      >
                        {task.title}
                      </span>
                    </label>

                    {task.dueAt && (
                      <p>Due: {new Date(task.dueAt).toLocaleString()}</p>
                    )}

                    {task.reminderAt && (
                      <p>
                        Reminder: {new Date(task.reminderAt).toLocaleString()}
                      </p>
                    )}

                    <button type="button" onClick={() => startEditing(task)}>
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      aria-label={`Delete ${task.title}`}
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
