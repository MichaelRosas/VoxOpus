import { test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaskList } from '../src/components/TaskList.tsx'
import { TaskSchema } from 'shared'

test('saved event has a distinct box, strong time range, description and completion label', () => {
  const task = TaskSchema.parse({ id: '77777777-7777-4777-8777-777777777777', title: 'Chemistry quiz', completed: true, startsAt: '2026-10-29T17:00:00-05:00', endsAt: '2026-10-29T18:00:00-05:00', dueAt: null, reminderAt: null, description: 'Chapters 3 and 4' })
  const html = renderToStaticMarkup(<TaskList tasks={[task]} now={Date.parse('2026-10-22T12:00:00Z')} />)
  assert.match(html, /task-row task-row-completed/)
  assert.match(html, /task-time/)
  assert.match(html, /Chemistry quiz/)
  assert.match(html, /Chapters 3 and 4/)
  assert.match(html, /Completed/)
  assert.doesNotMatch(html, /<input|<textarea|<button/)
})
