import { displayedOccurrence, type Task } from 'shared'
import { TaskItem } from './TaskItem'
export function TaskList({ tasks, now }: { tasks: Task[]; now: number }) {
  if (!tasks.length) return <p className="empty-state">Your schedule is clear. Record a task or event to add it here.</p>
  const ordered = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
    const first = displayedOccurrence(a, now), second = displayedOccurrence(b, now)
    return Date.parse(first.startsAt ?? first.dueAt ?? '9999-01-01') - Date.parse(second.startsAt ?? second.dueAt ?? '9999-01-01')
  })
  return <ul className="task-list">{ordered.map((task) => <TaskItem key={task.id} task={task} now={now} />)}</ul>
}
