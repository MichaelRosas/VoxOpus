import { useState } from 'react'
import type { Task } from 'shared'
import { EditTaskForm } from './EditTaskForm'

interface TaskItemProps {
  task: Task
  onToggle: (taskId: string) => void
  onUpdate: (task: Task) => void
  onDelete: (taskId: string) => void
}

export function TaskItem({
  task,
  onToggle,
  onUpdate,
  onDelete,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)

  function saveTask(updatedTask: Task) {
    onUpdate(updatedTask)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <li>
        <EditTaskForm
          task={task}
          onSave={saveTask}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    )
  }

  return (
    <li>
      <label>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
        />

        <span
          style={{
            textDecoration: task.completed ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
      </label>

      {task.dueAt && <p>Due: {new Date(task.dueAt).toLocaleString()}</p>}

      {task.reminderAt && (
        <p>Reminder: {new Date(task.reminderAt).toLocaleString()}</p>
      )}

      <button type="button" onClick={() => setIsEditing(true)}>
        Edit
      </button>

      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete ${task.title}`}
      >
        Delete
      </button>
    </li>
  )
}
