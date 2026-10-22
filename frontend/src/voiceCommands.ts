// Only standalone phrases are control actions; 'delete my confirm changes task' stays a request.
export function voiceAction(text: string): 'confirm' | 'cancel' | 'dismiss-reminders' | null {
  const normalized = text.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
  if (/^(confirm|confirm changes|confirm the changes|yes confirm|save changes)$/.test(normalized)) return 'confirm'
  if (/^(cancel|cancel changes|cancel the changes|discard changes|start over)$/.test(normalized)) return 'cancel'
  if (/^(dismiss reminders?|dismiss all reminders?|clear reminders?)$/.test(normalized)) return 'dismiss-reminders'
  return null
}
