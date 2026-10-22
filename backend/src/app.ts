import express from 'express';
import { z } from 'zod';
import { applyTaskOperations, CommandResultSchema, TaskListSchema, type CommandResult } from 'shared';
import { randomUUID } from 'node:crypto';

const RequestSchema = z.object({
  command: z.string().trim().min(1).max(4000),
  previousCommands: z.array(z.string().max(4000)).max(16).default([]),
  timeZone: z.string().min(1).refine((zone) => {
    try { new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(); return true; }
    catch { return false; }
  }, 'Invalid timezone'),
  tasks: TaskListSchema,
});
export type CommandRequest = z.infer<typeof RequestSchema>;
export type Interpreter = (request: CommandRequest & { currentTime: string }) => Promise<CommandResult>;

// Dependency injection lets tests exercise HTTP validation without credentials or model calls.
export function createApp(interpret: Interpreter) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.post('/api/commands', async (req, res) => {
    const request = RequestSchema.safeParse(req.body);
    if (!request.success) {
      res.status(400).json({ error: 'The command, tasks, or timezone is invalid. Please record your request again.' });
      return;
    }
    try {
      const proposal = CommandResultSchema.parse(await interpret({ ...request.data, currentTime: new Date().toISOString() }));
      if (proposal.clarification !== null && proposal.operations.length > 0) throw new Error('Ambiguous proposal');
      // Validate the exact same atomic operation rules used at confirmation in the browser.
      applyTaskOperations(request.data.tasks, proposal.operations, randomUUID);
      res.json(proposal);
    } catch (error) {
      console.error('Command interpretation failed:', error instanceof Error ? error.message : 'Unknown error');
      res.status(502).json({ error: 'Could not interpret a valid change. Your tasks are unchanged. Please record a correction or try again.' });
    }
  });
  return app;
}
