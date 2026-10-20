import type { CommandResult, Task } from 'shared'

export function applyTaskOperations(
  tasks: Task[],
  operations: CommandResult['operations'],
): Task[] {
  let updatedTasks = [...tasks]

  for (const operation of operations) {
    if (operation.type === 'create') {
      updatedTasks.push({
        id: crypto.randomUUID(),
        title: operation.title,
        completed: false,
        dueAt: operation.dueAt,
        reminderAt: operation.reminderAt,
      })
      continue
    }

    const taskIndex = updatedTasks.findIndex(
      (task) => task.id === operation.taskId,
    )
    const task = updatedTasks[taskIndex]

    if (!task) {
      throw new Error('A task in this proposal no longer exists')
    }

    if (operation.type === 'delete') {
      updatedTasks.splice(taskIndex, 1)
      continue
    }

    updatedTasks[taskIndex] = {
      ...task,
      title:
        operation.title.action === 'set'
          ? operation.title.value
          : task.title,
      completed:
        operation.completed.action === 'set'
          ? operation.completed.value
          : task.completed,
      dueAt:
        operation.dueAt.action === 'set'
          ? operation.dueAt.value
          : task.dueAt,
      reminderAt:
        operation.reminderAt.action === 'set'
          ? operation.reminderAt.value
          : task.reminderAt,
    }
  }

  return updatedTasks
}
