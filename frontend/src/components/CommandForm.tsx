import { useEffect, useRef, useState } from 'react'
import { CircleCheck, LoaderCircle, Mic, Square } from 'lucide-react'
import type { CommandResult, Task } from 'shared'
import { applyTaskOperations } from '../taskOperations'
import { interpretCommand } from '../api'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { voiceAction } from '../voiceCommands'
import { TaskDetails } from './TaskDetails'

interface Props {
  tasks: Task[]
  onConfirm: (operations: CommandResult['operations']) => void
  onDismissReminders: () => void
}

export function CommandForm({ tasks, onConfirm, onDismissReminders }: Props) {
  const [history, setHistory] = useState<string[]>([])
  const [lastRequest, setLastRequest] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [hasRecorded, setHasRecorded] = useState(false)
  const [result, setResult] = useState<CommandResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<string[]>([])
  const receiptRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (receipt.length) receiptRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [receipt])
  const [message, setMessage] = useState('Record a request. We will interpret it when you finish speaking.')
  const requestInFlight = useRef(false)
  const speech = useSpeechRecognition()

  async function handleUtterance(text: string) {
    if (!text.trim() || requestInFlight.current) return
    const action = voiceAction(text)
    if (action === 'dismiss-reminders') {
      onDismissReminders()
      setMessage('Reminders dismissed. Your tasks are unchanged.')
      return
    }
    if (action === 'cancel') {
      setResult(null); setHistory([]); setError(null)
      setMessage('Changes discarded. Your last request is still visible; your saved tasks are unchanged.')
      return
    }
    if (action === 'confirm') {
      if (!result || result.clarification !== null || result.operations.length === 0) {
        setMessage('There are no changes ready to confirm. Record a request or answer the question below.')
        return
      }
      try {
        onConfirm(result.operations)
        setReceipt(result.operations.map((operation) => {
          if (operation.type === 'create') return `Added: ${operation.title}`
          const original = tasks.find((task) => task.id === operation.taskId)
          const title = original?.title ?? 'Task'
          if (operation.type === 'delete') return `Deleted: ${title}`
          if (operation.completed.action === 'set') {
            return operation.completed.value
              ? `Completed: ${title}${original?.recurrence ? '. Next occurrence scheduled if the series continues.' : ''}`
              : `Reopened: ${title}`
          }
          return `Updated: ${operation.title.action === 'set' ? operation.title.value : title}`
        }))
        setResult(null); setHistory([]); setError(null)
        setMessage('Changes saved. Record another request whenever you are ready.')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not save changes. Please try again.')
      }
      return
    }
    if (history.length >= 16) {
      setError('This request has many revisions. Say “cancel changes”, then record a fresh request. Your saved tasks are unchanged.')
      return
    }
    requestInFlight.current = true
    setIsLoading(true); setError(null)
    // A new recording never erases prior intent. Corrections replace the proposal, not saved tasks.
    const nextHistory = [...history, text]
    setHistory(nextHistory); setLastRequest(nextHistory)
    setResult(null)
    try {
      const proposal = await interpretCommand(text, tasks, history)
      applyTaskOperations(tasks, proposal.operations) // Validate before presenting a confirmable proposal.
      setResult(proposal)
      setMessage(proposal.clarification ? 'Record your answer to the question below.'
        : proposal.operations.length ? 'Review the proposal below. Record “confirm changes”, “cancel changes”, or a correction.'
        : 'No changes proposed. Record a correction or say “cancel changes”.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not interpret your request. Record again to retry.')
      setMessage('Your request has been kept. Record “try again”, a correction, or “cancel changes”.')
    } finally { requestInFlight.current = false; setIsLoading(false) }
  }

  function startRecording() {
    if (isLoading || speech.isActive || requestInFlight.current) return
    setHasRecorded(true); setTranscript(''); setError(null); setReceipt([])
    speech.start((text) => { if (text) setTranscript(text) }, (final) => { void handleUtterance(final) })
  }

  // Compute each row from the preceding operation so multi-step previews match confirmation.
  let proposedTasks = tasks
  const previews = result?.operations.map((operation) => {
    const original = operation.type === 'create' ? undefined : proposedTasks.find((task) => task.id === operation.taskId)
    const beforeIds = new Set(proposedTasks.map((task) => task.id))
    proposedTasks = applyTaskOperations(proposedTasks, [operation])
    const after = operation.type === 'delete' ? undefined : proposedTasks.find((task) =>
      operation.type === 'create' ? !beforeIds.has(task.id) : task.id === operation.taskId)
    return { operation, original, after }
  }) ?? []

  return <section className="voice-workspace" aria-labelledby="voice-heading">
    <div className="voice-intro">
      <h2 id="voice-heading">What’s on your schedule?</h2>
      <p>Try “Add a quiz every Thursday from 5 to 6 pm” or “Remind me to read tomorrow at 4 pm”.</p>
      <p className="voice-help">Create, describe, change, complete, or delete tasks by voice.</p>
    </div>
    <button type="button" className="microphone-button"
      onClick={speech.isActive ? speech.stop : startRecording}
      disabled={!speech.isSupported || isLoading || speech.status === 'starting' || speech.status === 'stopping'}
      aria-label={isLoading ? 'Interpreting request' : speech.isActive ? 'Stop recording' : 'Start recording'}
      aria-busy={isLoading}
      aria-describedby="dictation-status" aria-pressed={speech.isActive}>
      {speech.isActive ? <Square size={32} aria-hidden="true" /> : <Mic size={36} aria-hidden="true" />}
    </button>
    <p className="microphone-label">{isLoading ? 'Interpreting request' : speech.isActive ? 'Stop recording' : 'Record a request'}</p>
    <p className="command-status" id="dictation-status" role="status">
      {isLoading && <LoaderCircle className="interpretation-spinner" size={22} aria-hidden="true" />}
      {!speech.isSupported ? 'Speech recognition is unavailable. Open this app in a browser that supports microphone dictation.'
        : isLoading ? 'Interpreting your request. Your saved tasks have not changed.'
        : speech.status === 'starting' ? 'Starting microphone…'
        : speech.status === 'listening' ? 'Listening. Speak your request, then pause or press Stop.'
        : speech.status === 'stopping' ? 'Finishing your recording…' : message}
    </p>
    {(speech.error || error) && <p className="command-error" role="alert">{speech.error || error}</p>}
    {receipt.length > 0 && <section ref={receiptRef} className="confirmation-receipt" role="status" aria-labelledby="saved-heading">
      <CircleCheck size={28} aria-hidden="true" />
      <div><h3 id="saved-heading">Changes saved</h3><ul>{receipt.map((item, index) => <li key={index}>{item}</li>)}</ul>
      <p>Your schedule below is up to date.</p></div>
    </section>}
    {hasRecorded && <section className="transcript" aria-labelledby="transcript-heading">
      <h3 id="transcript-heading">{speech.isActive ? 'What you’re saying' : 'What we heard'}</h3>
      <output aria-live="off">{transcript || 'Your words will appear here while you speak.'}</output>
      {lastRequest.length > 0 && <div className="request-context"><h3>{history.length ? 'Current request' : 'Last request'}</h3>
        {lastRequest.map((part, index) => <p key={index}>{part}</p>)}
      </div>}
    </section>}
    {result?.clarification && <section className="clarification" aria-labelledby="question-heading">
      <h3 id="question-heading">One detail to clarify</h3><p>{result.clarification}</p>
      <p>Record your answer. Your original request will be kept.</p>
    </section>}
    {result && !result.clarification && result.operations.length > 0 && <section className="command-preview" aria-labelledby="review-heading">
      <h3 id="review-heading">Proposed changes</h3>
      <ul>{previews.map(({ operation, original, after }, index) => {
        return <li key={index}>
          <h4>{operation.type === 'delete' ? 'Delete' : operation.type === 'create' ? 'Add' : 'Change'}: {after?.title ?? original?.title ?? 'Task'}</h4>
          {operation.type === 'delete' && <p>{original?.recurrence ? 'This removes the entire recurring series and its reminders.' : 'This removes the task and its reminder.'}</p>}
          {after && <><p>{after.completed ? 'Completed' : 'Open'}{original?.recurrence && operation.type === 'update' && operation.completed.action === 'set' && operation.completed.value ? ' · Current occurrence complete; next occurrence scheduled' : ''}</p><TaskDetails task={after} /></>}
        </li>
      })}</ul>
      <p className="confirmation-help">Say “confirm changes” to save, “cancel changes” to discard, or record a correction.</p>
    </section>}
  </section>
}
