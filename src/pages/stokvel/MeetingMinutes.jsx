import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import Icon from '../../components/Icon.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'
const inp = 'w-full border border-ink/20 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60'

const fmt = (iso) =>
  new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

// ── MeetingMinutes ─────────────────────────────────────────────────────────
// Full meeting record: date, location, attendees (free text list), agenda
// items (title + discussion notes + resolution), and action items with owner
// and due date. All stored via /api/stokvels/:id/minutes.
export default function MeetingMinutes({ stokvelId, isOrganiser }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [minutes, setMinutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)

  // New meeting form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [location, setLocation] = useState('')
  const [attendees, setAttendees] = useState('')
  const [apologies, setApologies] = useState('')
  const [agendaItems, setAgendaItems] = useState([{ title: '', discussion: '', resolution: '' }])
  const [actionItems, setActionItems] = useState([{ task: '', owner: '', dueDate: '' }])
  const [chairperson, setChairperson] = useState('')
  const [secretary, setSecretary] = useState('')
  const [nextMeetingDate, setNextMeetingDate] = useState('')
  const [nextMeetingLocation, setNextMeetingLocation] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/minutes`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = res.ok ? await res.json() : []
      setMinutes(Array.isArray(data) ? data : [])
    } catch {
      setMinutes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [stokvelId])

  const addAgenda = () =>
    setAgendaItems((prev) => [...prev, { title: '', discussion: '', resolution: '' }])
  const removeAgenda = (i) => setAgendaItems((prev) => prev.filter((_, idx) => idx !== i))
  const updateAgenda = (i, field, val) =>
    setAgendaItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)))

  const addAction = () =>
    setActionItems((prev) => [...prev, { task: '', owner: '', dueDate: '' }])
  const removeAction = (i) => setActionItems((prev) => prev.filter((_, idx) => idx !== i))
  const updateAction = (i, field, val) =>
    setActionItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)))

  const save = async (e) => {
    e.preventDefault()
    if (!date) return
    setSaving(true)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/minutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          date,
          location,
          chairperson,
          secretary,
          attendees: attendees.split('\n').map((s) => s.trim()).filter(Boolean),
          apologies: apologies.split('\n').map((s) => s.trim()).filter(Boolean),
          agendaItems: agendaItems.filter((a) => a.title.trim()),
          actionItems: actionItems.filter((a) => a.task.trim()),
          nextMeetingDate,
          nextMeetingLocation,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save minutes')
      showToast('Minutes saved', 'success')
      setCreating(false)
      resetForm()
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10))
    setLocation(''); setChairperson(''); setSecretary('')
    setAttendees(''); setApologies('')
    setAgendaItems([{ title: '', discussion: '', resolution: '' }])
    setActionItems([{ task: '', owner: '', dueDate: '' }])
    setNextMeetingDate(''); setNextMeetingLocation('')
  }

  if (creating) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-ink">New Meeting Minutes</h3>
          <button type="button" onClick={() => setCreating(false)}
            className="text-xs text-ink-muted font-bold">Cancel</button>
        </div>

        <form onSubmit={save} className="space-y-4">
          {/* Header details */}
          <div className="card-paper p-4 space-y-3">
            <p className="eyebrow text-ink-muted">Meeting details</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Date *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} required />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Location</label>
                <input type="text" placeholder="e.g. Mama Grace's home" value={location}
                  onChange={(e) => setLocation(e.target.value)} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Chairperson</label>
                <input type="text" placeholder="Name" value={chairperson}
                  onChange={(e) => setChairperson(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Secretary</label>
                <input type="text" placeholder="Name" value={secretary}
                  onChange={(e) => setSecretary(e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          {/* Attendance */}
          <div className="card-paper p-4 space-y-3">
            <p className="eyebrow text-ink-muted">Attendance</p>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">
                Present (one name per line)
              </label>
              <textarea rows={4} placeholder={"Thandi Dlamini\nNomvula Khumalo\nSipho Zulu"}
                value={attendees} onChange={(e) => setAttendees(e.target.value)}
                className={`${inp} resize-none`} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">
                Apologies (one name per line)
              </label>
              <textarea rows={2} placeholder="Bongani Ndlovu"
                value={apologies} onChange={(e) => setApologies(e.target.value)}
                className={`${inp} resize-none`} />
            </div>
          </div>

          {/* Agenda items */}
          <div className="card-paper p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-ink-muted">Agenda items</p>
              <button type="button" onClick={addAgenda}
                className="text-xs font-bold text-terracotta">+ Add item</button>
            </div>
            {agendaItems.map((item, i) => (
              <div key={i} className="border border-terracotta/15 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black text-ink-muted uppercase">Item {i + 1}</p>
                  {agendaItems.length > 1 && (
                    <button type="button" onClick={() => removeAgenda(i)}
                      className="text-[11px] text-terracotta font-bold">Remove</button>
                  )}
                </div>
                <input type="text" placeholder="Agenda title (e.g. Contribution increase)"
                  value={item.title} onChange={(e) => updateAgenda(i, 'title', e.target.value)}
                  className={inp} />
                <textarea rows={2} placeholder="Discussion notes..."
                  value={item.discussion} onChange={(e) => updateAgenda(i, 'discussion', e.target.value)}
                  className={`${inp} resize-none`} />
                <input type="text" placeholder="Resolution / outcome"
                  value={item.resolution} onChange={(e) => updateAgenda(i, 'resolution', e.target.value)}
                  className={inp} />
              </div>
            ))}
          </div>

          {/* Action items */}
          <div className="card-paper p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-ink-muted">Action items</p>
              <button type="button" onClick={addAction}
                className="text-xs font-bold text-terracotta">+ Add action</button>
            </div>
            {actionItems.map((item, i) => (
              <div key={i} className="border border-terracotta/15 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black text-ink-muted uppercase">Action {i + 1}</p>
                  {actionItems.length > 1 && (
                    <button type="button" onClick={() => removeAction(i)}
                      className="text-[11px] text-terracotta font-bold">Remove</button>
                  )}
                </div>
                <input type="text" placeholder="Task description"
                  value={item.task} onChange={(e) => updateAction(i, 'task', e.target.value)}
                  className={inp} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Who is responsible"
                    value={item.owner} onChange={(e) => updateAction(i, 'owner', e.target.value)}
                    className={inp} />
                  <input type="date" value={item.dueDate}
                    onChange={(e) => updateAction(i, 'dueDate', e.target.value)}
                    className={inp} />
                </div>
              </div>
            ))}
          </div>

          {/* Next meeting */}
          <div className="card-paper p-4 space-y-3">
            <p className="eyebrow text-ink-muted">Next meeting</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Date</label>
                <input type="date" value={nextMeetingDate}
                  onChange={(e) => setNextMeetingDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Location</label>
                <input type="text" placeholder="Venue" value={nextMeetingLocation}
                  onChange={(e) => setNextMeetingLocation(e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving || !date}
            className={`w-full bg-terracotta text-white font-bold py-3 rounded-pill text-sm ${pressable}`}>
            {saving ? 'Saving...' : 'Save meeting minutes'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Meeting Minutes</h3>
          <p className="text-xs text-ink-muted">{minutes.length} meeting{minutes.length !== 1 ? 's' : ''} recorded</p>
        </div>
        {isOrganiser && (
          <button type="button" onClick={() => setCreating(true)}
            className={`bg-terracotta text-white text-xs font-bold px-4 py-2 rounded-pill ${pressable}`}>
            + New minutes
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : minutes.length === 0 ? (
        <div className="card-paper p-6 text-center">
          <Icon name="file" size={32} color="#c45c26" />
          <p className="font-bold text-ink mt-3 mb-1">No minutes yet</p>
          <p className="text-xs text-ink-muted">
            {isOrganiser
              ? 'Tap "New minutes" to record your first meeting.'
              : 'The organiser has not recorded any minutes yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {minutes.map((m) => (
            <div key={m.id} className="card-paper overflow-hidden">
              <button type="button" onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                className={`w-full flex items-center justify-between p-4 text-left ${pressable}`}>
                <div>
                  <p className="font-bold text-sm text-ink">{fmt(m.date)}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {m.location || 'Location not recorded'} &bull;{' '}
                    {(m.attendees || []).length} present
                  </p>
                </div>
                <Icon name={expanded === m.id ? 'chevronUp' : 'chevronDown'} size={16} color="#8a8278" />
              </button>

              {expanded === m.id && (
                <div className="border-t border-terracotta/10 px-4 py-4 space-y-4 text-sm">
                  {/* Officials */}
                  {(m.chairperson || m.secretary) && (
                    <div className="flex gap-4">
                      {m.chairperson && <p className="text-xs text-ink-muted"><span className="font-bold">Chair:</span> {m.chairperson}</p>}
                      {m.secretary && <p className="text-xs text-ink-muted"><span className="font-bold">Secretary:</span> {m.secretary}</p>}
                    </div>
                  )}

                  {/* Attendance */}
                  {(m.attendees?.length > 0 || m.apologies?.length > 0) && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-ink-muted mb-1">Attendance</p>
                      {m.attendees?.length > 0 && (
                        <p className="text-xs text-ink"><span className="font-bold">Present:</span> {m.attendees.join(', ')}</p>
                      )}
                      {m.apologies?.length > 0 && (
                        <p className="text-xs text-ink-muted mt-0.5"><span className="font-bold">Apologies:</span> {m.apologies.join(', ')}</p>
                      )}
                    </div>
                  )}

                  {/* Agenda */}
                  {m.agendaItems?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-ink-muted mb-2">Agenda</p>
                      <div className="space-y-2">
                        {m.agendaItems.map((a, i) => (
                          <div key={i} className="border-l-2 border-terracotta/30 pl-3">
                            <p className="font-bold text-xs text-ink">{i + 1}. {a.title}</p>
                            {a.discussion && <p className="text-xs text-ink-muted mt-0.5">{a.discussion}</p>}
                            {a.resolution && (
                              <p className="text-xs font-bold text-terracotta mt-0.5">
                                Resolution: {a.resolution}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action items */}
                  {m.actionItems?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-ink-muted mb-2">Action items</p>
                      <div className="space-y-1.5">
                        {m.actionItems.map((a, i) => (
                          <div key={i} className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="w-4 h-4 rounded-full border-2 border-terracotta/40 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-ink">{a.task}</p>
                                {a.owner && <p className="text-[11px] text-ink-muted">{a.owner}</p>}
                              </div>
                            </div>
                            {a.dueDate && (
                              <p className="text-[10px] text-ink-muted flex-shrink-0">{fmt(a.dueDate)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next meeting */}
                  {m.nextMeetingDate && (
                    <div className="bg-terracotta/5 rounded-2xl px-3 py-2">
                      <p className="text-[11px] font-black uppercase text-terracotta mb-0.5">Next meeting</p>
                      <p className="text-xs text-ink">
                        {fmt(m.nextMeetingDate)}
                        {m.nextMeetingLocation ? ` at ${m.nextMeetingLocation}` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
