import { CommandResultSchema, type CommandResult } from 'shared'

export async function interpretCommand(
  command: string,
): Promise<CommandResult> {
  const response = await fetch('/api/commands', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      command,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  })

  if (!response.ok) {
    throw new Error(`Command request failed (${response.status})`)
  }

  const data: unknown = await response.json()
  const result = CommandResultSchema.parse(data)

  if (result.clarification !== null && result.operations.length > 0) {
    throw new Error('Received operations that still need clarification')
  }

  return result
}