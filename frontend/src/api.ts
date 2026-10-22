import { CommandResultSchema, type CommandResult, type Task } from 'shared'
export async function interpretCommand(command: string, tasks: Task[], previousCommands: string[] = []): Promise<CommandResult> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 45_000)
  try {
    const response = await fetch('/api/commands', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ command, previousCommands, tasks, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    })
    if (!response.ok) {
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('The interpretation service is unavailable. Your request is still here. Please try again shortly.')
      }
      const failure = await response.json() as { error?: string }
      throw new Error(failure.error || 'Could not interpret your request. Your tasks are unchanged. Record a correction or try again.')
    }
    const result = CommandResultSchema.parse(await response.json())
    if (result.clarification !== null && result.operations.length > 0) throw new Error('The proposal needs clarification. Please try again.')
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Interpretation timed out. Your request is still here. Record again to retry.')
    throw error
  } finally { window.clearTimeout(timeout) }
}
