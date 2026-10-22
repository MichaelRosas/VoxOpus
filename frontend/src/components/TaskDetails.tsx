import type { Task } from 'shared'
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export function TaskDetails({ task }: { task: Task }) {
  const options = task.recurrence ? { timeZone: task.recurrence.timeZone } : undefined
  const date = (value: string) => new Date(value).toLocaleString(undefined, options)
  return <div className="task-details">
    {task.startsAt && <p className="task-time">{date(task.startsAt)}{task.endsAt && <> to {date(task.endsAt)}</>}</p>}
    {task.description && <p className="task-description">{task.description}</p>}
    {task.dueAt && <p>Due {date(task.dueAt)}</p>}
    {task.recurrence && <p>Every {task.recurrence.daysOfWeek.map((day) => days[day - 1]).join(', ')} · {task.recurrence.timeZone}
      {task.recurrence.until && <> · Until {date(task.recurrence.until)}</>}
    </p>}
    {task.reminderAt && <p>Reminder {date(task.reminderAt)}</p>}
  </div>
}
