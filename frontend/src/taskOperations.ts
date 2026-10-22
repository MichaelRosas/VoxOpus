import { applyTaskOperations as apply, type CommandResult, type Task } from 'shared'
export function applyTaskOperations(tasks: Task[], operations: CommandResult['operations']) {
  return apply(tasks, operations, () => crypto.randomUUID())
}
