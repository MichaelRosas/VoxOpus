import { displayedOccurrence, type Task } from 'shared'
import { TaskDetails } from './TaskDetails'
export function TaskItem({ task, now }: { task: Task; now: number }) {
  const occurrence = displayedOccurrence(task, now)
  return <li className={`task-row${task.completed ? ' task-row-completed' : ''}`}>
    <div className="task-title-line">
      <h3 className={task.completed ? 'task-completed' : undefined}>{task.title}</h3>
      {task.completed && <span>Completed</span>}
    </div>
    <TaskDetails task={occurrence} />
  </li>
}
