import * as z from "zod";

export const TaskSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(200),
  completed: z.boolean(),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  reminderAt: z.iso.datetime({ offset: true }).nullable(),
});

export const TaskListSchema = z.array(TaskSchema);

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskOperationSchema = z.object({
  type: z.literal("create"),
  title: TaskSchema.shape.title,
  dueAt: TaskSchema.shape.dueAt,
  reminderAt: TaskSchema.shape.reminderAt,
});

export const CommandResultSchema = z.object({
  operations: z.array(CreateTaskOperationSchema),
  clarification: z.string().nullable(),
});

export type CommandResult = z.infer<typeof CommandResultSchema>;