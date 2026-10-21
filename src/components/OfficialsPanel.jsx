import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'

const ROLES = [
  { value: 'TREASURER', label: 'Treasurer' },
  { value: 'SECRETARY', label: 'Secretary' },
  { value: 'CHAIRPERSON', label: 'Chairperson' },
]
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))

// "Who can confirm payments?" — shows the people in the stokvel and lets the
// person who created it make others officials. Officials are the people who
// confirm that money really arrived, and nobody can confirm their own
// payment, so a stokvel needs at least two.
export default function OfficialsPanel({ stokvelId }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [pickRole, setPickRole] = useState({})

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

  const load = useCallback(async () => {
    const res = await fetch(`/api/stokvels/${stokvelId}/officials`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) setData(await res.json())
  }, [stokvelId, accessToken])

  useEffect(() => { load() }, [load])

  const call = async (userId, request) => {
    setBusyId(userId)
    try {
      const res = await request()
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Something went wrong')
      showToast(body.message || 'Saved', 'success')
      await load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const makeOfficial = (userId) => call(userId, () => fetch(`/api/stokvels/${stokvelId}/officials`, {
    method: 'PUT', headers, body: JSON.stringify({ memberUserId: userId, role: pickRole[userId] || 'TREASURER' }),
  }))
  const removeOfficial = (userId) => call(userId, () => fetch(`/api/stokvels/${stokvelId}/officials/${userId}`, {
    method: 'DELETE', headers,
  }))

  if (!data) return null
  const officialCount = data.people.filter((p) => p.role).length

  return (
    <div className="bg-white rounded-soft border border-ink/10 p-4 mt-4">
      <h3 className="font-display font-bold text-base text-ink">Who can confirm payments?</h3>
      <p className="text-sm text-ink/70 mt-1">
        When someone pays, an official checks the money arrived and confirms it. You cannot confirm your own payment,
        so you need at least two officials.
      </p>
      {officialCount < 2 && (
        <p className="text-sm text-terracotta font-semibold mt-2">
          You only have {officialCount} official. {data.isOrganiser ? 'Choose another member below.' : 'Ask the person who created the stokvel to add one.'}
        </p>
      )}
      <ul className="mt-3 divide-y divide-ink/10">
        {data.people.map((p) => (
          <li key={p.userId} className="py-3 flex flex-wrap items-center gap-2">
            <span className="flex-1 min-w-[8rem] text-ink font-semibold">{p.name}</span>
            {p.role ? (
              <span className="text-xs font-bold bg-sage/20 text-ink rounded-pill px-3 py-1">{ROLE_LABEL[p.role]}</span>
            ) : (
              <span className="text-xs text-ink/50">Member</span>
            )}
            {data.isOrganiser && !p.isOrganiser && (
              <div className="flex items-center gap-2">
                {!p.role && (
                  <select
                    aria-label={`Role for ${p.name}`}
                    value={pickRole[p.userId] || 'TREASURER'}
                    onChange={(e) => setPickRole({ ...pickRole, [p.userId]: e.target.value })}
                    className="text-sm border border-ink/20 rounded-soft px-2 py-2 bg-white"
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                )}
                {p.role ? (
                  <button type="button" disabled={busyId === p.userId} onClick={() => removeOfficial(p.userId)}
                    className="text-sm font-semibold text-terracotta px-3 py-2 rounded-pill border border-terracotta/40 disabled:opacity-50">
                    Remove
                  </button>
                ) : (
                  <button type="button" disabled={busyId === p.userId} onClick={() => makeOfficial(p.userId)}
                    className="text-sm font-bold text-white bg-sage px-4 py-2 rounded-pill disabled:opacity-50">
                    Make an official
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
