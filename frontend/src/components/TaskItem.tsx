import { Mic } from 'lucide-react'
import type { Task } from 'shared'

interface TaskItemProps {
  task: Task
  onToggle: (taskId: string) => void
  onEdit: (task: Task) => void
  editDisabled: boolean
  onDelete: (taskId: string) => void
}

export function TaskItem({
  task,
  onToggle,
  onEdit,
  editDisabled,
  onDelete,
}: TaskItemProps) {
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
        <button
          type="button"
          className="dictation-button"
          onClick={() => onEdit(task)}
          disabled={editDisabled}
          title={editDisabled ? 'Wait for dictation or interpretation to finish' : 'Dictate changes to this task'}
        >
          <Mic size={18} aria-hidden="true" />
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
