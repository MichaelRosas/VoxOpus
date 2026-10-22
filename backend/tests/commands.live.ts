// Explicit opt-in only. Uses synthetic data and incurs a small number of API requests.
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { applyTaskOperations, TaskSchema, type CommandResult } from 'shared'
import { interpretRequest } from '../src/interpreter.ts'
const client = new OpenAI({ maxRetries: 0, timeout: 45_000 })
const id = '77777777-7777-4777-8777-777777777777'
const task = TaskSchema.parse({ id, title: 'Biology quiz', completed: false, dueAt: null, reminderAt: '2026-10-29T16:45:00-05:00' })
const data = { tasks: [task], timeZone: 'America/Chicago', currentTime: '2026-10-22T12:00:00-05:00' }
async function check(name: string, command: string, previousCommands: string[], validate: (result: CommandResult) => void) {
  const result = await interpretRequest(client, { ...data, command, previousCommands })
  applyTaskOperations(data.tasks, result.operations, () => '88888888-8888-4888-8888-888888888888')
  validate(result)
  console.log(`PASS ${name}`)
}
await check('weekly time range and description', 'Add a chemistry quiz every Thursday from 5pm to 6pm starting October 29, 2026. Description: Chapters 3 and 4.', [], (result) => {
  const op = result.operations[0]
  assert.equal(result.clarification, null); assert.equal(op?.type, 'create')
  if (op?.type !== 'create') return
  assert.deepEqual(op.recurrence?.daysOfWeek, [4]); assert.equal(op.recurrence?.timeZone, 'America/Chicago')
  assert.equal(Date.parse(op.startsAt!), Date.parse('2026-10-29T17:00:00-05:00'))
  assert.equal(Date.parse(op.endsAt!), Date.parse('2026-10-29T18:00:00-05:00'))
  assert.match(op.description!, /3.*4/)
})
await check('delete is distinct from completion', 'Delete my Biology quiz task entirely.', [], (result) => {
  assert.equal(result.operations[0]?.type, 'delete')
})
await check('complete preserves the task', 'Mark my Biology quiz complete.', [], (result) => {
  const op = result.operations[0]; assert.equal(op?.type, 'update')
  if (op?.type === 'update') assert.deepEqual(op.completed, { action: 'set', value: true })
})
await check('remove reminder preserves task', 'Remove only the reminder from Biology quiz; keep the task.', [], (result) => {
  const op = result.operations[0]; assert.equal(op?.type, 'update')
  if (op?.type === 'update') assert.deepEqual(op.reminderAt, { action: 'set', value: null })
})
await check('voice correction retains original time range', 'Actually make that Friday October 30, but keep the same times and description.', ['Add a chemistry quiz on Thursday October 29, 2026 from 5pm to 6pm. Description: Chapters 3 and 4.'], (result) => {
  const op = result.operations[0]; assert.equal(op?.type, 'create')
  if (op?.type !== 'create') return
  assert.equal(Date.parse(op.startsAt!), Date.parse('2026-10-30T17:00:00-05:00'))
  assert.equal(Date.parse(op.endsAt!), Date.parse('2026-10-30T18:00:00-05:00'))
  assert.match(op.description!, /3.*4/)
})
await check('ambiguous event asks for a date', 'Add a seminar from 5pm to 6pm.', [], (result) => {
  assert.equal(result.operations.length, 0); assert.ok(result.clarification)
})
console.log('Live synthetic command checks complete.')
