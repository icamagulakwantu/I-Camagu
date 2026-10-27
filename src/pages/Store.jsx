import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCommunity } from '../context/CommunityContext.jsx'
import PoolOfferCard from '../components/PoolOfferCard.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import Icon from '../components/Icon.jsx'
import { DEPARTMENTS, departmentOf, aisleOf } from '../data/storeTaxonomy.js'
import { unitOf, collectiveNoun } from '../data/bulkUnits.js'

function Store({ onGoToBasket, basketCount }) {
  const { accessToken } = useAuth()
  const { location, pools, loadingPools } = useCommunity()
  const { showToast } = useToast()
  const [allSkus, setAllSkus] = useState([])
  const [activeDept, setActiveDept] = useState(DEPARTMENTS[0].id)
  const [activeAisle, setActiveAisle] = useState('all')
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [offerSku, setOfferSku] = useState(null)
  const [failedImageIds, setFailedImageIds] = useState(() => new Set())

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
      return allSkus.filter((s) => [s.name, s.category, s.bottleFormat, s.bulkUnit, s.bulkUnitPlural].some((value) => String(value || '').toLowerCase().includes(q)))
    }
    return allSkus.filter((s) => {
      if (departmentOf(s).id !== activeDept) return false
      if (activeAisle !== 'all' && aisleOf(s).id !== activeAisle) return false
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
    <div className="min-h-screen pb-36 bg-cream">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-xl border-b border-cream-dark px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display font-bold text-2xl text-ink leading-tight">SmartMatch</h1>
            <p className="text-xs font-semibold text-ink-muted mt-0.5">{location.label ? 'Near ' + location.label : 'Bulk buying'}{!loadingPools && pools.length > 0 ? ' · ' + pools.length + ' active pool' + (pools.length === 1 ? '' : 's') : ''}</p>
          </div>
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

      {/* SmartMatch explainer */}
      <div className="wash-ember grain card-paper mx-4 mt-4 p-4">
        <p className="eyebrow text-cream/75 mb-1">How SmartMatch works</p>
        <p className="text-sm font-bold leading-snug text-cream">
          Add items to your cart and explore pools that bring community demand together by area and category. Alcohol, soft drinks, groceries, meat, livestock and household supplies are kept separate so you can find what you need. Supplier availability, final prices and any savings must be confirmed before an order is placed.
        </p>
      </div>

      {!isSearching && (
        <>
          <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-1">
            {DEPARTMENTS.map((d) => (
              <DeptTile key={d.id} label={d.short} xhosa={d.xhosa} active={activeDept === d.id} onClick={() => pickDept(d.id)} />
            ))}
          </div>

          {activeDepartment && (
            <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveAisle('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                  activeAisle === 'all' ? 'bg-terracotta text-white' : 'bg-white border border-ink/10 text-ink-muted'
                }`}
              >
                All {activeDepartment.short.toLowerCase()}
              </button>
              {activeDepartment.aisles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActiveAisle(a.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                    activeAisle === a.id ? 'bg-terracotta text-white' : 'bg-white border border-ink/10 text-ink-muted'
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

      {!isSearching && activeDepartment && (
        <div className="px-5 mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-terracotta/80">Shop by department</p>
              <h2 className="font-display text-xl font-bold text-ink">{activeDepartment.name}</h2>
              <p className="text-xs text-ink-muted mt-1">Choose a product, check its pack size, then add it to your basket.</p>
            </div>
            <span className="text-xs font-semibold text-ink-muted">{skus.length} item{skus.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}

      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : skus.length === 0 ? (
          <EmptyState emoji="📦" title="No items found" description={isSearching ? "Try another product name, size or category, or clear your search." : "Try another department or aisle."} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {skus.map((sku) => {
              const retail = sku.retailPriceZAR ? parseFloat(sku.retailPriceZAR) : null
              const casePrice = sku.casePriceZAR != null ? parseFloat(sku.casePriceZAR) : null
              const savings = retail && casePrice != null && retail > casePrice ? retail - casePrice : null
              const dept = departmentOf(sku)
              return (
                <div key={sku.id} className="card-paper flex flex-col min-w-0 overflow-hidden p-3">
                  <div className="flex flex-col min-w-0">
                    {sku.imageUrl && !failedImageIds.has(sku.id) ? (
                      <img src={sku.imageUrl} alt={`${sku.name}${sku.bottleFormat ? `, ${sku.bottleFormat}` : ''}`} className="w-full h-32 object-contain bg-white rounded-xl mb-3" loading="lazy" decoding="async" onError={() => setFailedImageIds((current) => new Set(current).add(sku.id))} />
                    ) : (
                      <span className="w-full h-32 bg-terracotta/10 rounded-xl mb-3 flex items-center justify-center">
                        <Icon name={dept.id === 'alcohol' ? 'cocktail' : 'package'} size={28} color="#c45c26" />
                      </span>
                    )}
                    <div className="min-w-0 py-1">
                      <p className="eyebrow text-terracotta/70">{dept.short}</p>
                      <h3 className="font-display font-bold text-sm text-ink leading-snug min-h-[2.5rem]">{sku.name}</h3>
                      <p className="text-[11px] text-ink-muted min-h-8 mt-1">
                        {sku.bottleFormat ? `${sku.bottleFormat} • ` : ''}
                        {sku.unitsPerCase > 1 ? `${sku.unitsPerCase} per ${unitOf(sku)}` : `per ${unitOf(sku)}`}
                      </p>
                      <p className="text-sm font-bold text-terracotta">
                        {casePrice != null ? `R${casePrice.toFixed(2)} / ${unitOf(sku)}` : 'Price coming soon'}
                      </p>
                      {savings !== null && (
                        <p className="text-[11px] font-bold text-sage-700">
                          Save R{savings.toFixed(2)} vs retail
                        </p>
                      )}
                      {collectiveNoun(sku) && (
                        <p className="text-[11px] text-ink-muted">
                          Bought per head — pooled together they make a {collectiveNoun(sku)}
                        </p>
                      )}
                    </div>
                  </div>
                  {casePrice != null ? (
                    <div className="flex flex-col gap-2 mt-3">
                      <button
                        onClick={() => addToBasket(sku)}
                        disabled={addingId === sku.id}
                        className="w-full bg-terracotta text-white text-xs font-bold px-3 py-2.5 rounded-pill active:scale-90 transition-transform disabled:opacity-50"
                      >
                        {addingId === sku.id ? <Icon name="check" size={13} color="#fff" strokeWidth={2.5} /> : `Add ${unitOf(sku)}`}
                      </button>
                      <button type="button" onClick={() => setOfferSku(sku)} className="w-full border border-terracotta text-terracotta text-xs font-bold px-3 py-2 rounded-pill">
                        Pool offers
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-ink-muted/60 font-bold px-3 mt-3 text-center">
                      Not yet<br />orderable
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {offerSku && <PoolOfferCard cost={{ id: null, skuId: offerSku.id, label: offerSku.name, quantity: 1, unitCost: offerSku.casePriceZAR }} onClose={() => setOfferSku(null)} />}
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
