import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import Icon from '../components/Icon.jsx'

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
      if (!res.ok) throw new Error(data.error || 'Could not add item to cart')
      showToast(`${sku.name} added to cart`, 'success')
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
            aria-label="Cart"
            className="relative w-11 h-11 rounded-2xl bg-white shadow-soft flex items-center justify-center active:scale-90 transition-transform"
          >
            <Icon name="cart" size={20} color="#2b2620" />
            {basketCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-terracotta text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {basketCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Smart Match Explainer */}
      <div className="wash-ember grain card-paper mx-4 mt-4 p-4">
        <p className="eyebrow text-cream/75 mb-1">Smart Match — Bulk Buying</p>
        <p className="text-sm font-bold leading-snug text-cream">
          Add cases to your cart and iCamagu pools your order with other members — even from other stokvels — buying alcohol or livestock/meat from the same tavern or butchery. Once the group hits the minimum, everyone unlocks bulk pricing.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory('')}
          className={`flex-shrink-0 px-4 py-2 rounded-pill text-xs font-bold transition-colors ${
            !activeCategory ? 'bg-terracotta text-white' : 'bg-white border-2 border-terracotta/20 text-ink-muted'
          }`}
        >
          ALL
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-pill text-xs font-bold transition-colors ${
              activeCategory === cat ? 'bg-terracotta text-white' : 'bg-white border-2 border-terracotta/20 text-ink-muted'
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
              <div key={sku.id} className="card-paper flex justify-between items-center overflow-hidden">
                <div className="flex items-center gap-3 min-w-0">
                  {sku.imageUrl ? (
                    <img src={sku.imageUrl} alt={sku.name} className="w-16 h-16 object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-16 h-16 bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="cocktail" size={22} color="#c45c26" />
                    </span>
                  )}
                  <div className="min-w-0 py-1">
                    <h3 className="font-display font-bold text-sm text-ink truncate">{sku.name}</h3>
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
                  className="bg-terracotta text-white text-xs font-bold px-4 py-2 rounded-pill active:scale-90 transition-transform disabled:opacity-50 mr-3 flex-shrink-0"
                >
                  {addingId === sku.id ? <Icon name="check" size={13} color="#fff" strokeWidth={2.5} /> : 'Add case'}
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
