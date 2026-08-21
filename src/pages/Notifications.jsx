import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

const TYPE_ICON = { PAYOUT_APPROVAL_NEEDED: '💸', POOL_CHANGED: '🛒', CONTRIBUTION_CONFIRMED: '✅', QUOTE_STATUS: '🍸', ORDER_MATCHED: '📦' }

function Notifications({ onBack, onNavigate }) {
      const { accessToken } = useAuth()
        const [notifications, setNotifications] = useState([])

          const fetchAll = () => {
                  fetch('/api/notifications/my', { headers: { Authorization: `Bearer ${accessToken}` } })
                        .then(res => res.json())
                              .then((data) => setNotifications(Array.isArray(data) ? data : []))
                              .catch(() => setNotifications([]))
          }

            useEffect(() => { fetchAll() }, [])

              const handleTap = async (n) => {
                      if (!n.isRead) {
                                await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } })
                      }
                          if (n.linkScreen) onNavigate(n.linkScreen)
              }

                const markAllRead = async () => {
                        await fetch('/api/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } })
                            fetchAll()
                }

                  return (
                          <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
                                <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
                                      <div className="flex justify-between items-center mb-4">
                                              <h2 className="font-display font-bold text-2xl text-ink">Notifications</h2>
                                                      {notifications.some(n => !n.isRead) && (
                                                                    <button onClick={markAllRead} className="text-xs text-sage-600 font-bold underline">Mark all read</button>
                                                      )}
                                                            </div>

                                                                  {notifications.length === 0 ? (
                                                                              <EmptyState emoji="🔔" title="No notifications" description="You're all caught up." />
                                                                  ) : (
                                                                              <div className="space-y-2">
                                                                                        {notifications.map((n) => (
                                                                                                        <button key={n.id} onClick={() => handleTap(n)}
                                                                                                                      className={`w-full text-left border-2 rounded-soft p-3 flex items-start gap-3 ${n.isRead ? 'bg-white border-ink/10' : 'bg-sage-50 border-sage-300'}`}>
                                                                                                                                    <span className="text-xl">{TYPE_ICON[n.type] || '🔔'}</span>
                                                                                                                                                  <div className="flex-1">
                                                                                                                                                                  <p className="text-sm text-ink">{n.message}</p>
                                                                                                                                                                                  <p className="text-xs text-ink-muted mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                                                                                                                                                                                                </div>
                                                                                                                                                                                                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-terracotta mt-1.5" />}
                                                                                                                                                                                                                          </button>
                                                                                        ))}
                                                                                                </div>
                                                                  )}
                                                                      </div>
                  )
}

export default Notifications                                    