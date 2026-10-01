export function toIsoTimestamp(value: string): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

export function toDateTimeLocalInput(timestamp: string | null): string {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp)
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  const localDate = new Date(date.getTime() - timezoneOffset)

  return localDate.toISOString().slice(0, 16)
}
