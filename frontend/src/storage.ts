import { TaskListSchema, type Task } from 'shared'

const STORAGE_KEY = 'voxopus.tasks'

export function loadTasks(): Task[] {
  const storedTasks = localStorage.getItem(STORAGE_KEY)

  if (!storedTasks) {
    return []
  }

  try {
    const parsedData: unknown = JSON.parse(storedTasks)
    const result = TaskListSchema.safeParse(parsedData)

    if (!result.success) {
      console.warn('Stored tasks are invalid', result.error)
      return []
    }

    return result.data
  } catch (error) {
    console.warn('Stored tasks could not be read', error)
    return []
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch (error) {
    console.error('Tasks could not be saved', error)
  }
}