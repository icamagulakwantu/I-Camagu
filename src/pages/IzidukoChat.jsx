import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import Icon from '../components/Icon.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'
// No websocket infra in this app — a short poll while the thread is open
// gives a close-to-real-time feel without adding one just for this.
const POLL_MS = 4000

function timeLabel(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

// The in-app text thread behind Iziduko's "Message" button — only ever
// reachable for a mutually-accepted connection, same gate as
// IzidukoProfileView (the server enforces it independently on every call
// here too, not just on entry).
function IzidukoChat({ userId, onBack, onViewProfile }) {
  const { accessToken, user: me } = useAuth()
  const { showToast } = useToast()
  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const authedFetch = useCallback((url, options = {}) => fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  const loadProfile = useCallback(() => {
    if (!userId) return
    authedFetch(`/api/iziduko/connections/${userId}/profile`)
      .then(async (res) => {
        const data = await res.json()
        if (res.status === 403) { setDenied(true); return }
        if (!res.ok) throw new Error(data.error || 'Could not load this conversation')
        setOtherUser(data)
      })
      .catch((err) => showToast(err.message, 'error'))
  }, [userId, authedFetch, showToast])

  const loadMessages = useCallback((silent = false) => {
    if (!userId) return
    if (!silent) setLoading(true)
    authedFetch(`/api/messages/${userId}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.status === 403) { setDenied(true); return }
        if (!res.ok) throw new Error(data.error || 'Could not load messages')
        setMessages(data.messages || [])
      })
      .catch((err) => { if (!silent) showToast(err.message, 'error') })
      .finally(() => { if (!silent) setLoading(false) })
  }, [userId, authedFetch, showToast])

  useEffect(() => { loadProfile(); loadMessages() }, [loadProfile, loadMessages])

  useEffect(() => {
    if (denied) return
    const interval = setInterval(() => loadMessages(true), POLL_MS)
    return () => clearInterval(interval)
  }, [loadMessages, denied])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    const text = draft.trim()
    if (!text) return
    setSending(true)
    try {
      const res = await authedFetch(`/api/messages/${userId}`, { method: 'POST', body: JSON.stringify({ body: text }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send message')
      setDraft('')
      setMessages((prev) => [...prev, data.message])
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-4 rounded-b-[1.5rem] flex-shrink-0">
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        {otherUser && (
          <button onClick={() => onViewProfile?.(otherUser.id)} className="flex items-center gap-3 text-left">
            <div className="w-11 h-11 rounded-full bg-white/15 overflow-hidden flex items-center justify-center flex-shrink-0">
              {otherUser.profileImage ? <img src={otherUser.profileImage} alt="" className="w-full h-full object-cover" /> : <Icon name="user" size={18} color="#fff" />}
            </div>
            <div>
              <p className="font-display font-bold text-lg leading-tight">{otherUser.firstName} {otherUser.lastName}</p>
              <p className="text-white/70 text-xs">View profile</p>
            </div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-10 w-1/2 ml-auto" /></div>
        ) : denied ? (
          <EmptyState
            emoji="🔒"
            title="Not connected"
            description="You can only message someone once you're both connected — send or accept a request first."
          />
        ) : messages.length === 0 ? (
          <EmptyState emoji="👋" title="Say hello" description="Nothing here yet — send the first message." />
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const mine = m.senderId === me?.id
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-terracotta text-white' : 'bg-white border-2 border-terracotta/15 text-ink'}`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-ink-muted'}`}>{timeLabel(m.createdAt)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {!denied && (
        <div className="flex-shrink-0 px-4 pb-6 pt-2 bg-cream border-t border-terracotta/10">
          <div className="flex gap-2 items-end">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Type a message..."
              rows={1}
              maxLength={2000}
              className="flex-1 border-2 border-terracotta/20 rounded-2xl px-3.5 py-2.5 text-sm resize-none bg-white"
            />
            <button
              onClick={send}
              disabled={sending || !draft.trim()}
              aria-label="Send"
              className={`w-11 h-11 rounded-full bg-terracotta text-white flex items-center justify-center flex-shrink-0 ${pressable}`}
            >
              <Icon name="send" size={16} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default IzidukoChat
