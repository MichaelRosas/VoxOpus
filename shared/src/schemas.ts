import * as z from 'zod';

const Timestamp = z.iso.datetime({ offset: true }).nullable();
const Description = z.string().trim().max(2000).nullable();
export const RecurrenceSchema = z.object({
  frequency: z.literal('weekly'),
  // ISO weekdays: Monday=1 through Sunday=7. Dates retain the user's local time.
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  timeZone: z.string().min(1),
  until: Timestamp,
});

const TaskFields = {
  id: z.uuid(),
  title: z.string().trim().min(1).max(200),
  completed: z.boolean(),
  dueAt: Timestamp,
  reminderAt: Timestamp,
  description: Description.default(null),
  startsAt: Timestamp.default(null),
  endsAt: Timestamp.default(null),
  recurrence: RecurrenceSchema.nullable().default(null),
};

export const TaskSchema = z.object(TaskFields).superRefine((task, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (task.endsAt && (!task.startsAt || Date.parse(task.endsAt) <= Date.parse(task.startsAt))) {
    issue('An end time must be after a start time.');
  }
  if (task.recurrence) {
    if (!task.startsAt) issue('A recurring task needs a first start time.');
    try { new Intl.DateTimeFormat('en-US', { timeZone: task.recurrence.timeZone }).format(); }
    catch { issue('The recurrence time zone is invalid.'); }
    if (task.startsAt && task.recurrence.until && Date.parse(task.recurrence.until) < Date.parse(task.startsAt)) {
      issue('The recurrence end must follow its first occurrence.');
    }
    if (new Set(task.recurrence.daysOfWeek).size !== task.recurrence.daysOfWeek.length) {
      issue('Recurring weekdays must be unique.');
    }
  }
});
export const TaskListSchema = z.array(TaskSchema);
export type Task = z.infer<typeof TaskSchema>;

// Operations use required nullable fields, as required by strict Structured Outputs.
export const CreateTaskOperationSchema = z.object({
  type: z.literal('create'), title: TaskFields.title, dueAt: Timestamp, reminderAt: Timestamp,
  description: Description, startsAt: Timestamp, endsAt: Timestamp,
  recurrence: RecurrenceSchema.nullable(),
});
const change = <T extends z.ZodType>(value: T) => z.discriminatedUnion('action', [
  z.object({ action: z.literal('keep') }),
  z.object({ action: z.literal('set'), value }),
]);
export const UpdateTaskOperationSchema = z.object({
  type: z.literal('update'), taskId: TaskFields.id,
  title: change(TaskFields.title), completed: change(TaskFields.completed),
  dueAt: change(Timestamp), reminderAt: change(Timestamp),
  description: change(Description), startsAt: change(Timestamp), endsAt: change(Timestamp),
  recurrence: change(RecurrenceSchema.nullable()),
});
export const DeleteTaskOperationSchema = z.object({ type: z.literal('delete'), taskId: TaskFields.id });
export const TaskOperationSchema = z.discriminatedUnion('type', [
  CreateTaskOperationSchema, UpdateTaskOperationSchema, DeleteTaskOperationSchema,
]);
export const CommandResultSchema = z.object({
  operations: z.array(TaskOperationSchema).max(30), clarification: z.string().nullable(),
});
export type CommandResult = z.infer<typeof CommandResultSchema>;
