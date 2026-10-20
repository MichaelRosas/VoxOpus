import type { Task } from 'shared'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  onToggle: (taskId: string) => void
  onEdit: (task: Task) => void
  editDisabled: boolean
  onDelete: (taskId: string) => void
}

export function TaskList({
  tasks,
  onToggle,
  onEdit,
  editDisabled,
  onDelete,
}: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="empty-state">No tasks yet. Add a task to get started.</p>
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={onEdit}
          editDisabled={editDisabled}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}
