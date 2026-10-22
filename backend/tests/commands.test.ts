import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp, type CommandRequest } from '../src/app.ts'
import { TaskSchema, type CommandResult } from 'shared'
const id = '77777777-7777-4777-8777-777777777777'
async function request(proposal: CommandResult, body: unknown) {
  let received: CommandRequest | undefined
  const app = createApp(async (data) => { received = data; return proposal })
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  try {
    const address = server.address() as { port: number }
    const response = await fetch(`http://127.0.0.1:${address.port}/api/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { status: response.status, data: await response.json(), received }
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())) }
}
const task = TaskSchema.parse({ id, title: 'Quiz', completed: false, dueAt: null, reminderAt: null })
const body = { command: 'Delete the quiz', tasks: [task], timeZone: 'America/Chicago', previousCommands: ['Add a quiz Thursday'] }
test('HTTP preserves unconfirmed request context and supports deletion', async () => {
  const result = await request({ operations: [{ type: 'delete', taskId: id }], clarification: null }, body)
  assert.equal(result.status, 200); assert.deepEqual(result.received?.previousCommands, body.previousCommands)
})
test('HTTP rejects unknown references and conflicting clarification', async () => {
  assert.equal((await request({ operations: [{ type: 'delete', taskId: '88888888-8888-4888-8888-888888888888' }], clarification: null }, body)).status, 502)
  assert.equal((await request({ operations: [{ type: 'delete', taskId: id }], clarification: 'Which?' }, body)).status, 502)
})
test('HTTP validates timezone, empty speech and invalid time frames', async () => {
  assert.equal((await request({ operations: [], clarification: null }, { ...body, timeZone: 'bad-zone' })).status, 400)
  assert.equal((await request({ operations: [], clarification: null }, { ...body, command: '' })).status, 400)
  const { id: _id, completed: _complete, ...fields } = task
  const proposal: CommandResult = { operations: [{ type: 'create', ...fields, startsAt: '2026-10-22T18:00:00Z', endsAt: '2026-10-22T17:00:00Z' }], clarification: null }
  assert.equal((await request(proposal, body)).status, 502)
})
