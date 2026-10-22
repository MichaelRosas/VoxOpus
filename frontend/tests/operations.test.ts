import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyTaskOperations, TaskSchema, occurrenceOnOrAfter, displayedOccurrence, dueReminder, type Task, type CommandResult } from 'shared'
import { voiceAction } from '../src/voiceCommands.ts'
const id = '77777777-7777-4777-8777-777777777777'
const anotherId = '88888888-8888-4888-8888-888888888888'
const base = () => TaskSchema.parse({ id, title: 'Quiz', completed: false, dueAt: null, reminderAt: null })
const keep = { action: 'keep' as const }
const update = (fields = {}): CommandResult['operations'][number] => ({ type: 'update', taskId: id, title: keep, completed: keep, dueAt: keep, reminderAt: keep, description: keep, startsAt: keep, endsAt: keep, recurrence: keep, ...fields })
const recurring = (): Task => ({ ...base(), startsAt: '2026-10-29T17:00:00-05:00', endsAt: '2026-10-29T18:00:00-05:00', reminderAt: '2026-10-29T16:45:00-05:00', recurrence: { frequency: 'weekly', daysOfWeek: [4], timeZone: 'America/Chicago', until: null } })

test('old saved tasks migrate without data loss', () => {
  const task = base()
  assert.equal(task.description, null); assert.equal(task.startsAt, null); assert.equal(task.recurrence, null)
})
test('deletion removes a task; completion preserves it and description', () => {
  const task = { ...base(), description: 'Chapters 3 and 4' }
  const complete = applyTaskOperations([task], [update({ completed: { action: 'set', value: true } })], () => anotherId)
  assert.equal(complete[0]?.completed, true); assert.equal(complete[0]?.description, task.description)
  assert.deepEqual(applyTaskOperations([task], [{ type: 'delete', taskId: id }], () => anotherId), [])
})
test('partial field removal preserves the task and other fields', () => {
  const task = { ...base(), description: 'Read chapters', dueAt: '2026-10-30T10:00:00Z', reminderAt: '2026-10-30T09:00:00Z' }
  const [after] = applyTaskOperations([task], [update({ reminderAt: { action: 'set', value: null } })], () => anotherId)
  assert.equal(after?.reminderAt, null); assert.equal(after?.dueAt, task.dueAt); assert.equal(after?.description, task.description)
})
test('invalid ranges and invalid ID batches fail atomically', () => {
  const tasks = [base()]
  assert.throws(() => applyTaskOperations(tasks, [update({ startsAt: { action: 'set', value: '2026-10-22T18:00:00Z' }, endsAt: { action: 'set', value: '2026-10-22T17:00:00Z' } })], () => anotherId))
  assert.throws(() => applyTaskOperations(tasks, [{ type: 'delete', taskId: id }, update()], () => anotherId))
  assert.equal(tasks[0]?.title, 'Quiz'); assert.equal(tasks.length, 1)
})
test('weekly events preserve 5pm across fall daylight saving and advance on completion', () => {
  const task = recurring()
  assert.equal(occurrenceOnOrAfter(task, Date.parse('2026-10-30T00:00:00Z')), '2026-11-05T23:00:00Z')
  const displayed = displayedOccurrence(task, Date.parse('2026-11-01T00:00:00Z'))
  assert.equal(displayed.startsAt, '2026-11-05T23:00:00Z'); assert.equal(displayed.endsAt, '2026-11-06T00:00:00Z')
  const [next] = applyTaskOperations([task], [update({ completed: { action: 'set', value: true } })], () => anotherId, Date.parse('2026-11-01T00:00:00Z'))
  assert.equal(next?.startsAt, '2026-11-12T23:00:00Z'); assert.equal(next?.completed, false)
  assert.equal(dueReminder(task, Date.parse('2026-11-05T22:46:00Z')), '2026-11-05T22:45:00Z')
})
test('spring daylight saving preserves local time and recurrence end is honored', () => {
  const task = { ...recurring(), startsAt: '2027-03-04T17:00:00-06:00', endsAt: null, reminderAt: null }
  assert.equal(occurrenceOnOrAfter(task, Date.parse('2027-03-12T00:00:00Z')), '2027-03-18T22:00:00Z')
  task.recurrence = { ...task.recurrence!, until: '2027-03-05T00:00:00Z' }
  assert.equal(occurrenceOnOrAfter(task, Date.parse('2027-03-05T00:00:00Z')), null)
})
test('recurrence validates time zone, matching weekday, and required first date', () => {
  assert.equal(TaskSchema.safeParse({ ...recurring(), startsAt: null }).success, false)
  assert.equal(TaskSchema.safeParse({ ...recurring(), recurrence: { ...recurring().recurrence!, timeZone: 'not/a-zone' } }).success, false)
  const task = recurring()
  const { id: _id, completed: _completed, ...fields } = task
  assert.throws(() => applyTaskOperations([], [{ type: 'create', ...fields, recurrence: { ...task.recurrence!, daysOfWeek: [1] } }], () => anotherId))
})
test('standalone voice controls do not match ordinary task commands', () => {
  assert.equal(voiceAction('Confirm changes.'), 'confirm')
  assert.equal(voiceAction('cancel changes'), 'cancel')
  assert.equal(voiceAction('Dismiss reminders'), 'dismiss-reminders')
  assert.equal(voiceAction('Delete my confirm changes task'), null)
})
