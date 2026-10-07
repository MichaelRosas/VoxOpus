import { useEffect, useRef, useState } from 'react'
import type { Task } from 'shared'
import { CreateTaskForm } from './components/CreateTaskForm'
import { TaskList } from './components/TaskList'
import { loadTasks, saveTasks } from './storage'
import './App.css'

function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const triggeredReminderIds = useRef(new Set<string>())

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

  function addTask(task: Task) {
    setTasks((currentTasks) => [...currentTasks, task])
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

  function updateTask(updatedTask: Task) {
    const originalTask = tasks.find((task) => task.id === updatedTask.id)

    if (!originalTask) {
      return
    }

    if (originalTask.reminderAt !== updatedTask.reminderAt) {
      triggeredReminderIds.current.delete(updatedTask.id)
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      ),
    )
  }

  function deleteTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    )
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <h1>VoxOpus</h1>
        <p>Tasks and reminders, in one place.</p>
      </header>

      <div className="workspace-body">
        <section aria-labelledby="new-task-heading">
          <h2 id="new-task-heading">Add a task</h2>

          <CreateTaskForm onCreate={addTask} />
        </section>

        <section aria-labelledby="tasks-heading">
          <h2 id="tasks-heading">Your tasks</h2>
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        </section>
      </div>
    </main>
  )
}

export default App
