import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import Icon from '../components/Icon.jsx'

// Icon + colour per notification type, so people can tell at a glance what
// happened (like the coloured badges on Instagram/Facebook activity).
const TYPE_STYLE = {
  PAYOUT_APPROVAL_NEEDED: { icon: 'send', color: '#c45c26' },
  POOL_CHANGED: { icon: 'cart', color: '#c1922f' },
  CONTRIBUTION_CONFIRMED: { icon: 'check', color: '#4a7a4a' },
  QUOTE_STATUS: { icon: 'cocktail', color: '#c1922f' },
  ORDER_MATCHED: { icon: 'package', color: '#4a7a4a' },
  GROUP_EXPENSE_RECORDED: { icon: 'coins', color: '#c1922f' },
  REFUND_REQUESTED: { icon: 'send', color: '#c45c26' },
  REFUND_PROCESSED: { icon: 'check', color: '#4a7a4a' },
  ORDER_FULFILLED: { icon: 'package', color: '#4a7a4a' },
  PLEDGE_RECEIVED: { icon: 'gift', color: '#2f6b5a' },
}
const DEFAULT_STYLE = { icon: 'bell', color: '#c45c26' }

// "Just now", "5 min ago", "3 h ago", "Yesterday", then a short date.
function timeAgo(value) {
  const then = new Date(value)
  const mins = Math.floor((Date.now() - then.getTime()) / 60000)
  if (Number.isNaN(mins)) return ''
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return 'Yesterday'
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function NotificationRow({ n, onTap }) {
  const style = TYPE_STYLE[n.type] || DEFAULT_STYLE
  return (
    <button
      type="button"
      onClick={() => onTap(n)}
      className={`w-full text-left rounded-2xl p-3.5 flex items-start gap-3 transition-transform active:scale-[0.99] ${n.isRead ? 'bg-white ring-1 ring-ink/[0.06]' : 'bg-sage-50 ring-1 ring-sage-300'}`}
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${style.color}1a` }}>
        <Icon name={style.icon} size={18} color={style.color} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm leading-snug break-words ${n.isRead ? 'text-ink' : 'text-ink font-semibold'}`}>{n.message}</span>
        <span className="block text-xs text-ink-muted mt-1">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-terracotta mt-1.5 flex-shrink-0" aria-label="Unread" />}
    </button>
  )
}

function Notifications({ onBack, onNavigate }) {
  const { accessToken } = useAuth()
  const [notifications, setNotifications] = useState(null)

  const fetchAll = () => {
    fetch('/api/notifications/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]))
  }

  useEffect(() => { fetchAll() }, [])

  const handleTap = async (n) => {
    if (!n.isRead) {
      // Mark read straight away on screen; the server catches up.
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
      fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {})
    }
    if (n.linkScreen) onNavigate(n.linkScreen)
  }

  const markAllRead = async () => {
    setNotifications((list) => list.map((x) => ({ ...x, isRead: true })))
    await fetch('/api/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {})
    fetchAll()
  }

  const unread = (notifications || []).filter((n) => !n.isRead)
  const earlier = (notifications || []).filter((n) => n.isRead)

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6 max-w-md mx-auto">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-ink-muted mb-4 min-h-11">
        <Icon name="arrowLeft" size={16} /> Back
      </button>
      <div className="flex justify-between items-end mb-5">
        <div>
          <p className="eyebrow text-terracotta">Izaziso</p>
          <h2 className="font-display font-bold text-2xl text-ink">Notifications</h2>
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={markAllRead} className="text-xs text-sage-700 font-bold underline min-h-11">Mark all read</button>
        )}
      </div>

      {notifications === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[68px] rounded-2xl bg-white/70 animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="bell" title="No notifications" description="You're all caught up. Pledges, offers and orders will show up here." />
      ) : (
        <div className="space-y-5">
          {unread.length > 0 && (
            <section>
              <p className="text-xs font-black uppercase tracking-widest text-ink-muted mb-2">New · {unread.length}</p>
              <div className="space-y-2">{unread.map((n) => <NotificationRow key={n.id} n={n} onTap={handleTap} />)}</div>
            </section>
          )}
          {earlier.length > 0 && (
            <section>
              <p className="text-xs font-black uppercase tracking-widest text-ink-muted mb-2">Earlier</p>
              <div className="space-y-2">{earlier.map((n) => <NotificationRow key={n.id} n={n} onTap={handleTap} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default Notifications
