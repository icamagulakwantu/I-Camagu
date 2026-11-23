import { useState, useEffect, useMemo, useRef } from 'react'
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
import { useLanguage, useT } from '../i18n/index.jsx'

// Layout (founder, 23 Nov 2026: it must feel like a shop and make people want
// to buy): a light header with a big search, an offers banner with the
// products cut out on a white disc, round department tiles, the biggest
// savings in a row, then the aisles. Every offer is real: savings are only
// shown against a shelf price somebody read off a shop.

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

// How SmartMatch works, in three short steps: many small orders from
// families and stokvels become one big order at volume prices.
const HOW_IT_WORKS = [
  { n: 1, title: 'Add it', desc: 'Drinks, meat, groceries or livestock' },
  { n: 2, title: 'Matched', desc: 'SmartMatch joins it with families and stokvels near you' },
  { n: 3, title: 'Pay less', desc: 'Bought at volume, divided, delivered or collected nearby' },
]

// Product prices keep their cents, written the South African way: R2 700,00.
const price = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const rands = (n) => `R${Math.round(Number(n)).toLocaleString('en-ZA')}`

// The saving against a shelf price somebody actually read off a shop (the
// catalogue only sends a retail price when it is verified).
function savingOf(sku) {
  const retail = sku.retailPriceZAR ? parseFloat(sku.retailPriceZAR) : null
  const casePrice = sku.casePriceZAR != null ? parseFloat(sku.casePriceZAR) : null
  if (!retail || casePrice == null || retail <= casePrice) return null
  return { retail, casePrice, amount: retail - casePrice, pct: Math.round(((retail - casePrice) / retail) * 100) }
}

// A product picture in the shop style: the packshot whole, on a warm tile,
// its white background blended away; photographs (meat, livestock, produce)
// fill the tile.
function ProductImage({ sku, failed, onError, className = '' }) {
  const t = useT()
  const dept = departmentOf(sku)
  if (sku.imageUrl && !failed) {
    return (
      <img
        src={sku.imageUrl}
        alt={`${sku.name}${sku.bottleFormat ? `, ${sku.bottleFormat}` : ''}`}
        className={isPhotograph(sku) ? `h-full w-full object-cover ${className}` : `h-full w-full object-contain p-3 mix-blend-multiply ${className}`}
        loading="lazy"
        decoding="async"
        onError={onError}
      />
    )
  }
  return (
    <span className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br ${PLACEHOLDER_TONE[dept.id] || PLACEHOLDER_TONE.other}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70">
        <Icon name={DEPARTMENT_ICON[dept.id] || 'package'} size={22} />
      </span>
      <span className="px-2 text-center text-[11px] font-bold leading-tight opacity-80">{t('Photo soon')}</span>
    </span>
  )
}

function ProductCard({ sku, showDepartment, adding, imageFailed, onImageError, onAdd, onOffers, rail = false }) {
  const t = useT()
  const saving = savingOf(sku)
  const casePrice = sku.casePriceZAR != null ? parseFloat(sku.casePriceZAR) : null
  const dept = departmentOf(sku)
  const unit = unitOf(sku)
  const flock = collectiveNoun(sku)
  const pack = [sku.bottleFormat, sku.unitsPerCase > 1 ? `${sku.unitsPerCase} per ${unit}` : `per ${unit}`].filter(Boolean).join(' · ')

  return (
    <li className={`flex min-w-0 flex-col rounded-[22px] bg-white p-2 shadow-[0_14px_30px_-24px_rgba(43,30,18,0.6)] ring-1 ring-ink/[0.05] ${rail ? 'w-[158px] flex-shrink-0 snap-start' : ''}`}>
      <button
        type="button"
        onClick={casePrice != null ? onOffers : undefined}
        disabled={casePrice == null}
        className="flex min-w-0 flex-1 flex-col text-left disabled:cursor-default"
      >
        <span className={`relative block overflow-hidden rounded-[18px] bg-[#f5ecdc] ${rail ? 'h-[124px]' : 'h-[138px]'}`}>
          <ProductImage sku={sku} failed={imageFailed} onError={onImageError} />
          {saving && (
            <span className="absolute left-2 top-2 rounded-full bg-[#c2410c] px-2 py-0.5 text-[12px] font-extrabold tabular-nums text-white shadow-[0_6px_14px_-6px_rgba(194,65,12,0.9)]">
              −{saving.pct}%
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col px-1.5 pt-2.5">
          {showDepartment && <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6f655a]">{t(dept.short)}</span>}
          <span className="line-clamp-2 text-[14px] font-bold leading-snug text-ink">{sku.name}</span>
          <span className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-ink-muted">{pack}</span>
          {flock && <span className="mt-0.5 text-[12px] text-ink-muted">Pooled into a {flock}</span>}
        </span>
      </button>
      <div className="mt-2 flex items-end justify-between gap-2 px-1.5 pb-1">
        <div className="min-w-0">
          {saving && <span className="block text-[12px] tabular-nums text-ink-muted line-through">{price(saving.retail)}</span>}
          <span className={`block truncate text-[16px] font-extrabold tabular-nums leading-tight ${saving ? 'text-[#c2410c]' : 'text-ink'}`}>
            {casePrice != null ? price(casePrice) : t('Price soon')}
          </span>
        </div>
        {casePrice != null && (
          <button
            type="button"
            onClick={onAdd}
            disabled={adding}
            aria-label={`Add 1 ${unit} of ${sku.name} to your basket`}
            className={`pressable flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-90 ${adding ? 'bg-[#2e6b3a]' : 'bg-[#1c1612]'}`}
          >
            <Icon name={adding ? 'check' : 'plus'} size={18} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </li>
  )
}

// The offers banner: real offers only, built from the catalogue (the biggest
// saving against a checked shelf price, a worked example, group orders near
// you). Slides on its own every few seconds, stops while a finger is on it,
// and not at all for people who ask for less motion.
const TONES = {
  ember: 'bg-[radial-gradient(120%_120%_at_0%_0%,#8f2d0b_0%,#c2410c_55%,#ef6a1f_100%)]',
  forest: 'bg-[radial-gradient(120%_120%_at_0%_0%,#14240f_0%,#1f3320_50%,#3c6a37_100%)]',
  earth: 'bg-[radial-gradient(120%_120%_at_0%_0%,#4a2a12_0%,#7a4419_55%,#b26a28_100%)]',
}

function OffersBanner({ slides }) {
  const t = useT()
  const ref = useRef(null)
  const [index, setIndex] = useState(0)
  const pausedUntil = useRef(0)

  useEffect(() => {
    if (slides.length < 2) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => {
      const el = ref.current
      if (!el || Date.now() < pausedUntil.current) return
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    }, 5500)
    return () => clearInterval(id)
  }, [slides.length])

  if (!slides.length) return null
  return (
    <section aria-roledescription="carousel" aria-label={t('Offers')} className="mt-4">
      <div
        ref={ref}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onPointerDown={() => { pausedUntil.current = Date.now() + 12000 }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div key={slide.id} className="w-full flex-shrink-0 snap-center px-4" aria-roledescription="slide" aria-label={`${i + 1} / ${slides.length}`}>
            <div className={`relative h-[228px] overflow-hidden rounded-[28px] p-5 text-white shadow-[0_22px_40px_-26px_rgba(120,40,10,0.9)] ${TONES[slide.tone]}`}>
              <div className="relative z-10 flex h-full max-w-[56%] flex-col">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/80">{slide.eyebrow}</p>
                <p className="mt-1.5 font-display text-[1.75rem] font-semibold leading-[1.02] tracking-tight">{slide.title}</p>
                {slide.body && <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-white/85">{slide.body}</p>}
                <button type="button" onClick={slide.onClick} className="pressable mt-auto inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#1c1612]">
                  {slide.cta} <Icon name="arrowRight" size={14} />
                </button>
              </div>
              {/* The products, cut out, on a white disc breaking out of the corner. */}
              <div className="absolute -bottom-12 -right-16 h-[214px] w-[214px] rounded-full bg-white/95" aria-hidden="true" />
              <div className="absolute bottom-3 right-1 flex h-[150px] w-[40%] items-end justify-center" aria-hidden="true">
                {slide.images.slice(0, 3).map((src, n) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className={`object-contain mix-blend-multiply ${slide.images.length === 1 ? 'h-[140px] w-[120px]' : n === 0 ? 'z-10 h-[138px] w-[56px]' : n === 1 ? 'z-[5] -ml-2 h-[118px] w-[46px]' : '-ml-2 h-[100px] w-[42px]'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {slides.map((slide, i) => (
            <span key={slide.id} className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-[#1c1612]' : 'w-2 bg-ink/20'}`} />
          ))}
        </div>
      )}
    </section>
  )
}

function Store({ onGoToBasket, basketCount, initialSearch = '', onOpenExample }) {
  const t = useT()
  const { lang } = useLanguage()
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
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [offerSku, setOfferSku] = useState(null)
  const [failedImageIds, setFailedImageIds] = useState(() => new Set())
  const productsRef = useRef(null)
  const poolsRef = useRef(null)
  const searchRef = useRef(null)

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
        showToast(t('Could not load products'), 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [catalogueRetry])

  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  // How many products each department has, for the department tiles.
  const deptCounts = useMemo(() => {
    const counts = {}
    for (const sku of allSkus) {
      const id = departmentOf(sku).id
      counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }, [allSkus])

  // The biggest savings against a checked shelf price, with a photo.
  const deals = useMemo(() => allSkus
    .map((sku) => ({ sku, saving: savingOf(sku) }))
    .filter((d) => d.saving && d.sku.imageUrl && !failedImageIds.has(d.sku.id))
    .sort((a, b) => b.saving.pct - a.saving.pct || b.saving.amount - a.saving.amount)
    .slice(0, 10)
    .map((d) => d.sku), [allSkus, failedImageIds])

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
      // Products with a photo first on each shelf, then by name and pack.
      group.items.sort((a, b) => Number(!a.imageUrl) - Number(!b.imageUrl) || a.name.localeCompare(b.name) || String(a.bottleFormat || '').localeCompare(String(b.bottleFormat || '')))
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
      setTimeout(() => setAddingId(null), 900)
    }
  }

  // The offers banner, from what is really in the catalogue today.
  const slides = useMemo(() => {
    const out = []
    const photo = (re) => allSkus.find((s) => re.test(s.name) && s.imageUrl && !failedImageIds.has(s.id))?.imageUrl
    const top = deals[0]
    if (top) {
      const saving = savingOf(top)
      out.push({
        id: 'deal', tone: 'ember',
        eyebrow: t('Biggest saving right now'),
        title: t('{pct}% off', { pct: saving.pct }),
        body: t('{name}: {price} a {unit} in a group order, {retail} in the shops.', { name: top.name, price: rands(saving.casePrice), unit: unitOf(top), retail: rands(saving.retail) }),
        cta: t('See the deal'),
        onClick: () => setOfferSku(top),
        images: [top.imageUrl],
      })
    }
    const pool = [photo(/^Commando/i), photo(/^Old Buck Gin/i), photo(/^Black Label/i) || photo(/^Castle Lager/i)].filter(Boolean)
    if (onOpenExample && pool.length) {
      out.push({
        id: 'umgidi', tone: 'forest',
        eyebrow: t('Umgidi drinks pool'),
        title: t('Fill the umgidi together'),
        body: t('50 members, R1,500 a month: brandy, gin, beer and cider at group prices.'),
        cta: t('See how'),
        onClick: () => onOpenExample('drinks'),
        images: pool,
      })
    }
    if (nearbyPools.length) {
      out.push({
        id: 'pools', tone: 'earth',
        eyebrow: t('Filling near you'),
        title: nearbyPools.length === 1 ? t('1 group order') : t('{n} group orders', { n: nearbyPools.length }),
        body: t('Join one now: you pay the group price once it fills.'),
        cta: t('Join in'),
        onClick: () => poolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        images: DEPARTMENTS.filter((d) => d.image && !PHOTO_TILES.has(d.id)).slice(0, 3).map((d) => d.image),
      })
    } else if (deptCounts.groceries) {
      const groceryPics = allSkus.filter((s) => departmentOf(s).id === 'groceries' && s.imageUrl && !failedImageIds.has(s.id)).slice(0, 3).map((s) => s.imageUrl)
      const pics = groceryPics.length ? groceryPics : [DEPARTMENTS.find((d) => d.id === 'groceries')?.image].filter(Boolean)
      if (pics.length) {
        out.push({
          id: 'groceries', tone: 'earth',
          eyebrow: t('Stokvel year-end'),
          title: t('Groceries by the bag'),
          body: t('Maize meal, rice, samp and sugar, bought together at group prices.'),
          cta: t('Shop groceries'),
          onClick: () => { setSearchQuery(''); pickDept('groceries'); setTimeout(scrollToProducts, 50) },
          images: pics,
        })
      }
    }
    return out
  }, [allSkus, deals, nearbyPools.length, deptCounts.groceries, failedImageIds, onOpenExample, t])

  const card = (sku, extra = {}) => (
    <ProductCard
      key={sku.id}
      sku={sku}
      showDepartment={isSearching}
      adding={addingId === sku.id}
      imageFailed={failedImageIds.has(sku.id)}
      onImageError={() => setFailedImageIds((current) => new Set(current).add(sku.id))}
      onAdd={() => addToBasket(sku)}
      onOffers={() => setOfferSku(sku)}
      {...extra}
    />
  )

  return (
    <div className="mx-auto min-h-screen max-w-md pb-48">
      {/* ---------- Header: where you are, the basket, a big search ---------- */}
      <header className="px-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[12px] font-bold text-ink-muted">
              <Icon name="mapPin" size={13} color="#c2410c" />
              <span className="truncate">{location.label ? t('Group prices near {place}', { place: location.label }) : t('SmartMatch group prices')}</span>
            </p>
            <h1 className="mt-0.5 font-display text-[2rem] font-semibold leading-none tracking-tight text-ink">{t('Bulk Buy')}</h1>
          </div>
          <button
            type="button"
            onClick={onGoToBasket}
            aria-label={basketCount > 0 ? `Basket, ${basketCount} item${basketCount === 1 ? '' : 's'}` : t('Basket')}
            className="pressable relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#1c1612] text-white"
          >
            <Icon name="cart" size={20} />
            {basketCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c2410c] px-1 text-xs font-extrabold text-white ring-2 ring-cream">{basketCount}</span>
            )}
          </button>
        </div>
        <form
          role="search"
          onSubmit={(e) => { e.preventDefault(); searchRef.current?.blur(); scrollToProducts() }}
          className="mt-4 flex h-[56px] items-center gap-2 rounded-full bg-white pl-4 pr-1.5 shadow-[0_14px_30px_-22px_rgba(43,30,18,0.7)] ring-1 ring-ink/[0.06] focus-within:ring-2 focus-within:ring-[#c2410c]/50"
        >
          <Icon name="search" size={19} color="#6f655a" />
          <label htmlFor="store-search" className="sr-only">{t('Search all departments')}</label>
          <input
            id="store-search"
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search Black Label, Hennessy, samp…')}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-muted/70 focus:outline-none"
          />
          {isSearching && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label={t('Clear search')} className="pressable flex h-10 w-10 items-center justify-center text-ink-muted">
              <Icon name="close" size={16} />
            </button>
          )}
          <button type="submit" className="pressable h-11 flex-shrink-0 rounded-full bg-[#1c1612] px-5 text-[14px] font-extrabold text-white">{t('Search')}</button>
        </form>
      </header>

      {!isSearching && (
        <>
          {/* ---------- Offers ---------- */}
          {loading ? <div className="mx-4 mt-4"><Skeleton className="h-[228px] w-full rounded-[28px]" /></div> : <OffersBanner slides={slides} />}

          {/* ---------- Shop by department ---------- */}
          <section aria-label={t('Departments')} className="mt-6">
            <h2 className="px-4 font-display text-[1.45rem] font-semibold tracking-tight text-ink">{t('Shop by department')}</h2>
            <ul className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {DEPARTMENTS.filter((d) => loading || deptCounts[d.id] || d.id === activeDept).map((d) => {
                const active = activeDept === d.id
                return (
                  <li key={d.id} className="w-[84px] flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { pickDept(d.id); setTimeout(scrollToProducts, 50) }}
                      aria-pressed={active}
                      className="pressable flex w-full flex-col items-center gap-1.5 text-center"
                    >
                      <span className={`relative block h-[84px] w-[84px] overflow-hidden rounded-[26px] bg-[#f3e8d4] ring-2 transition ${active ? 'ring-[#c2410c]' : 'ring-transparent'}`}>
                        {d.image ? (
                          <img src={d.image} alt="" loading="lazy" className={PHOTO_TILES.has(d.id) || PHOTO_DEPARTMENTS.has(d.id) ? 'h-full w-full object-cover' : 'h-full w-full object-contain p-2.5 mix-blend-multiply'} />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[#a3471a]"><Icon name={DEPARTMENT_ICON[d.id] || 'package'} size={26} /></span>
                        )}
                      </span>
                      <span className={`block w-full truncate text-[13px] leading-tight ${active ? 'font-extrabold text-[#c2410c]' : 'font-bold text-ink'}`}>{lang === 'xh' ? d.xhosa : d.short}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* ---------- Biggest savings ---------- */}
          {deals.length > 2 && (
            <section aria-label={t('Biggest savings')} className="mt-7">
              <div className="flex items-end justify-between px-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#c2410c]">{t('Against shop prices')}</p>
                  <h2 className="font-display text-[1.45rem] font-semibold tracking-tight text-ink">{t('Biggest savings')}</h2>
                </div>
              </div>
              <ul className="mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {deals.map((sku) => card(sku, { rail: true, showDepartment: false }))}
              </ul>
            </section>
          )}

          {/* ---------- The bulk-price rule, once; how it works on a tap ----------
              Founder's rule: listed prices are special-level bulk prices,
              unlocked by the group order's bulk tier, never single prices. */}
          <details className="group mx-4 mt-5 rounded-[16px] bg-[#2e4a2e]/[0.07] px-3.5 py-2.5 text-[12px] leading-relaxed text-ink">
            <summary className="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
              <Icon name="info" size={15} color="#1f3320" className="mt-0.5 flex-shrink-0" />
              <span className="min-w-0 flex-1"><span className="font-extrabold text-[#1f3320]">{t('Bulk prices, not single prices.')}</span> {t('You pay only once your group order reaches its bulk tier.')}</span>
              <span className="flex-shrink-0 font-extrabold text-[#1f3320] underline underline-offset-2 group-open:hidden">{t('How it works')}</span>
            </summary>
            <ol aria-label={t('How Bulk Buy works')} className="mt-3 space-y-2">
              {HOW_IT_WORKS.map((s) => (
                <li key={s.n} className="flex gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3320] text-xs font-extrabold text-cream">{s.n}</span>
                  <span><span className="font-extrabold">{t(s.title)}.</span> {t(s.desc)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-ink-muted">{t("Prices here are SmartMatch bulk prices, set at the shops' special prices. They unlock only when your group order reaches its bulk tier, and are not prices for buying one on its own. You only pay once the group reaches its minimum and the supplier confirms the price.")}</p>
          </details>

          {/* ---------- Group orders filling near you ---------- */}
          {nearbyPools.length > 0 && (
            <section ref={poolsRef} aria-label={t('Group orders near you')} className="mt-6 px-4">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">{t('Filling near you')}</p>
              <PoolOfferCard variant="feed" pool={nearbyPools[0]} />
            </section>
          )}
        </>
      )}

      {/* ---------- Department heading and aisles ---------- */}
      <div ref={productsRef} className="scroll-mt-2" />
      {isSearching ? (
        <p className="mt-6 px-5 text-sm font-bold text-ink-muted" aria-live="polite">
          {skus.length} result{skus.length === 1 ? '' : 's'} for “{searchQuery.trim()}” across every department
        </p>
      ) : activeDepartment && (
        <div className="mt-8">
          <div className="flex items-end justify-between gap-3 px-4">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">{activeDepartment.xhosa}</p>
              <h2 className="mt-0.5 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">{t(activeDepartment.name)}</h2>
            </div>
            <span className="flex-shrink-0 pb-1 text-xs font-bold tabular-nums text-ink-muted">{skus.length === 1 ? t('1 item') : t('{n} items', { n: skus.length })}</span>
          </div>
          {liveAisles.length > 1 && (
            <div className="sticky top-0 z-20 mt-3 flex gap-2 overflow-x-auto bg-cream/95 px-4 pb-2 pt-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ id: 'all', name: t('All') }, ...liveAisles].map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickAisle(a.id)}
                  aria-pressed={activeAisle === a.id}
                  className={`pressable min-h-9 flex-shrink-0 rounded-full px-3.5 text-[13px] font-bold ${activeAisle === a.id ? 'bg-[#1c1612] text-white' : 'bg-white text-ink ring-1 ring-ink/10'}`}
                >
                  {t(a.name)}
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
                  className={`pressable min-h-9 flex-shrink-0 rounded-full px-3 text-xs font-extrabold ${activeSection === sec.id ? 'bg-[#c2410c] text-white' : 'bg-[#f3e8d4] text-ink'}`}
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
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[250px] w-full rounded-[22px]" />)}
          </div>
        ) : catalogueError ? (
          <EmptyState
            emoji="📦"
            title={t('Products couldn\'t load')}
            description={t('Check your connection, then try again. Your basket and other i-Camagu features are unchanged.')}
            primaryLabel={t('Try again')}
            onPrimary={() => setCatalogueRetry((attempt) => attempt + 1)}
          />
        ) : skus.length === 0 ? (
          <EmptyState emoji="📦" title={t('No items found')} description={isSearching ? t('Try another product name, size or category, or clear your search.') : t('Try another department or aisle.')} />
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label || undefined}>
                {group.label && (
                  <h3 className="mb-3 flex items-baseline gap-2 px-1">
                    <span className="font-display text-[1.15rem] font-semibold text-ink">{t(group.label)}</span>
                    <span className="text-xs font-bold tabular-nums text-ink-muted">{group.items.length}</span>
                  </h3>
                )}
                <ul className="grid grid-cols-2 gap-3">
                  {group.items.map((sku) => card(sku))}
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
            className="pressable pointer-events-auto flex h-14 w-full max-w-[420px] items-center gap-3 rounded-full bg-[#1c1612] pl-2 pr-5 text-white shadow-[0_18px_36px_-14px_rgba(28,22,18,0.85)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c2410c] text-sm font-extrabold">{basketCount}</span>
            <span className="flex-1 text-left text-[15px] font-extrabold">{basketCount === 1 ? '1 item' : `${basketCount} items`} in your basket</span>
            <span className="flex items-center gap-1 text-sm font-extrabold">{t('View')} <Icon name="arrowRight" size={15} /></span>
          </button>
        </div>
      )}

      {offerSku && <PoolOfferCard cost={{ id: null, skuId: offerSku.id, label: offerSku.name, quantity: 1, unitCost: offerSku.casePriceZAR }} onClose={() => setOfferSku(null)} />}
    </div>
  )
}

export default Store
