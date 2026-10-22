import type OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { CommandResultSchema } from 'shared';
import type { CommandRequest } from './app.js';
import { commandInstructions } from './commandInstructions.js';

export async function interpretRequest(client: OpenAI, request: CommandRequest & { currentTime: string }) {
  const result = await client.responses.parse({
    model: process.env.OPENAI_MODEL || 'gpt-6-luna',
    instructions: commandInstructions,
    input: JSON.stringify(request),
    text: { format: zodTextFormat(CommandResultSchema, 'command_result') },
    max_output_tokens: 6000,
  });
  if (result.status !== 'completed' || !result.output_parsed) throw new Error('Incomplete model result');
  return result.output_parsed;
}
