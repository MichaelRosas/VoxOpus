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

const TitleChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("keep") }),
  z.object({
    action: z.literal("set"),
    value: TaskSchema.shape.title,
  }),
]);

const CompletedChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("keep") }),
  z.object({
    action: z.literal("set"),
    value: TaskSchema.shape.completed,
  }),
]);

const DateChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("keep") }),
  z.object({
    action: z.literal("set"),
    value: TaskSchema.shape.dueAt,
  }),
]);

export const UpdateTaskOperationSchema = z.object({
  type: z.literal("update"),
  taskId: TaskSchema.shape.id,
  title: TitleChangeSchema,
  completed: CompletedChangeSchema,
  dueAt: DateChangeSchema,
  reminderAt: DateChangeSchema,
});

export const DeleteTaskOperationSchema = z.object({
  type: z.literal("delete"),
  taskId: TaskSchema.shape.id,
});

export const TaskOperationSchema = z.discriminatedUnion("type", [
  CreateTaskOperationSchema,
  UpdateTaskOperationSchema,
  DeleteTaskOperationSchema,
]);

export const CommandResultSchema = z.object({
  operations: z.array(TaskOperationSchema),
  clarification: z.string().nullable(),
});

export type CommandResult = z.infer<typeof CommandResultSchema>;
