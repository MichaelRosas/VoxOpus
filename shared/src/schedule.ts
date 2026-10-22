import { Temporal } from '@js-temporal/polyfill';
import type { Task } from './schemas.js';

// Find an occurrence without creating an unbounded list of duplicate task records.
export function occurrenceOnOrAfter(task: Task, after: number): string | null {
  if (!task.startsAt) return null;
  if (!task.recurrence) return Date.parse(task.startsAt) >= after ? task.startsAt : null;
  const rule = task.recurrence;
  const anchor = Temporal.Instant.from(task.startsAt).toZonedDateTimeISO(rule.timeZone);
  const lower = Math.max(after, Date.parse(task.startsAt));
  let day = Temporal.Instant.fromEpochMilliseconds(lower).toZonedDateTimeISO(rule.timeZone).toPlainDate();
  for (let i = 0; i < 15; i++, day = day.add({ days: 1 })) {
    if (!rule.daysOfWeek.includes(day.dayOfWeek)) continue;
    // Compatible disambiguation moves spring-gap times forward; fall repeats use the first time.
    const candidate = day.toPlainDateTime(anchor.toPlainTime()).toZonedDateTime(rule.timeZone);
    const instant = candidate.toInstant().toString();
    if (candidate.epochMilliseconds < lower) continue;
    if (rule.until && candidate.epochMilliseconds > Date.parse(rule.until)) return null;
    return instant;
  }
  return null;
}

export function shiftOccurrence(task: Task, nextStart: string): Task {
  if (!task.startsAt || !task.recurrence) return task;
  const zone = task.recurrence.timeZone;
  const previous = Temporal.Instant.from(task.startsAt).toZonedDateTimeISO(zone);
  const next = Temporal.Instant.from(nextStart).toZonedDateTimeISO(zone);
  const days = previous.toPlainDate().until(next.toPlainDate()).days;
  const shift = (value: string | null) => value
    ? Temporal.Instant.from(value).toZonedDateTimeISO(zone).add({ days }).toInstant().toString()
    : null;
  return { ...task, startsAt: nextStart, endsAt: shift(task.endsAt), dueAt: shift(task.dueAt), reminderAt: shift(task.reminderAt) };
}

export function displayedOccurrence(task: Task, now: number): Task {
  if (!task.recurrence || task.completed) return task;
  // Keep an event on the agenda until its end, rather than hiding it at start time.
  const duration = task.endsAt && task.startsAt ? Date.parse(task.endsAt) - Date.parse(task.startsAt) : 0;
  const next = occurrenceOnOrAfter(task, now - duration);
  return next ? shiftOccurrence(task, next) : task;
}

export function dueReminder(task: Task, now: number): string | null {
  if (task.completed || !task.reminderAt) return null;
  if (!task.recurrence || !task.startsAt) return Date.parse(task.reminderAt) <= now ? task.reminderAt : null;
  const offset = Date.parse(task.startsAt) - Date.parse(task.reminderAt);
  // Search just the last week, including time-zone shifts at daylight-saving boundaries.
  let start = occurrenceOnOrAfter(task, now + offset - 8 * 86400000);
  let due: string | null = null;
  for (let i = 0; start && i < 10; i++) {
    const reminder = shiftOccurrence(task, start).reminderAt;
    if (reminder && Date.parse(reminder) <= now) due = reminder;
    if (reminder && Date.parse(reminder) > now) break;
    start = occurrenceOnOrAfter(task, Date.parse(start) + 1);
  }
  return due;
}
