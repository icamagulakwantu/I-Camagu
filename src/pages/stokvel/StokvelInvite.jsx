import { useToast } from '../../components/ui/Toast.jsx'
import Icon from '../../components/Icon.jsx'
import { shareToWhatsApp } from '../../lib/whatsapp.js'
import { stokvelInviteUrl, stokvelInviteMessage } from '../../lib/inviteLinks.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

// An invite link for a stokvel. Anyone who opens it lands in the app; people
// who are new register first and are then added to the stokvel automatically.
export default function StokvelInvite({ stokvelId, stokvelName }) {
  const { showToast } = useToast()
  const url = stokvelInviteUrl(stokvelId)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Invite link copied', 'success')
    } catch {
      showToast('Could not copy. Press and hold the link to copy it.', 'error')
    }
  }

  const shareLink = () => {
    const text = stokvelInviteMessage(stokvelName, stokvelId)
    if (navigator.share) {
      navigator.share({ title: stokvelName, text }).catch(() => {})
    } else {
      shareToWhatsApp(text)
    }
  }

  return (
    <div className="mb-4 pb-4 border-b border-terracotta/15">
      <p className="text-[10px] font-black uppercase tracking-wider text-ink-muted mb-2">Invite people</p>
      <p className="text-xs text-ink-muted mb-2">Send this link. New people register first, then are added to this stokvel automatically.</p>
      <p className="text-[11px] font-mono bg-cream rounded-soft px-3 py-2 break-all select-all text-ink">{url}</p>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={copyLink} className={`flex-1 border-2 border-sage-500 text-sage-600 font-bold py-2 rounded-pill text-sm flex items-center justify-center gap-1.5 ${pressable}`}>
          <Icon name="copy" size={14} /> Copy link
        </button>
        <button type="button" onClick={shareLink} className={`flex-1 bg-[#25D366] text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
          Share
        </button>
      </div>
    </div>
  )
}
