import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

function Store({ onGoToBasket, basketCount }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [skus, setSkus] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)

  useEffect(() => {
    fetch('/api/basket/catalogue/categories')
      .then(res => res.json())
      .then(setCategories)
      .catch(() => showToast('Could not load categories', 'error'))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : ''
    fetch(`/api/basket/catalogue${params}`)
      .then(res => res.json())
      .then((data) => {
        setSkus(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        showToast('Could not load products', 'error')
      })
  }, [activeCategory])

  const addToBasket = async (sku) => {
    setAddingId(sku.id)
    try {
      const res = await fetch('/api/basket/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ skuId: sku.id, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not add item to basket')
      showToast(`${sku.name} added to basket`, 'success')
      if (navigator.vibrate) navigator.vibrate(10)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setTimeout(() => setAddingId(null), 500)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-xl border-b border-cream-dark px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl text-ink">Store</h1>
          <button
            onClick={onGoToBasket}
            className="relative w-11 h-11 rounded-2xl bg-white shadow-soft flex items-center justify-center text-xl active:scale-90 transition-transform"
          >
            🧺
            {basketCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-terracotta text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {basketCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory('')}
          className={`flex-shrink-0 px-4 py-2 rounded-pill text-xs font-bold transition-colors ${
            !activeCategory ? 'bg-sage-500 text-white' : 'bg-white border-2 border-cream-dark text-ink-muted'
          }`}
        >
          ALL
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-pill text-xs font-bold transition-colors ${
              activeCategory === cat ? 'bg-sage-500 text-white' : 'bg-white border-2 border-cream-dark text-ink-muted'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : skus.length === 0 ? (
          <EmptyState emoji="📦" title="No items found" description="Try selecting a different category." />
        ) : (
          <div className="space-y-3">
            {skus.map((sku) => (
              <div key={sku.id} className="bg-white border-2 border-ink rounded-soft p-3 flex justify-between items-center shadow-soft">
                <div className="flex items-center gap-3">
                  {sku.imageUrl && (
                    <img src={sku.imageUrl} alt={sku.name} className="w-12 h-12 rounded-soft object-cover flex-shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-ink">{sku.name}</h3>
                    <p className="text-xs text-ink-muted">
                      {sku.bottleFormat ? `${sku.bottleFormat} • ` : ''}{sku.unitsPerCase} per case
                    </p>
                    <p className="text-sm font-bold text-terracotta">
                      R{parseFloat(sku.casePriceZAR).toFixed(2)} / case
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => addToBasket(sku)}
                  disabled={addingId === sku.id}
                  className="bg-terracotta text-white text-xs font-bold px-4 py-2 rounded-pill active:scale-90 transition-transform disabled:opacity-50"
                >
                  {addingId === sku.id ? '✓' : 'Add case'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Store
