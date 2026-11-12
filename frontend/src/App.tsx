import { useEffect, useState } from 'react'
import { dueReminder, type CommandResult, type Task } from 'shared'
import { applyTaskOperations } from './taskOperations'
import { TaskList } from './components/TaskList'
import { CommandForm } from './components/CommandForm'
import { loadTasks, saveTasks } from './storage'
import './App.css'

interface Reminder { key: string; taskId: string; title: string; at: string }
function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [dismissedReminders, setDismissedReminders] = useState(() => new Set<string>())
  const [now, setNow] = useState(Date.now)
  useEffect(() => { saveTasks(tasks) }, [tasks])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])
  // Derive visible reminders from saved tasks; dismissal records only that occurrence.
  const reminders: Reminder[] = tasks.flatMap((task) => {
    const at = dueReminder(task, now)
    const key = `${task.id}:${at}`
    return at && !dismissedReminders.has(key) ? [{ key, taskId: task.id, title: task.title, at }] : []
  })
  function confirmOperations(operations: CommandResult['operations']) {
    // Synchronous validation reports failures to the voice confirmation workflow.
    const updated = applyTaskOperations(tasks, operations)
    setTasks(updated)
  }
  return <main className="workspace">
    <header className="workspace-header"><h1>VoxOpus</h1><p>Speech-powered task management.</p></header>
    {reminders.length > 0 && <section className="reminders" aria-labelledby="reminders-heading" role="status">
      <h2 id="reminders-heading">Reminders</h2>
      <ul>{reminders.map((reminder) => <li key={reminder.key}><strong>{reminder.title}</strong><p>{new Date(reminder.at).toLocaleString()}</p></li>)}</ul>
      <p>Say "dismiss reminders" to dismiss. Keep this tab open to receive reminders.</p>
    </section>}
    <CommandForm tasks={tasks} onConfirm={confirmOperations} onDismissReminders={() => setDismissedReminders((previous) => new Set([...previous, ...reminders.map((item) => item.key)]))} />
    <section className="schedule" aria-labelledby="tasks-heading">
      <div className="schedule-heading"><h2 id="tasks-heading">Tasks</h2></div>
      <TaskList tasks={tasks} now={now} />
    </section>
  </main>
}
export default App
