import { useEffect, useRef, useState } from 'react'
import type { CommandResult, Task } from 'shared'
import { applyTaskOperations } from './taskOperations'
import { TaskList } from './components/TaskList'
import { CommandForm, type CommandFormHandle } from './components/CommandForm'
import { loadTasks, saveTasks } from './storage'
import './App.css'

function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const triggeredReminderIds = useRef(new Set<string>())
  const commandFormRef = useRef<CommandFormHandle | null>(null)
  const [commandBusy, setCommandBusy] = useState(false)

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

  function confirmOperations(operations: CommandResult['operations']) {
    const updatedTasks = applyTaskOperations(tasks, operations)

    for (const originalTask of tasks) {
      const updatedTask = updatedTasks.find((task) => task.id === originalTask.id)

      if (!updatedTask || originalTask.reminderAt !== updatedTask.reminderAt) {
        triggeredReminderIds.current.delete(originalTask.id)
      }
    }

    setTasks(updatedTasks)
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

  return (
    <main className="workspace">
      <header className="workspace-header">
        <h1>VoxOpus</h1>
        <p>Speech powered tasks</p>
      </header>

      <CommandForm
        ref={commandFormRef}
        tasks={tasks}
        onConfirm={confirmOperations}
        onBusyChange={setCommandBusy}
      />

      <div className="workspace-body">
        <section aria-labelledby="tasks-heading">
          <h2 id="tasks-heading">Your tasks</h2>
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onEdit={(task) => commandFormRef.current?.startEditing(task)}
            editDisabled={commandBusy}
          />
        </section>
      </div>
    </main>
  )
}

export default App
