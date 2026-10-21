import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'
import { shareToWhatsApp } from '../lib/whatsapp.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

// The token may come back as `token`, `shareToken`, or inside a full URL.
function tokenFromResponse(data) {
  if (data?.token) return data.token
  if (data?.shareToken) return data.shareToken
  const url = data?.shareUrl || data?.url || data?.link
  if (typeof url === 'string') return url.split('/share/')[1]?.split(/[?#]/)[0] || null
  return null
}

// Creates (or reuses) the plan's share link, then lets the host copy it or
// send it on WhatsApp. People opening it can read the pledges but must
// register to use the app.
export default function PledgeShareCard({ planId, planTitle }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)

  const getLink = async () => {
    const res = await fetch(`/api/ceremonies/plans/${planId}/share-link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Could not create the link')
    const token = tokenFromResponse(data)
    if (!token) throw new Error('Could not create the link')
    return `${window.location.origin}/share/${token}`
  }

  const copy = async () => {
    setBusy(true)
    try {
      const link = await getLink()
      await navigator.clipboard.writeText(link)
      showToast('Link copied', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const whatsapp = async () => {
    setBusy(true)
    try {
      const link = await getLink()
      shareToWhatsApp(`See the family pledges for ${planTitle} on iCamagu. Register to take part: ${link}`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 shadow-soft mb-4">
      <p className="font-bold text-sm text-ink">Share these pledges</p>
      <p className="text-xs text-ink-muted mt-1">Anyone with the link can view the list, but must register to use iCamagu.</p>
      <div className="flex gap-2 mt-3">
        <button type="button" disabled={busy} onClick={copy} className={`flex-1 bg-sage-500 text-white text-sm font-bold py-2.5 rounded-pill ${pressable}`}>Copy link</button>
        <button type="button" disabled={busy} onClick={whatsapp} className={`flex-1 bg-terracotta text-white text-sm font-bold py-2.5 rounded-pill ${pressable}`}>WhatsApp</button>
      </div>
    </div>
  )
}
