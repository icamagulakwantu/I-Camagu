import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { request } from './api.js'
import { rand } from './format.js'

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

function Line({ icon, title, detail, action, onClick, children }) {
  const body = (
    <>
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#2e4a2e]/10">
        <Icon name={icon} size={18} color="#2e4a2e" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-ink">{title}</span>
        <span className="block text-[13px] leading-snug text-ink-muted">{detail}</span>
        {children}
      </span>
      {action && <span className="flex-shrink-0 text-[13px] font-bold text-[#1f3320]">{action}</span>}
    </>
  )
  return onClick
    ? <button type="button" onClick={onClick} className="pressable flex w-full items-center gap-3 border-b border-ink/[0.06] px-4 py-3 text-left last:border-b-0">{body}</button>
    : <div className="flex w-full items-center gap-3 border-b border-ink/[0.06] px-4 py-3 last:border-b-0">{body}</div>
}

// Konke kunye: the whole vehicle for one ceremony (docs/VISION.md). The
// stokvel saving for it, buying together, the clan, the ukugida book and
// the photos, each one tap away from the ceremony.
export default function ConnectedCard({ ceremony, title, accessToken, onNavigate, onChanged, showToast }) {
  const [stokvels, setStokvels] = useState(null)
  const [gifts, setGifts] = useState([])
  const [albums, setAlbums] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // /api/stokvels/my lists memberships, each with its stokvel inside.
    request('/api/stokvels/my', accessToken)
      .then((d) => setStokvels(Array.isArray(d) ? d.map((m) => ({ id: m.stokvel?.id || m.stokvelId, name: m.stokvel?.name || 'Stokvel', balance: Number(m.stokvel?.groupLedger?.totalBalance) || 0 })) : []))
      .catch(() => setStokvels([]))
    request('/api/reciprocity/my', accessToken).then((d) => setGifts(Array.isArray(d) ? d.filter((g) => same(g.ceremonyLabel, title)) : [])).catch(() => {})
    request('/api/portals/my', accessToken).then((d) => setAlbums(Array.isArray(d) ? d.filter((p) => same(p.title, title)) : [])).catch(() => {})
  }, [accessToken, title])

  const update = async (data, done) => {
    setBusy(true)
    try {
      await request(`/api/ceremonies/${ceremony.id}`, accessToken, { method: 'PUT', body: JSON.stringify(data) })
      showToast?.(done, 'success')
      onChanged?.()
    } catch (err) {
      showToast?.(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const linked = stokvels?.find((s) => s.id === ceremony.savingStokvelId)
  const received = gifts.filter((g) => g.direction === 'RECEIVED').length
  const photos = albums.reduce((n, a) => n + (a.media?.length || a._count?.media || 0), 0)
  const clanCanSee = ceremony.visibility === 'CLAN_ONLY' || ceremony.visibility === 'PUBLIC'

  return (
    <section aria-label="Everything for this ceremony" className="pt-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">Konke kunye · Everything for it</p>
      <h2 className="mb-3 mt-0.5 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">Save, buy, gather, remember</h2>
      <div className="overflow-hidden rounded-[22px] bg-[#fffdf9] shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
        {linked ? (
          <Line icon="coins" title={`Saving: ${linked.name}`} detail={`${rand(linked.balance)} saved together so far`} action="Open" onClick={() => onNavigate?.('stokvels')} />
        ) : (
          <Line icon="coins" title="Saving for it" detail={stokvels?.length ? 'Choose the stokvel that is saving for this ceremony' : 'Start a stokvel with the family, or join one'} action={stokvels?.length ? null : 'Start'} onClick={stokvels?.length ? null : () => onNavigate?.('stokvels')}>
            {stokvels?.length > 0 && (
              <select
                aria-label="Stokvel saving for this ceremony"
                disabled={busy}
                defaultValue=""
                onChange={(e) => e.target.value && update({ savingStokvelId: e.target.value }, 'Stokvel linked')}
                className="mt-2 h-10 w-full rounded-[10px] border border-ink/15 bg-white px-2 text-sm text-ink"
              >
                <option value="">Choose a stokvel…</option>
                {stokvels.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </Line>
        )}
        <Line icon="cart" title="Buy together" detail="Livestock, drinks and groceries at group prices" action="Shop" onClick={() => onNavigate?.('store')} />
        {clanCanSee ? (
          <Line icon="users" title="Your clan can see it" detail="It shows on your clan members' Home, so they can come and help" action="Clan" onClick={() => onNavigate?.('iziduko')} />
        ) : (
          <Line icon="users" title="Tell your clan" detail="Let clan members see this ceremony on their Home" action={busy ? '…' : 'Share'} onClick={() => update({ visibility: 'CLAN_ONLY' }, 'Your clan can see this ceremony')} />
        )}
        <Line icon="send" title="Ukugida book" detail={gifts.length ? `${gifts.length} gift${gifts.length === 1 ? '' : 's'} recorded, ${received} received` : 'Record what guests bring, so you can return it'} action={gifts.length ? 'Open' : 'Start'} onClick={() => onNavigate?.('ukugida')} />
        <Line icon="image" title="Photos of the day" detail={albums.length ? `${photos} photo${photos === 1 ? '' : 's'} and videos kept` : 'Keep the photos and videos in the family archive'} action={albums.length ? 'Open' : 'Start'} onClick={() => onNavigate?.('portal')} />
      </div>
    </section>
  )
}
