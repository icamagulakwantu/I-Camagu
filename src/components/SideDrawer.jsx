import { useEffect } from 'react'

function SideDrawer({ open, onClose, onNavigate, user }) {
      useEffect(() => {
              const handleEscape = (e) => { if (e.key === 'Escape') onClose() }
                  if (open) document.addEventListener('keydown', handleEscape)
                      return () => document.removeEventListener('keydown', handleEscape)
      }, [open, onClose])

        const items = [
  { id: 'profile', emoji: '👤', label: 'Profile' },
  { id: 'ceremony', emoji: '📋', label: 'Ceremony Preparation' },
  { id: 'umqombothi', emoji: '🍺', label: 'Umqombothi Brewing' },
  { id: 'ukugida', emoji: '🎁', label: 'Ukugida' },
  { id: 'ekoyiniadmin', emoji: '⚙️', label: 'Ekoyini Admin' },
  { id: 'activity', emoji: '📜', label: 'My Activity' },
  { id: 'ukusoka', emoji: '🎁', label: 'Ukusoka' },
  { id: 'iziduko', emoji: '🤝', label: 'Iziduko Network' },
  { id: 'directory', emoji: '📖', label: 'Directory' },
  { id: 'legends', emoji: '🏛️', label: 'House of AmaXhosa' },
]

          return (
                  <>
                        <div
                                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                                        onClick={onClose}
                                              />
   <div
  className={`fixed top-0 left-0 bottom-0 w-72 bg-ink text-cream z-50 transition-transform duration-300 ease-snap ${open ? 'translate-x-0' : '-translate-x-full'}`}
  style={{ visibility: open ? 'visible' : 'hidden' }}
>                     
                                                            <div className="p-6 border-b border-cream/10">
                                                                      <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full border border-cream/30 flex items-center justify-center">✕</button>
                                                                                <h2 className="font-display font-bold text-xl">iCamagu</h2>
                                                                                          <p className="text-cream/50 text-xs mt-1">{user?.firstName} {user?.lastName}</p>
                                                                                                  </div>
                                                                                                          <div className="py-2">
                                                                                                                    {items.map((item) => (
                                                                                                                                    <button key={item.id} onClick={() => { onNavigate(item.id); onClose() }}
                                                                                                                                                  className="w-full flex items-center gap-3 px-6 py-3.5 text-left hover:bg-white/5 active:bg-white/10">
                                                                                                                                                                <span className="text-lg">{item.emoji}</span>
                                                                                                                                                                              <span className="font-bold text-sm">{item.label}</span>
                                                                                                                                                                                          </button>
                                                                                                                    ))}
                                                                                                                            </div>
                                                                                                                                  </div>
                                                                                                                                      </>
          )
}

export default SideDrawer
