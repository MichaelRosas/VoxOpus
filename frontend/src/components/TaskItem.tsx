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
      <li className="task-row">
        <EditTaskForm
          task={task}
          onSave={saveTask}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="task-row">
      <label className="task-label">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
        />

        <span className={task.completed ? 'task-completed' : undefined}>
          {task.title}
        </span>
      </label>

      <div className="task-details">
        {task.dueAt && <p>Due: {new Date(task.dueAt).toLocaleString()}</p>}

        {task.reminderAt && (
          <p>Reminder: {new Date(task.reminderAt).toLocaleString()}</p>
        )}
      </div>

      <div className="task-actions">
        <button type="button" onClick={() => setIsEditing(true)}>
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="delete-button"
          aria-label={`Delete ${task.title}`}
        >
          Delete
        </button>
      </div>
    </li>
  )
}
