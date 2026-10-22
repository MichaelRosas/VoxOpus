import { TaskSchema, type CommandResult, type Task } from './schemas.js';
import { displayedOccurrence, occurrenceOnOrAfter, shiftOccurrence } from './schedule.js';

// Work on a copy and return only after every operation validates: batches are atomic.
export function applyTaskOperations(
  tasks: Task[], operations: CommandResult['operations'],
  createId: () => string, now = Date.now(),
): Task[] {
  const updated = tasks.map((task) => ({ ...task }));
  for (const operation of operations) {
    if (operation.type === 'create') {
      const { type: _type, ...fields } = operation;
      updated.push(validateTask({ ...fields, id: createId(), completed: false }));
      continue;
    }
    const index = updated.findIndex((task) => task.id === operation.taskId);
    const original = updated[index];
    if (!original) throw new Error('A task in this proposal no longer exists. Please record your request again.');
    if (operation.type === 'delete') { updated.splice(index, 1); continue; }
    let candidate = { ...original };
    for (const key of ['title', 'completed', 'description', 'dueAt', 'reminderAt', 'startsAt', 'endsAt', 'recurrence'] as const) {
      const field = operation[key];
      if (field.action === 'set') Object.assign(candidate, { [key]: field.value });
    }
    candidate = TaskSchema.parse(candidate);
    if (candidate.recurrence && candidate.startsAt && operation.completed.action === 'set' && operation.completed.value) {
      const current = displayedOccurrence({ ...candidate, completed: false }, now);
      const next = occurrenceOnOrAfter(candidate, Math.max(now, Date.parse(current.startsAt!)) + 1);
      if (next) candidate = { ...shiftOccurrence(candidate, next), completed: false };
    }
    updated[index] = validateTask(candidate);
  }
  return updated;
}

function validateTask(value: unknown): Task {
  const task = TaskSchema.parse(value);
  if (task.recurrence && task.startsAt) {
    const first = occurrenceOnOrAfter(task, Date.parse(task.startsAt));
    if (!first || Date.parse(first) !== Date.parse(task.startsAt)) {
      throw new Error('The first occurrence does not match its recurring weekdays. Please record a correction.');
    }
  }
  return task;
}
