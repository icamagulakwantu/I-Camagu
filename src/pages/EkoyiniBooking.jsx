import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'
const BOOKING_STATUS_COLOR = { REQUESTED: 'bg-cream-dark text-ink-muted', CONFIRMED: 'bg-sage-500 text-white', COMPLETED: 'bg-sage-100 text-sage-700', CANCELLED: 'bg-terracotta/20 text-terracotta' }

function EkoyiniBooking({ ceremonyId, ceremonyTitle, onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(null)
  const [tourism, setTourism] = useState(null)
  const [requesting, setRequesting] = useState(false)

  const [colorLabel, setColorLabel] = useState('')
  const [entitlement, setEntitlement] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [addingTier, setAddingTier] = useState(false)

  const [pricePerHead, setPricePerHead] = useState('')
  const [hostShare, setHostShare] = useState('')
  const [maxGroupSize, setMaxGroupSize] = useState('')
  const [savingTourism, setSavingTourism] = useState(false)

  const [tourismBookings, setTourismBookings] = useState([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [bookingGroupSize, setBookingGroupSize] = useState('')
  const [totalPaid, setTotalPaid] = useState('')
  const [loggingBooking, setLoggingBooking] = useState(false)

  const authedFetch = useCallback((url, options = {}) => fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bookingRes, tourismRes] = await Promise.all([
        authedFetch(`/api/ekoyini/bar-bookings/${ceremonyId}`),
        authedFetch(`/api/ekoyini/tourism/${ceremonyId}`),
      ])
      const bookingData = await bookingRes.json()
      const tourismData = await tourismRes.json()
      if (!bookingRes.ok) throw new Error(bookingData.error || 'Could not load booking')
      if (!tourismRes.ok) throw new Error(tourismData.error || 'Could not load tourism package')
      setBooking(bookingData)
      setTourism(tourismData)
      if (tourismData) {
        setPricePerHead(String(tourismData.pricePerHeadZAR))
        setHostShare(String(tourismData.hostShareZAR))
        setMaxGroupSize(tourismData.maxGroupSize ? String(tourismData.maxGroupSize) : '')

        const bookingsRes = await authedFetch(`/api/ekoyini/tourism/${tourismData.id}/bookings`)
        const bookingsData = await bookingsRes.json()
        if (bookingsRes.ok) setTourismBookings(Array.isArray(bookingsData) ? bookingsData : [])
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [authedFetch, ceremonyId, showToast])

  useEffect(() => { load() }, [load])

  const requestBooking = async () => {
    setRequesting(true)
    try {
      const res = await authedFetch('/api/ekoyini/bar-bookings', {
        method: 'POST',
        body: JSON.stringify({ ceremonyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not request booking')
      showToast('Bar service requested — Ekoyini will be in touch', 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setRequesting(false)
    }
  }

  const addTier = async (e) => {
    e.preventDefault()
    setAddingTier(true)
    try {
      const res = await authedFetch('/api/ekoyini/bar-bookings/wristbands', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id, colorLabel, entitlement, guestCount: guestCount || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not add tier')
      setColorLabel(''); setEntitlement(''); setGuestCount('')
      showToast('Wristband tier added', 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAddingTier(false)
    }
  }

  const removeTier = async (tierId) => {
    try {
      const res = await authedFetch(`/api/ekoyini/bar-bookings/wristbands/${tierId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not remove tier')
      showToast('Tier removed', 'info')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const saveTourism = async (e) => {
    e.preventDefault()
    setSavingTourism(true)
    try {
      const res = await authedFetch('/api/ekoyini/tourism', {
        method: 'POST',
        body: JSON.stringify({ ceremonyId, pricePerHeadZAR: pricePerHead, hostShareZAR: hostShare, maxGroupSize: maxGroupSize || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save package')
      setTourism(data)
      showToast('Tourism package saved', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingTourism(false)
    }
  }

  const toggleTourism = async () => {
    try {
      const res = await authedFetch('/api/ekoyini/tourism/toggle', {
        method: 'PATCH',
        body: JSON.stringify({ ceremonyId, isEnabled: !tourism.isEnabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update package')
      setTourism(data)
      showToast(data.isEnabled ? 'Tourism package enabled' : 'Tourism package disabled', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const logBooking = async (e) => {
    e.preventDefault()
    setLoggingBooking(true)
    try {
      const res = await authedFetch('/api/ekoyini/tourism/bookings', {
        method: 'POST',
        body: JSON.stringify({
          tourismPackageId: tourism.id,
          tourismCompanyName: companyName,
          groupSize: bookingGroupSize,
          totalPaidZAR: totalPaid,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not log booking')
      setCompanyName(''); setBookingGroupSize(''); setTotalPaid(''); setShowBookingForm(false)
      showToast('Booking logged', 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoggingBooking(false)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-ink to-ink/80 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Ekoyini Mobile Bar</h1>
        <p className="text-white/70 text-sm mt-1">{ceremonyTitle}</p>
      </div>

      {loading ? (
        <div className="px-4 mt-4 space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : (
        <div className="px-4 mt-4 space-y-4">
          {/* Bar booking */}
          <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
            <p className="text-xs font-black uppercase text-ink-muted mb-2">Bar Service</p>
            {!booking ? (
              <div>
                <p className="text-xs text-ink-muted mb-3">Book Ekoyini Mobile Bar for this ceremony — we handle the bar, you enjoy the moment.</p>
                <button
                  onClick={requestBooking} disabled={requesting}
                  className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm flex items-center justify-center gap-1.5 ${pressable}`}
                >
                  {requesting ? 'Requesting...' : <><Icon name="cocktail" size={14} color="#fff" /> Request Bar Service</>}
                </button>
              </div>
            ) : (
              <div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-pill ${BOOKING_STATUS_COLOR[booking.status] || 'bg-cream-dark text-ink-muted'}`}>
                  {booking.status}
                </span>

                <div className="mt-4">
                  <p className="text-xs font-bold text-ink mb-2">Wristband tiers</p>
                  {(booking.wristbandTiers || []).length === 0 ? (
                    <p className="text-xs text-ink-muted mb-3">No tiers set yet.</p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {booking.wristbandTiers.map((t) => (
                        <div key={t.id} className="flex items-center justify-between bg-cream rounded-soft p-2.5">
                          <div>
                            <p className="text-sm font-bold text-ink">{t.colorLabel}</p>
                            <p className="text-[11px] text-ink-muted">{t.entitlement}{t.guestCount ? ` · ${t.guestCount} guests` : ''}</p>
                          </div>
                          <button onClick={() => removeTier(t.id)} className="text-[11px] text-terracotta font-bold underline">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={addTier} className="space-y-2">
                    <input
                      type="text" placeholder="Wristband colour (e.g. Red)" value={colorLabel}
                      onChange={(e) => setColorLabel(e.target.value)}
                      className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required
                    />
                    <input
                      type="text" placeholder="Entitlement (e.g. 2 drinks)" value={entitlement}
                      onChange={(e) => setEntitlement(e.target.value)}
                      className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required
                    />
                    <input
                      type="number" placeholder="Guest count (optional)" value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm"
                    />
                    <button
                      type="submit" disabled={addingTier}
                      className={`w-full border-2 border-terracotta/25 text-ink font-bold py-2 rounded-pill text-sm ${pressable}`}
                    >
                      {addingTier ? 'Adding...' : '+ Add Tier'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Tourism package */}
          <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase text-ink-muted">Cultural Tourism Add-on</p>
              {tourism && (
                <button
                  onClick={toggleTourism}
                  className={`text-[11px] font-bold px-3 py-1 rounded-pill ${tourism.isEnabled ? 'bg-sage-500 text-white' : 'border-2 border-terracotta/20 text-ink-muted'} ${pressable}`}
                >
                  {tourism.isEnabled ? 'Enabled' : 'Disabled'}
                </button>
              )}
            </div>
            <p className="text-xs text-ink-muted mb-3">Open your ceremony to visitors for a per-head fee. Your share is capped at 30% of that fee.</p>
            <form onSubmit={saveTourism} className="space-y-2">
              <input
                type="number" placeholder="Price per head (ZAR)" value={pricePerHead}
                onChange={(e) => setPricePerHead(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required
              />
              <input
                type="number" placeholder="Your share (ZAR, max 30% of price)" value={hostShare}
                onChange={(e) => setHostShare(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required
              />
              <input
                type="number" placeholder="Max group size (optional)" value={maxGroupSize}
                onChange={(e) => setMaxGroupSize(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm"
              />
              <button
                type="submit" disabled={savingTourism}
                className={`w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}
              >
                {savingTourism ? 'Saving...' : tourism ? 'Update Package' : 'Create Package'}
              </button>
            </form>

            {tourism && (
              <div className="mt-4 pt-4 border-t border-terracotta/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-ink">Bookings log</p>
                  <button
                    type="button" onClick={() => setShowBookingForm(!showBookingForm)}
                    className={`text-[11px] font-bold text-sage-600 ${pressable}`}
                  >
                    {showBookingForm ? 'Cancel' : '+ Log a booking'}
                  </button>
                </div>

                {showBookingForm && (
                  <form onSubmit={logBooking} className="space-y-2 mb-3">
                    <input
                      type="text" placeholder="Tour company / group name" value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required
                    />
                    <div className="flex gap-2">
                      <input
                        type="number" placeholder="Group size" value={bookingGroupSize}
                        onChange={(e) => setBookingGroupSize(e.target.value)}
                        className="flex-1 border border-ink/30 rounded-soft px-3 py-2 text-sm" required
                      />
                      <input
                        type="number" placeholder="Total paid (ZAR)" value={totalPaid}
                        onChange={(e) => setTotalPaid(e.target.value)}
                        className="flex-1 border border-ink/30 rounded-soft px-3 py-2 text-sm" required
                      />
                    </div>
                    <button
                      type="submit" disabled={loggingBooking}
                      className={`w-full border-2 border-terracotta/25 text-ink font-bold py-2 rounded-pill text-sm ${pressable}`}
                    >
                      {loggingBooking ? 'Saving...' : 'Log Booking'}
                    </button>
                  </form>
                )}

                {tourismBookings.length === 0 ? (
                  <p className="text-xs text-ink-muted">No bookings logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {tourismBookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-cream rounded-soft p-2.5">
                        <div>
                          <p className="text-xs font-bold text-ink">{b.tourismCompanyName}</p>
                          <p className="text-[10px] text-ink-muted">{b.groupSize} people · R{parseFloat(b.totalPaidZAR).toFixed(0)}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-pill ${BOOKING_STATUS_COLOR[b.status] || 'bg-cream-dark text-ink-muted'}`}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EkoyiniBooking
