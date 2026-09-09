import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import Icon from '../components/Icon.jsx'
import { DEPARTMENTS, departmentOf, aisleOf } from '../data/storeTaxonomy.js'
import { unitOf } from '../data/bulkUnits.js'

function Store({ onGoToBasket, basketCount }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [allSkus, setAllSkus] = useState([])
  const [activeDept, setActiveDept] = useState('all')
  const [activeAisle, setActiveAisle] = useState('all')
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    fetch('/api/basket/catalogue')
      .then(res => res.json())
      .then((data) => {
        setAllSkus(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        showToast('Could not load products', 'error')
      })
  }, [])

  const pickDept = (id) => {
    setActiveDept(id)
    setActiveAisle('all')
  }

  const activeDepartment = DEPARTMENTS.find((d) => d.id === activeDept)
  const isSearching = searchQuery.trim().length > 0

  const skus = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.trim().toLowerCase()
      return allSkus.filter((s) => s.name.toLowerCase().includes(q))
    }
    return allSkus.filter((s) => {
      if (activeDept !== 'all' && departmentOf(s).id !== activeDept) return false
      if (activeDept !== 'all' && activeAisle !== 'all' && aisleOf(s).id !== activeAisle) return false
      return true
    })
  }, [allSkus, activeDept, activeAisle, isSearching, searchQuery])

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
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display font-bold text-2xl text-ink">Store</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearchOpen((v) => !v)
                if (searchOpen) setSearchQuery('')
              }}
              aria-label="Search"
              className={`w-11 h-11 rounded-2xl shadow-soft flex items-center justify-center active:scale-90 transition-transform ${searchOpen ? 'bg-terracotta' : 'bg-white'}`}
            >
              <Icon name="search" size={19} color={searchOpen ? '#fff' : '#2b2620'} />
            </button>
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
        {searchOpen && (
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all items — e.g. Commando, Maize Meal..."
            className="w-full mt-3 h-11 border-2 border-cream-dark rounded-pill px-4 text-sm bg-white focus:outline-none focus:border-terracotta"
          />
        )}
      </div>

      {/* Smart Match Explainer */}
      <div className="wash-ember grain card-paper mx-4 mt-4 p-4">
        <p className="eyebrow text-cream/75 mb-1">Smart Match — Bulk Buying</p>
        <p className="text-sm font-bold leading-snug text-cream">
          Add cases to your cart and iCamagu pools your order with other members — even from other stokvels — buying meat, livestock, alcohol, drinks or dry goods from the same supplier. Once the group hits the minimum, everyone unlocks bulk pricing.
        </p>
      </div>

      {!isSearching && (
        <>
          {/* Level 1 — departments, in order: Drinks, Meat/Livestock, Staples/Dry Goods, Vegetables */}
          <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-1">
            <DeptTile label="All" xhosa="Konke" active={activeDept === 'all'} onClick={() => pickDept('all')} />
            {DEPARTMENTS.map((d) => (
              <DeptTile key={d.id} label={d.short} xhosa={d.xhosa} active={activeDept === d.id} onClick={() => pickDept(d.id)} />
            ))}
          </div>

          {/* Level 2 — aisles, scoped to the selected department only */}
          {activeDepartment && (
            <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveAisle('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                  activeAisle === 'all' ? 'bg-ink text-white' : 'bg-white border border-ink/10 text-ink-muted'
                }`}
              >
                All {activeDepartment.short.toLowerCase()}
              </button>
              {activeDepartment.aisles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActiveAisle(a.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                    activeAisle === a.id ? 'bg-ink text-white' : 'bg-white border border-ink/10 text-ink-muted'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {isSearching && (
        <p className="px-5 mt-4 text-xs text-ink-muted">
          {skus.length} result{skus.length === 1 ? '' : 's'} for "{searchQuery.trim()}"
        </p>
      )}

      {/* Product List */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : skus.length === 0 ? (
          <EmptyState emoji="📦" title="No items found" description="Try selecting a different department." />
        ) : (
          <div className="space-y-3">
            {skus.map((sku) => {
              const retail = sku.retailPriceZAR ? parseFloat(sku.retailPriceZAR) : null
              const casePrice = parseFloat(sku.casePriceZAR)
              const savings = retail && retail > casePrice ? retail - casePrice : null
              const dept = departmentOf(sku)
              return (
                <div key={sku.id} className="card-paper flex justify-between items-center overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0">
                    {sku.imageUrl ? (
                      <img src={sku.imageUrl} alt={sku.name} className="w-16 h-16 object-cover flex-shrink-0" />
                    ) : (
                      <span className="w-16 h-16 bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                        <Icon name={dept.id === 'meat' ? 'users' : dept.id === 'beverages' ? 'cocktail' : 'package'} size={22} color="#c45c26" />
                      </span>
                    )}
                    <div className="min-w-0 py-1">
                      <p className="eyebrow text-terracotta/70">{dept.short}</p>
                      <h3 className="font-display font-bold text-sm text-ink truncate">{sku.name}</h3>
                      <p className="text-xs text-ink-muted">
                        {sku.bottleFormat ? `${sku.bottleFormat} • ` : ''}
                        {sku.unitsPerCase > 1 ? `${sku.unitsPerCase} per ${unitOf(sku)}` : `per ${unitOf(sku)}`}
                      </p>
                      <p className="text-sm font-bold text-terracotta">
                        R{casePrice.toFixed(2)} / {unitOf(sku)}
                      </p>
                      {savings !== null && (
                        <p className="text-[11px] font-bold text-sage-700">
                          Save R{savings.toFixed(2)} vs retail
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => addToBasket(sku)}
                    disabled={addingId === sku.id}
                    className="bg-terracotta text-white text-xs font-bold px-4 py-2 rounded-pill active:scale-90 transition-transform disabled:opacity-50 mr-3 flex-shrink-0"
                  >
                    {addingId === sku.id ? <Icon name="check" size={13} color="#fff" strokeWidth={2.5} /> : `Add ${unitOf(sku)}`}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function DeptTile({ label, xhosa, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-shrink-0 w-24 min-h-16 flex flex-col items-start justify-center rounded-2xl px-3 py-2 text-left transition-colors active:scale-[0.97] ${
        active ? 'bg-terracotta' : 'bg-white border border-cream-dark'
      }`}
    >
      <span className={`text-[13px] font-bold leading-tight ${active ? 'text-white' : 'text-ink'}`}>{label}</span>
      <span className={`text-[10px] ${active ? 'text-white/70' : 'text-ink-muted'}`}>{xhosa}</span>
    </button>
  )
}

export default Store
