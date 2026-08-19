import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const DEFAULT_IMAGES = {
  glassware: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=80',
  beverage: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=400&q=80',
  catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=400&q=80',
  default: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
}

function getItemImage(item) {
  if (item?.sku?.imageUrl && item.sku.imageUrl.startsWith('http')) {
    return item.sku.imageUrl
  }
  const name = (item?.sku?.name || '').toLowerCase()
  if (name.includes('glass') || name.includes('jar') || name.includes('bottle')) return DEFAULT_IMAGES.glassware
  if (name.includes('drink') || name.includes('beverage') || name.includes('cider') || name.includes('beer')) return DEFAULT_IMAGES.beverage
  if (name.includes('food') || name.includes('meat') || name.includes('bulk')) return DEFAULT_IMAGES.catering
  return DEFAULT_IMAGES.default
}

export default function Basket({ onBack, onBasketChanged }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  
  const [basketData, setBasketData] = useState({ basket: null, items: [], totalCases: 0, totalZAR: 0 })
  const [loading, setLoading] = useState(true)
  const [partners, setPartners] = useState([])
  const [selectedPartner, setSelectedPartner] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchBasket = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/basket', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      
      const formattedData = {
        basket: data.basket || data,
        items: data.items || [],
        totalCases: data.totalCases || 0,
        totalZAR: data.totalZAR || 0,
      }
      
      setBasketData(formattedData)
      if (onBasketChanged) onBasketChanged(formattedData.totalCases)
    } catch {
      showToast('Could not load basket', 'error')
    } finally {
      setLoading(false)
    }
  }, [accessToken, onBasketChanged, showToast])

  useEffect(() => {
    fetchBasket()
    fetch('/api/basket/partners', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPartners(Array.isArray(data) ? data : []))
      .catch(() => setPartners([]))
  }, [accessToken, fetchBasket])

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return removeItem(itemId)
    try {
      const res = await fetch(`/api/basket/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ quantity: newQuantity }),
      })
      if (!res.ok) throw new Error()
      fetchBasket()
    } catch {
      showToast('Could not update quantity', 'error')
    }
  }

  const removeItem = async (itemId) => {
    try {
      await fetch(`/api/basket/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      showToast('Item removed from basket', 'info')
      fetchBasket()
    } catch {
      showToast('Could not remove item', 'error')
    }
  }

  const submitToPool = async () => {
    if (!selectedPartner) return showToast('Choose a partner tavern/butchery first', 'error')
    try {
      const res = await fetch('/api/basket/submit-to-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ basketId: basketData.basket?.id, partnerId: selectedPartner }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit basket.')
      showToast(data.message || 'Basket submitted successfully!', 'success')
      fetchBasket()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const shareBasket = () => {
    if (!basketData.items || basketData.items.length === 0) return
    const text = basketData.items
      .map((i) => `${i.sku?.name || 'Item'} x${i.quantity} case(s)`)
      .join('\n')
    const summary = `My Wholesale Basket:\n\n${text}\n\nTotal Cases: ${basketData.totalCases}\nTotal: R${basketData.totalZAR.toFixed(2)}`

    if (navigator.share) {
      navigator.share({ title: 'My Wholesale Basket', text: summary }).catch(() => {})
    } else {
      navigator.clipboard.writeText(summary)
      setCopied(true)
      showToast('Basket copied to clipboard', 'info')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-24 bg-cream px-4 pt-6 space-y-3 max-w-md mx-auto">
        <Skeleton className="h-20 w-full rounded-soft" />
        <Skeleton className="h-20 w-full rounded-soft" />
        <Skeleton className="h-20 w-full rounded-soft" />
      </div>
    )
  }

  const itemsList = basketData.items || []

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-sage-600 hover:text-sage-700 uppercase tracking-wider flex items-center gap-1"
        >
          ← Back to Store
        </button>
        {itemsList.length > 0 && (
          <button
            type="button"
            onClick={shareBasket}
            className="bg-terracotta text-cream text-xs font-black px-3 py-1.5 rounded-pill shadow-soft active:scale-95 transition-transform"
          >
            {copied ? 'Copied!' : 'Share Basket 🔗'}
          </button>
        )}
      </div>

      <h2 className="font-display font-bold text-2xl text-ink mb-4">My Basket 🧺</h2>

      {itemsList.length === 0 ? (
        <EmptyState 
          emoji="🧺" 
          title="Your basket is empty" 
          description="Browse the Store to add cases toward a collective order." 
          primaryLabel="Go to Store" 
          onPrimary={onBack} 
        />
      ) : (
        <>
          {/* Basket Items List */}
          <div className="space-y-3 mb-4">
            {itemsList.map((item) => {
              const imgSrc = getItemImage(item)
              return (
                <div
                  key={item.id}
                  className="bg-white border-2 border-cream-dark rounded-soft p-3 flex items-center gap-3 shadow-soft"
                >
                  <img
                    src={imgSrc}
                    alt={item.sku?.name || 'Item'}
                    className="w-14 h-14 object-cover rounded-soft border border-cream-dark shrink-0"
                    onError={(e) => {
                      e.target.src = DEFAULT_IMAGES.default
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-ink truncate">{item.sku?.name || 'Item'}</h3>
                    <p className="text-xs text-ink-muted">{item.sku?.bottleFormat || 'Standard Wholesale'}</p>
                    <p className="text-sm font-bold text-sage-600">
                      R{parseFloat(item.sku?.casePriceZAR || 0).toFixed(2)} / case
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-pill bg-cream-dark text-ink font-bold active:scale-90 transition-transform"
                    >
                      −
                    </button>
                    <span className="font-bold text-sm w-5 text-center text-ink">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-pill bg-sage-500 text-white font-bold active:scale-90 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totals Summary */}
          <div className="bg-sage-50 border-2 border-sage-500 rounded-soft p-4 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink-light">Total cases</span>
              <span className="font-bold text-ink">{basketData.totalCases}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-ink-light">Total Value</span>
              <span className="font-display font-extrabold text-lg text-sage-700">
                R{basketData.totalZAR.toFixed(2)}
              </span>
            </div>
          </div>

          <button
  onClick={() => {
    const summary = `My iCamagu basket:\n\n` +
      basketData.items.map(i => `${i.quantity} case(s) — ${i.sku.name}`).join('\n') +
      `\n\nTotal: R${basketData.totalZAR.toFixed(2)}\nShared from iCamagu 🌾`
    if (navigator.share) {
      navigator.share({ title: 'My iCamagu Basket', text: summary }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(summary)
      showToast('Basket copied — paste it into WhatsApp', 'success')
    }
  }}
  className="w-full border-2 border-ink text-ink font-bold py-2.5 rounded-pill text-sm mb-3"
>
  📤 Share Basket
</button>

          {/* Partner Bulk Pool Section */}
          <div className="bg-white border border-cream-dark rounded-soft p-4 shadow-soft">
            <p className="text-xs font-black uppercase text-ink-muted mb-2">Join a Bulk Order</p>
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="w-full border border-cream-dark rounded-soft px-3 py-2.5 mb-3 bg-cream text-xs font-bold text-ink"
            >
              <option value="">Choose a partner tavern/butchery</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.area})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={submitToPool}
              className="w-full bg-sage-500 hover:bg-sage-600 text-white font-bold py-3 rounded-pill shadow-glow active:scale-[0.96] transition-transform text-sm"
            >
              Submit Basket to Bulk Pool
            </button>
          </div>
        </>
      )}
    </div>
  )
}
