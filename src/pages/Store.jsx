import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCommunity } from '../context/CommunityContext.jsx'
import PoolOfferCard from '../components/PoolOfferCard.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import Icon from '../components/Icon.jsx'
import { DEPARTMENTS, departmentOf, aisleOf, sectionOf } from '../data/storeTaxonomy.js'
import { unitOf, collectiveNoun } from '../data/bulkUnits.js'
import { notifyBasketChanged } from '../lib/basketEvents.js'

// Layout idea, shared with Home and the ceremony page: a compact dark header,
// the department rail rising out of it, and product cards whose price tab and
// add button break out of the photo.

// Department tiles whose picture is a full photograph rather than a
// product on a white background. Packshots (bottles, the chicken, the
// sheep) sit on white and are shown whole, never cropped.
const PHOTO_TILES = new Set(['nonconsumables'])

const DEPARTMENT_ICON = {
  alcohol: 'beer',
  softdrinks: 'bottle',
  meat: 'drumstick',
  livestock: 'livestock',
  groceries: 'wheat',
  nonconsumables: 'package',
  other: 'store',
}

// Livestock, meat and fresh produce come as photographs, which look best
// filling their tile. Everything else is a packshot on a white background,
// shown whole on a warm tile with the white blended away.
const PHOTO_DEPARTMENTS = new Set(['livestock', 'meat'])
const isPhotograph = (sku) => PHOTO_DEPARTMENTS.has(departmentOf(sku).id) || aisleOf(sku).id === 'produce'

// Placeholder colours per department, for products still waiting for a photo.
const PLACEHOLDER_TONE = {
  alcohol: 'from-[#f3e6cf] to-[#ead6b3] text-[#a3471a]',
  softdrinks: 'from-[#e4ecdf] to-[#cfdec7] text-sage-700',
  meat: 'from-[#f6e2d6] to-[#eccab6] text-terracotta-dark',
  livestock: 'from-[#efe4d2] to-[#e2d0b4] text-[#a3471a]',
  groceries: 'from-[#f1ead9] to-[#e5d9bf] text-[#a3471a]',
  nonconsumables: 'from-[#ebe5dc] to-[#dcd3c6] text-ink',
  other: 'from-[#ebe5dc] to-[#dcd3c6] text-ink',
}

// How bulk buying works, in three short steps.
const HOW_IT_WORKS = [
  { n: 1, title: 'Add items', desc: 'Drinks, meat, groceries or livestock' },
  { n: 2, title: 'Join a group', desc: 'Pooled with orders near you' },
  { n: 3, title: 'Pay less', desc: 'Bulk price, confirmed by the supplier' },
]

// Product prices keep their cents, written the South African way: R2 700,00.
const price = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function ProductCard({ sku, showDepartment, adding, imageFailed, onImageError, onAdd, onOffers }) {
  const retail = sku.retailPriceZAR ? parseFloat(sku.retailPriceZAR) : null
  const casePrice = sku.casePriceZAR != null ? parseFloat(sku.casePriceZAR) : null
  const savings = retail && casePrice != null && retail > casePrice ? retail - casePrice : null
  const dept = departmentOf(sku)
  const unit = unitOf(sku)
  const flock = collectiveNoun(sku)
  const photo = isPhotograph(sku)
  const pack = [sku.bottleFormat, sku.unitsPerCase > 1 ? `${sku.unitsPerCase} per ${unit}` : `per ${unit}`].filter(Boolean).join(' · ')

  return (
    <li className="flex min-w-0 flex-col">
      {/* Photo, with the price tab and the add button breaking out of it */}
      <div className="relative">
        <div className="h-[148px] overflow-hidden rounded-[20px] bg-[#f6f1e7] shadow-[0_14px_28px_-22px_rgba(43,30,18,0.55)]">
          {sku.imageUrl && !imageFailed ? (
            <img
              src={sku.imageUrl}
              alt={`${sku.name}${sku.bottleFormat ? `, ${sku.bottleFormat}` : ''}`}
              className={photo ? 'h-full w-full object-cover' : 'h-full w-full object-contain px-6 pb-5 pt-3 mix-blend-multiply'}
              loading="lazy"
              decoding="async"
              onError={onImageError}
            />
          ) : (
            <span className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${PLACEHOLDER_TONE[dept.id] || PLACEHOLDER_TONE.other}`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/60">
                <Icon name={DEPARTMENT_ICON[dept.id] || 'package'} size={26} />
              </span>
              <span className="text-xs font-bold opacity-80">Photo coming soon</span>
            </span>
          )}
        </div>
        {savings !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-sage-600 px-2 py-0.5 text-xs font-extrabold text-white">Save {price(savings)}</span>
        )}
        {/* Price only: the unit ("per case") is in the line under the name. */}
        <span className="absolute -bottom-3 left-2 max-w-[calc(100%-4.5rem)] truncate rounded-[12px] bg-[#1f3320] px-2.5 py-1 text-[13px] font-extrabold tabular-nums text-cream shadow-[0_8px_16px_-8px_rgba(0,0,0,0.6)]">
          {casePrice != null ? price(casePrice) : 'Price soon'}
        </span>
        {casePrice != null && (
          <button
            type="button"
            onClick={onAdd}
            disabled={adding}
            aria-label={`Add 1 ${unit} of ${sku.name} to your basket`}
            className="pressable absolute -bottom-4 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-terracotta-dark text-white shadow-[0_10px_20px_-8px_rgba(163,71,26,0.9)] ring-4 ring-cream disabled:opacity-60"
          >
            <Icon name={adding ? 'check' : 'plus'} size={18} strokeWidth={2.4} />
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-1 pt-5">
        {showDepartment && <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-terracotta-dark">{dept.short}</p>}
        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug text-ink">{sku.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-muted">{pack}</p>
        {savings !== null && retail && <p className="mt-0.5 text-xs tabular-nums text-ink-muted line-through">{price(retail)} retail</p>}
        {flock && <p className="mt-0.5 text-xs text-ink-muted">Pooled into a {flock}</p>}
        {casePrice != null && (
          <button type="button" onClick={onOffers} className="pressable mt-1.5 self-start py-1 text-xs font-extrabold text-terracotta-dark">
            Group prices →
          </button>
        )}
      </div>
    </li>
  )
}

function Store({ onGoToBasket, basketCount }) {
  const { accessToken } = useAuth()
  const { location, feed } = useCommunity()
  const { showToast } = useToast()
  const [allSkus, setAllSkus] = useState([])
  const [activeDept, setActiveDept] = useState(DEPARTMENTS[0].id)
  const [activeAisle, setActiveAisle] = useState('all')
  const [activeSection, setActiveSection] = useState('all')
  const [loading, setLoading] = useState(true)
  const [catalogueError, setCatalogueError] = useState(false)
  const [catalogueRetry, setCatalogueRetry] = useState(0)
  const [addingId, setAddingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [offerSku, setOfferSku] = useState(null)
  const [failedImageIds, setFailedImageIds] = useState(() => new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setCatalogueError(false)

    fetch('/api/basket/catalogue')
      .then((res) => {
        if (!res.ok) throw new Error('Catalogue request failed')
        return res.json()
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Catalogue response was invalid')
        if (!cancelled) setAllSkus(data)
      })
      .catch(() => {
        if (cancelled) return
        setAllSkus([])
        setCatalogueError(true)
        showToast('Could not load products', 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [catalogueRetry])

  const pickDept = (id) => {
    setActiveDept(id)
    setActiveAisle('all')
    setActiveSection('all')
  }
  const pickAisle = (id) => {
    setActiveAisle(id)
    setActiveSection('all')
  }

  const activeDepartment = DEPARTMENTS.find((d) => d.id === activeDept)
  const isSearching = searchQuery.trim().length > 0
  const nearbyPools = feed.pools || []

  // How many products each department has, for the rail.
  const deptCounts = useMemo(() => {
    const counts = {}
    for (const sku of allSkus) {
      const id = departmentOf(sku).id
      counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }, [allSkus])

  const skus = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.trim().toLowerCase()
      return allSkus.filter((s) => [s.name, s.category, s.bottleFormat, s.bulkUnit, s.bulkUnitPlural].some((value) => String(value || '').toLowerCase().includes(q)))
    }
    return allSkus.filter((s) => {
      if (departmentOf(s).id !== activeDept) return false
      if (activeAisle !== 'all' && aisleOf(s).id !== activeAisle) return false
      if (activeSection !== 'all' && sectionOf(s)?.id !== activeSection) return false
      return true
    })
  }, [allSkus, activeDept, activeAisle, activeSection, isSearching, searchQuery])

  // Products in shelf order (aisle, then type, then name and pack), grouped
  // under a heading per shelf, e.g. Beer, Ciders & coolers, Whisky, Gin.
  const groups = useMemo(() => {
    if (isSearching) return [{ key: 'search', label: null, items: skus }]
    const map = new Map()
    for (const sku of skus) {
      const dept = departmentOf(sku)
      const aisle = aisleOf(sku)
      const section = sectionOf(sku)
      const aisleIndex = dept.aisles.indexOf(aisle)
      const sectionIndex = section ? aisle.sections.indexOf(section) : 0
      const key = `${String(aisleIndex).padStart(2, '0')}-${String(sectionIndex).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, { key, label: section?.name || aisle.name, items: [] })
      map.get(key).items.push(sku)
    }
    const sorted = [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
    for (const group of sorted) {
      group.items.sort((a, b) => a.name.localeCompare(b.name) || String(a.bottleFormat || '').localeCompare(String(b.bottleFormat || '')))
    }
    // One heading is noise: only label groups when there is more than one.
    if (sorted.length === 1) sorted[0].label = null
    return sorted
  }, [skus, isSearching])

  // Aisles and shelves that actually have products, so no chip leads nowhere.
  const deptSkus = useMemo(() => allSkus.filter((s) => departmentOf(s).id === activeDept), [allSkus, activeDept])
  const liveAisles = activeDepartment ? activeDepartment.aisles.filter((a) => deptSkus.some((s) => aisleOf(s).id === a.id)) : []
  const currentAisle = activeDepartment?.aisles.find((a) => a.id === activeAisle)
  const liveSections = currentAisle?.sections ? currentAisle.sections.filter((sec) => deptSkus.some((s) => sectionOf(s)?.id === sec.id)) : []

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
      if (!res.ok) throw new Error(data.error || 'Could not add item to your basket')
      // Tell the app shell so the basket badges update straight away.
      notifyBasketChanged()
      showToast(`${sku.name} added to your basket`, 'success')
      if (navigator.vibrate) navigator.vibrate(10)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setTimeout(() => setAddingId(null), 500)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-48">
      {/* ---------- Header with search ---------- */}
      <header className="relative overflow-hidden rounded-b-[32px] bg-[#1f3320] px-5 pb-[84px] pt-6 text-cream">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-ochre-light">
              Thengani kunye{location.label ? ` · Near ${location.label}` : ''}
            </p>
            <h1 className="mt-1 font-display text-[2.1rem] font-semibold leading-none tracking-tight">Bulk Buy</h1>
            <p className="mt-2 text-sm text-[#c9bfb2]">
              {nearbyPools.length > 0
                ? `${nearbyPools.length} group order${nearbyPools.length === 1 ? '' : 's'} filling near you`
                : 'Group prices on drinks, meat, groceries and livestock'}
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToBasket}
            aria-label={basketCount > 0 ? `Basket, ${basketCount} item${basketCount === 1 ? '' : 's'}` : 'Basket'}
            className="pressable relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cream text-ink"
          >
            <Icon name="cart" size={20} />
            {basketCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ochre-light px-1 text-xs font-extrabold text-[#1c1612] ring-2 ring-[#1c1612]">{basketCount}</span>
            )}
          </button>
        </div>
        <label className="mt-5 flex h-12 items-center gap-2.5 rounded-full bg-cream/10 px-4 ring-1 ring-cream/20 focus-within:ring-2 focus-within:ring-ochre-light">
          <Icon name="search" size={18} color="#c9bfb2" />
          <span className="sr-only">Search all departments</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search, e.g. Amstel, maize meal, sheep"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-cream [-webkit-text-fill-color:#f5f1e8] placeholder:text-[#a8a097] placeholder:[-webkit-text-fill-color:#a8a097] focus:outline-none"
          />
          {isSearching && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="pressable -mr-2 flex h-11 w-11 items-center justify-center text-[#c9bfb2]">
              <Icon name="close" size={16} />
            </button>
          )}
        </label>
      </header>

      {/* ---------- Department rail rising out of the header ---------- */}
      <nav aria-label="Departments" className="relative z-10 -mt-[60px]">
        <ul className="flex gap-2.5 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DEPARTMENTS.filter((d) => loading || deptCounts[d.id] || d.id === activeDept).map((d) => {
            const active = !isSearching && activeDept === d.id
            return (
              <li key={d.id} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); pickDept(d.id) }}
                  aria-pressed={active}
                  className={`pressable flex w-[112px] flex-col overflow-hidden rounded-[20px] text-left shadow-[0_16px_30px_-20px_rgba(43,30,18,0.65)] ring-2 ${active ? 'bg-ochre-light text-[#1c1612] ring-ochre-light' : 'bg-[#fffdf9] text-ink ring-transparent'}`}
                >
                  {/* One product per tile, whole, on a white panel so packshot
                      backgrounds blend in; only the blanket photo fills the tile. */}
                  <span className="relative block h-[78px] bg-white">
                    {d.image ? (
                      <img
                        src={d.image}
                        alt=""
                        loading="lazy"
                        className={PHOTO_TILES.has(d.id)
                          ? 'absolute inset-0 h-full w-full object-cover'
                          : 'absolute inset-0 h-full w-full object-contain p-2'}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-terracotta-dark"><Icon name={DEPARTMENT_ICON[d.id] || 'package'} size={24} /></span>
                    )}
                  </span>
                  <span className="min-w-0 px-2.5 pb-2.5 pt-2">
                    <span className="block truncate text-[13px] font-extrabold leading-tight">{d.short}</span>
                    <span className={`block truncate text-xs ${active ? 'text-[#a3471a]' : 'text-ink-muted'}`}>{d.xhosa}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ---------- How it works: one slim strip ---------- */}
      {!isSearching && (
        <ol aria-label="How Bulk Buy works" className="mx-4 mt-2 grid grid-cols-3 overflow-hidden rounded-[18px] border border-ink/[0.08]">
          {HOW_IT_WORKS.map((s) => (
            <li key={s.n} className="border-r border-ink/[0.08] px-2.5 py-2.5 last:border-r-0">
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3320] text-xs font-extrabold text-cream">{s.n}</span>
                <span className="truncate text-xs font-extrabold text-ink">{s.title}</span>
              </span>
              <span className="mt-1 block text-xs leading-snug text-ink-muted">{s.desc}</span>
            </li>
          ))}
        </ol>
      )}

      {/* ---------- Group orders filling near you ---------- */}
      {!isSearching && nearbyPools.length > 0 && (
        <section aria-label="Group orders near you" className="mt-6 px-4">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-terracotta-dark">Filling near you</p>
          <PoolOfferCard variant="feed" pool={nearbyPools[0]} />
        </section>
      )}

      {/* ---------- Department heading and aisles ---------- */}
      {isSearching ? (
        <p className="mt-6 px-5 text-sm font-bold text-ink-muted" aria-live="polite">
          {skus.length} result{skus.length === 1 ? '' : 's'} for “{searchQuery.trim()}” across every department
        </p>
      ) : activeDepartment && (
        <div className="mt-7">
          <div className="flex items-end justify-between gap-3 px-5">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-terracotta-dark">{activeDepartment.xhosa}</p>
              <h2 className="mt-0.5 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">{activeDepartment.name}</h2>
            </div>
            <span className="flex-shrink-0 pb-1 text-xs font-bold tabular-nums text-ink-muted">{skus.length} item{skus.length === 1 ? '' : 's'}</span>
          </div>
          {liveAisles.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ id: 'all', name: 'All' }, ...liveAisles].map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickAisle(a.id)}
                  aria-pressed={activeAisle === a.id}
                  className={`pressable min-h-9 flex-shrink-0 rounded-full px-3.5 text-[13px] font-bold ${activeAisle === a.id ? 'bg-[#1f3320] text-cream' : 'border border-ink/10 bg-[#fffdf9] text-ink-muted'}`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
          {liveSections.length > 1 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ id: 'all', name: `All ${currentAisle.name.toLowerCase()}` }, ...liveSections].map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  aria-pressed={activeSection === sec.id}
                  className={`pressable min-h-9 flex-shrink-0 rounded-full px-3 text-xs font-extrabold ${activeSection === sec.id ? 'bg-terracotta-dark text-white' : 'bg-cream-dark text-ink'}`}
                >
                  {sec.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Products ---------- */}
      <div className="mt-4 px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[230px] w-full rounded-[20px]" />)}
          </div>
        ) : catalogueError ? (
          <EmptyState
            emoji="📦"
            title="Products couldn't load"
            description="Check your connection, then try again. Your basket and other iCamagu features are unchanged."
            primaryLabel="Try again"
            onPrimary={() => setCatalogueRetry((attempt) => attempt + 1)}
          />
        ) : skus.length === 0 ? (
          <EmptyState emoji="📦" title="No items found" description={isSearching ? 'Try another product name, size or category, or clear your search.' : 'Try another department or aisle.'} />
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label || undefined}>
                {group.label && (
                  <h3 className="mb-3 flex items-baseline gap-2 px-1">
                    <span className="font-display text-[1.15rem] font-semibold text-ink">{group.label}</span>
                    <span className="text-xs font-bold tabular-nums text-ink-muted">{group.items.length}</span>
                  </h3>
                )}
                <ul className="grid grid-cols-2 gap-x-3 gap-y-6">
                  {group.items.map((sku) => (
                    <ProductCard
                      key={sku.id}
                      sku={sku}
                      showDepartment={isSearching}
                      adding={addingId === sku.id}
                      imageFailed={failedImageIds.has(sku.id)}
                      onImageError={() => setFailedImageIds((current) => new Set(current).add(sku.id))}
                      onAdd={() => addToBasket(sku)}
                      onOffers={() => setOfferSku(sku)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Floating basket bar above the tabs ---------- */}
      {basketCount > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[104px] z-20 flex justify-center px-4 print:hidden">
          <button
            type="button"
            onClick={onGoToBasket}
            className="pressable pointer-events-auto flex h-14 w-full max-w-[420px] items-center gap-3 rounded-full bg-terracotta-dark pl-2 pr-5 text-white shadow-[0_18px_36px_-14px_rgba(163,71,26,0.85)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-extrabold">{basketCount}</span>
            <span className="flex-1 text-left text-[15px] font-extrabold">{basketCount === 1 ? '1 item' : `${basketCount} items`} in your basket</span>
            <span className="flex items-center gap-1 text-sm font-extrabold">View <Icon name="arrowRight" size={15} /></span>
          </button>
        </div>
      )}

      {offerSku && <PoolOfferCard cost={{ id: null, skuId: offerSku.id, label: offerSku.name, quantity: 1, unitCost: offerSku.casePriceZAR }} onClose={() => setOfferSku(null)} />}
    </div>
  )
}

export default Store
