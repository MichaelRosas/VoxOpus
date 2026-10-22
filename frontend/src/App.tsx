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
    <header className="workspace-header"><h1>VoxOpus</h1><p>Your schedule, spoken.</p></header>
    {reminders.length > 0 && <section className="reminders" aria-labelledby="reminders-heading" role="status">
      <h2 id="reminders-heading">A reminder for you</h2>
      <ul>{reminders.map((reminder) => <li key={reminder.key}><strong>{reminder.title}</strong><p>{new Date(reminder.at).toLocaleString()}</p></li>)}</ul>
      <p>Say “dismiss reminders” to close these. Keep this tab open for reminders.</p>
    </section>}
    <CommandForm tasks={tasks} onConfirm={confirmOperations} onDismissReminders={() => setDismissedReminders((previous) => new Set([...previous, ...reminders.map((item) => item.key)]))} />
    <section className="schedule" aria-labelledby="tasks-heading">
      <div className="schedule-heading"><h2 id="tasks-heading">Your schedule</h2><p>Say “complete” to finish a task, or “delete” to remove it.</p></div>
      <TaskList tasks={tasks} now={now} />
    </section>
    <footer>Voice input only. Use the microphone to add tasks, make corrections, and confirm changes.</footer>
  </main>
}
export default App
