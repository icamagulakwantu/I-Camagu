import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from './Icon.jsx'

function NotificationBell({ onOpen }) {
      const { accessToken } = useAuth()
        const [count, setCount] = useState(0)

          useEffect(() => {
                  const fetchCount = () => {
                            fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${accessToken}` } })
                                    .then(res => res.json())
                                            .then(data => setCount(data.count || 0))
                                                    .catch(() => {})
                  }
                      fetchCount()
                          const interval = setInterval(fetchCount, 30000)
                              return () => clearInterval(interval)
          }, [])

            return (
                    <button
                      onClick={onOpen}
                      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
                      className="relative w-11 h-11 rounded-full bg-white shadow-soft flex items-center justify-center"
                    >
                          <Icon name="bell" size={18} color="#2b2620" />
                                {count > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-terracotta text-white text-[10px] font-black w-5 h-5 rounded-pill flex items-center justify-center">
                                                      {count > 9 ? '9+' : count}
                                                              </span>
                                )}
                                    </button>
            )
}

export default NotificationBell