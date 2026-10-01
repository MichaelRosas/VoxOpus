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