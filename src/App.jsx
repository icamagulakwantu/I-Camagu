// ===================== IMPORTS =====================
import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider, useToast } from './components/ui/Toast.jsx'
import { EmptyState } from './components/ui/EmptyState.jsx'
import { Skeleton } from './components/ui/Skeleton.jsx'

// Screen Imports
import Login from './pages/Login.jsx'
import Username from './pages/Username.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Store from './pages/Store.jsx'
import Basket from './pages/Basket.jsx'
import CeremonyHub from './pages/CeremonyHub.jsx'
import CeremonyPlanner from './pages/CeremonyPlanner.jsx'
import CeremonyTimeline from './pages/CeremonyTimeline.jsx'
import Templates from './pages/Templates.jsx'
import FamilyContributions from './pages/FamilyContributions.jsx'
import Ukugida from './pages/Ukugida.jsx'
import Ukusoka from './pages/Ukusoka.jsx'
import IzidukoNetwork from './pages/IzidukoNetwork.jsx'
import Stokvels from './pages/Stokvels.jsx'
import Portal from './pages/Portal.jsx'
import Ekoyini from './pages/Ekoyini.jsx'
import EkoyiniAdmin from './pages/EkoyiniAdmin.jsx'
import IdentityAdmin from './pages/IdentityAdmin.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Hierarchy from './pages/Hierarchy.jsx'
import MyOrders from './pages/MyOrders.jsx'
import Expenditure from './pages/Expenditure.jsx'
import ShrineFund from './pages/ShrineFund.jsx'
import LegendsExplore from './pages/LegendsExplore.jsx'
import Directory from './pages/Directory.jsx'
import UmqombothiCalculator from './pages/UmqombothiCalculator.jsx'
import Profile from './pages/Profile.jsx'
import PinSetup from './pages/PinSetup.jsx'
import PublicPlanView from './pages/PublicPlanView.jsx'
import PublicUbuhlanti from './pages/PublicUbuhlanti.jsx'
import More from './pages/More.jsx'
import Activity from './pages/Activity.jsx'
import Notifications from './pages/Notifications.jsx'           // ✅ NEW
import ResetPassword from './pages/ResetPassword.jsx'
import AccountSettings from './pages/AccountSettings.jsx'
import Help from './pages/Help.jsx'
import BudgetDashboard from './pages/BudgetDashboard.jsx'
import SupplierDashboard from './pages/SupplierDashboard.jsx'
import EkoyiniBooking from './pages/EkoyiniBooking.jsx'

// Components
import BottomNav from './components/BottomNav.jsx'
import DidYouKnow from './components/DidYouKnow.jsx'
import Icon from './components/Icon.jsx'
import NotificationBell from './components/NotificationBell.jsx'  // ✅ NEW
import PinReminder from './components/PinReminder.jsx'

// Touch feedback utility (from second file)
const pressable =
  'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

const MORE_SCREENS = [
  'more',
  'ceremony',
  'timeline',
  'budget',
  'ekoyinibooking',
  'templates',
  'family',
  'ukugida',
  'ukusoka',
  'iziduko',
  'supplier',
  'portal',
  'ekoyini',
  'ekoyiniadmin',
  'identityadmin',
  'privacy',
  'hierarchy',
  'myorders',
  'expenditure',
  'shrinefund',
  'legends',
  'directory',
  'umqombothi',
  'pin',
  'profile',
  'notifications',   // ✅ NEW
  'account',
  'help',
  'activity',
]

// ---------- Dashboard (enhanced with loading, errors, empty states) ----------
function Dashboard({ onNavigate, basketCount = 0, onSelectCeremony }) {
  const { user, accessToken } = useAuth()
  const { showToast } = useToast()
  const [stokvels, setStokvels] = useState([])
  const [ceremonies, setCeremonies] = useState([])
  const [loadingStokvels, setLoadingStokvels] = useState(true)
  const [loadingCeremonies, setLoadingCeremonies] = useState(true)

  useEffect(() => {
    if (!accessToken) return

    // Fetch stokvels
    setLoadingStokvels(true)
    fetch('/api/stokvels/my', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load stokvels'))))
      .then((data) => setStokvels(Array.isArray(data) ? data : []))
      .catch((err) => {
        showToast(err.message, 'error')
        setStokvels([])
      })
      .finally(() => setLoadingStokvels(false))

    // Fetch ceremonies
    setLoadingCeremonies(true)
    fetch('/api/ceremonies/my', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load ceremonies'))))
      .then((data) => setCeremonies(Array.isArray(data) ? data : []))
      .catch((err) => {
        showToast(err.message, 'error')
        setCeremonies([])
      })
      .finally(() => setLoadingCeremonies(false))
  }, [accessToken, showToast])

  const leadCeremony = ceremonies[0] || null
  const leadCeremonyItems = leadCeremony?.checklistItems || []
  const leadCeremonyProgress = leadCeremonyItems.length
    ? Math.round((leadCeremonyItems.filter((i) => i.isCompleted || i.isChecked).length / leadCeremonyItems.length) * 100)
    : null

  return (
    <div className="px-5 pt-6 pb-28 max-w-md mx-auto">
      {/* Brand mark */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <img src="/icons/source/gateway-mark-1024.png" alt="" className="w-12 h-12" />
          <span className="font-display font-bold text-2xl text-brand-black">iCamagu</span>
        </div>
        <NotificationBell onOpen={() => onNavigate('notifications')} />
      </div>

      {/* Homestead photo — the emotional opener */}
      <div className="relative overflow-hidden rounded-soft mb-3 h-32 shadow-soft">
        <img src="/images/home-hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/15 to-transparent" />
      </div>

      {/* Greeting hero — wash-ember stands in for a homestead photo */}
      <div className="wash-ember grain relative overflow-hidden rounded-soft p-5 mb-5 shadow-soft">
        <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-cream">
          <img src="/icons/source/gateway-mark-1024.png" alt="" className="w-4 h-4" style={{ filter: 'brightness(0) invert(1)' }} />
          Molo, {user?.firstName || 'friend'}
        </p>
        <h1 className="mt-1.5 font-display text-2xl leading-tight text-cream">
          {ceremonies.length > 0 ? <>The homestead is<br />preparing for {ceremonies[0]?.title || 'a ceremony'}.</> : 'uMntu ngumntu ngabantu.'}
        </h1>
      </div>

      {/* Three ways — the core pitch, each its own product story */}
      <p className="eyebrow text-terracotta mb-1">Three ways iCamagu carries you</p>
      <h2 className="font-display font-bold text-2xl leading-tight text-brand-black mb-4">Built around what families do together.</h2>

      {/* 01 · Ceremonies */}
      <button
        type="button"
        onClick={() => onNavigate('ceremonyhub')}
        className={`w-full text-left card-paper overflow-hidden mb-4 ${pressable}`}
      >
        <div className="wash-ember relative p-5">
          <div className="flex items-start justify-between">
            <span className="eyebrow text-cream/75">01 · Ceremonies</span>
            <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <Icon name="calendar" size={18} color="#ffffff" />
            </span>
          </div>
          <h3 className="mt-6 font-display text-2xl text-cream leading-tight">Plan an uMgidi, properly.</h3>
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-brand-black/60">
            Create the plan, budget the day, assign family roles and track every contribution through execution.
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-terracotta/10 pt-4">
            <div className="min-w-0">
              {leadCeremony ? (
                <>
                  <p className="text-xs text-brand-black/50 truncate">{leadCeremony.title}</p>
                  <p className="tabular mt-0.5 text-sm font-bold text-brand-black">
                    {leadCeremonyProgress != null ? `${leadCeremonyProgress}% prepared` : 'In progress'}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-brand-black">Start your first plan</p>
              )}
            </div>
            <span className="w-11 h-11 rounded-full bg-terracotta flex items-center justify-center flex-shrink-0">
              <Icon name="arrowRight" size={18} color="#ffffff" />
            </span>
          </div>
        </div>
      </button>

      {/* 02 · Smart Match */}
      <button
        type="button"
        onClick={() => onNavigate('store')}
        className={`w-full text-left wash-sage rounded-soft p-5 mb-4 shadow-soft ${pressable}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cream/70">02 · Smart Match</p>
            <h3 className="mt-1.5 font-display text-2xl leading-tight text-cream max-w-[12ch]">One pallet. Many households.</h3>
          </div>
          <Icon name="package" size={26} color="#ffffff" />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-cream/80">
          Your order pools with members across stokvels. Once the pool reaches the supplier's minimum, everyone unlocks the pallet price.
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-cream/15 pt-4 text-sm font-bold text-cream">
          Find a buying pool
          <Icon name="arrowRight" size={18} color="#ffffff" />
        </div>
      </button>

      {/* 03 · ClanMatch */}
      <button
        type="button"
        onClick={() => onNavigate('iziduko')}
        className={`w-full text-left card-paper overflow-hidden px-5 py-6 mb-3 ${pressable}`}
      >
        <div className="flex items-center justify-between">
          <p className="eyebrow text-terracotta">03 · ClanMatch</p>
          <Icon name="link" size={20} color="#c45c26" />
        </div>
        <h3 className="mt-3 font-display text-2xl leading-tight text-brand-black max-w-[14ch]">Find the family name between you.</h3>
        <p className="mt-3 text-sm leading-relaxed text-brand-black/60">
          Match paternal and maternal clan names — including both grandmothers — to reveal possible family relationships, even among cousins you haven't met.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-soft border border-terracotta/15 bg-terracotta/15">
          {['Paternal', 'Maternal', 'Paternal grandmother', 'Maternal grandmother'].map((branch) => (
            <div key={branch} className="flex items-center gap-2 bg-white px-3 py-2.5">
              <Icon name="users" size={14} color="#c45c26" />
              <span className="text-[11px] leading-tight text-brand-black/60">{branch}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-terracotta/10 pt-4 text-sm font-bold text-brand-black">
          Explore ClanMatch
          <Icon name="arrowRight" size={18} color="#c45c26" />
        </div>
      </button>

      {/* 04 · Ukugida — the fourth pillar, not a smaller utility. Prevents
          the loss families feel today: physical reciprocity books lost or
          gone when the person who kept them dies, so nobody knows what
          was given or is still owed. */}
      <button
        type="button"
        onClick={() => onNavigate('ukugida')}
        className={`w-full text-left card-paper overflow-hidden px-5 py-6 mb-6 ${pressable}`}
      >
        <div className="flex items-center justify-between">
          <p className="eyebrow text-terracotta">04 · Ukugida</p>
          <span className="w-10 h-10 rounded-full bg-ink/8 flex items-center justify-center flex-shrink-0">
            <Icon name="book" size={18} color="#2b2620" />
          </span>
        </div>
        <h3 className="mt-3 font-display text-2xl leading-tight text-brand-black max-w-[15ch]">Never lose the record again.</h3>
        <p className="mt-3 text-sm leading-relaxed text-brand-black/60">
          A living reciprocity ledger — who gave what, and what's still owed back — so it doesn't disappear with a lost book, or with the person who kept it.
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-terracotta/10 pt-4 text-sm font-bold text-brand-black">
          Open Ukugida
          <Icon name="arrowRight" size={18} color="#c45c26" />
        </div>
      </button>

      <div className="text-center mb-6">
        <img src="/icons/source/gateway-mark-1024.png" alt="" className="w-6 h-6 mx-auto opacity-40" />
        <p className="mt-2 font-display italic text-sm text-brand-black/50">What the family carries, no one carries alone.</p>
      </div>

      {/* Did You Know */}
      <div className="card-paper grain wash-clay overflow-hidden mb-5">
        <div className="p-4">
          <DidYouKnow />
        </div>
      </div>

      <PinReminder onNavigate={onNavigate} />

      {/* Your Ceremonies */}
      <div className="mb-6">
        <p className="eyebrow mb-2">
          Your Ceremonies
        </p>

        {loadingCeremonies ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-soft" />
            <Skeleton className="h-16 w-full rounded-soft" />
          </div>
        ) : ceremonies.length === 0 ? (
          <EmptyState
            emoji="📋"
            title="No ceremonies yet"
            description="Plan your next Umgidi, Ulwaluko, or Ukukhapha with step-by-step cultural checklists."
            primaryLabel="Plan Ceremony"
            onPrimary={() => onNavigate('ceremonyhub')}
          />
        ) : (
          <div className="space-y-2">
            {ceremonies.map((c, idx) => (
              <button
                key={c?.id || idx}
                type="button"
                onClick={() => c?.id ? onSelectCeremony?.(c.id) : onNavigate('ceremonyhub')}
                className={`w-full text-left bg-white/90 backdrop-blur-md border-2 border-terracotta/15 rounded-soft p-3.5 shadow-sm ${pressable}`}
              >
                <p className="font-display font-semibold text-base text-brand-black">{c?.title || 'Untitled Ceremony'}</p>
                <p className="text-xs text-brand-black/50 capitalize mt-0.5">
                  {c?.type ? c.type.replace(/_/g, ' ') : 'General'} • {c?.preparationPlans?.length || 0} plan(s)
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Your Stokvels */}
      <div>
        <p className="eyebrow mb-2">
          Your Stokvels
        </p>

        {loadingStokvels ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-soft" />
            <Skeleton className="h-16 w-full rounded-soft" />
          </div>
        ) : stokvels.length === 0 ? (
          <EmptyState
            emoji="🏘️"
            title="No stokvels yet"
            description="Join a community savings group or start your own. Pool resources for the next Umgidi or Ulwaluko."
            primaryLabel="Create Stokvel"
            onPrimary={() => onNavigate('stokvels')}
            secondaryLabel="Join with Code"
            onSecondary={() => onNavigate('stokvels')}
          />
        ) : (
          <div className="space-y-2">
            {stokvels.map((m, idx) => (
              <button
                key={m?.id || idx}
                type="button"
                onClick={() => onNavigate('stokvels')}
                className={`w-full text-left bg-white/90 backdrop-blur-md border-2 border-terracotta/15 rounded-soft p-3.5 shadow-sm ${pressable}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-display font-semibold text-base text-brand-black">{m?.stokvel?.name || 'Stokvel'}</p>
                    <p className="text-xs text-brand-black/50">
                      {m?.stokvel?.type ? m.stokvel.type.replace(/_/g, ' ') : ''}
                    </p>
                  </div>
                  <span className="tabular font-bold text-xs text-brand-ochre bg-brand-ochre/10 px-2.5 py-1 rounded-pill">
                    R{parseFloat(m?.stokvel?.groupLedger?.totalBalance || 0).toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- MainApp ----------
function MainApp() {
  const { accessToken, user } = useAuth()
  const [screen, setScreen] = useState('home')
  const [basketCount, setBasketCount] = useState(0)
  const [ceremonyHubType, setCeremonyHubType] = useState(null)
  const [timelineType, setTimelineType] = useState(null)
  const [selectedCeremonyId, setSelectedCeremonyId] = useState(null)
  const [budgetPlanId, setBudgetPlanId] = useState(null)
  const [budgetPlanTitle, setBudgetPlanTitle] = useState('')
  const [ekoyiniBookingCeremonyId, setEkoyiniBookingCeremonyId] = useState(null)
  const [ekoyiniBookingCeremonyTitle, setEkoyiniBookingCeremonyTitle] = useState('')

  const goHome = () => setScreen('home')
  const goMore = () => setScreen('more')

  // Sync in-app screen navigation with browser/hardware history so the
  // Android back button (or a swipe-back gesture) moves between screens
  // instead of immediately exiting the app.
  const isPoppingRef = useRef(false)

  useEffect(() => {
    window.history.replaceState({ screen: 'home' }, '')
    const onPopState = (e) => {
      isPoppingRef.current = true
      setScreen(e.state?.screen || 'home')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (isPoppingRef.current) {
      isPoppingRef.current = false
      return
    }
    window.history.pushState({ screen }, '')
  }, [screen])

  const refreshBasketCount = () => {
    if (!accessToken) return
    fetch('/api/basket', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : { totalCases: 0 }))
      .then((data) => setBasketCount(data?.totalCases || 0))
      .catch(() => setBasketCount(0))
  }

  useEffect(() => {
    refreshBasketCount()
  }, [screen, accessToken])

  const openCeremonyType = (type) => {
    setCeremonyHubType(type)
    setScreen('ceremony')
  }

  const openTimeline = (ceremonyType) => {
    setTimelineType(ceremonyType)
    setScreen('timeline')
  }

  const openBudget = (planId, planTitle) => {
    setBudgetPlanId(planId)
    setBudgetPlanTitle(planTitle)
    setScreen('budget')
  }

  const openEkoyiniBooking = (ceremonyId, ceremonyTitle) => {
    setEkoyiniBookingCeremonyId(ceremonyId)
    setEkoyiniBookingCeremonyTitle(ceremonyTitle)
    setScreen('ekoyinibooking')
  }

  const openExistingCeremony = (ceremonyId) => {
    setSelectedCeremonyId(ceremonyId)
    setScreen('ceremony')
  }

  const [pendingApprovals, setPendingApprovals] = useState(0)

  const refreshPendingApprovals = () => {
    fetch('/api/stokvels/pending-approvals/count', { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(res => res.json())
            .then(data => setPendingApprovals(data.count || 0))
                .catch(() => {})
                }

                useEffect(() => { refreshPendingApprovals() }, [screen])

  const renderScreen = () => {
    switch (screen) {
      case 'ceremonyhub':
        return <CeremonyHub onBack={goHome} onOpenType={openCeremonyType} onSelectCeremony={openExistingCeremony} />
      case 'store':
        return <Store onGoToBasket={() => setScreen('basket')} basketCount={basketCount} />
      case 'basket':
        return <Basket onBack={() => setScreen('store')} onBasketChanged={setBasketCount} />
      case 'ceremony':
        return (
          <CeremonyPlanner
            onBack={goMore}
            defaultType={ceremonyHubType}
            onViewTimeline={openTimeline}
            onViewBudget={openBudget}
            onBookEkoyini={openEkoyiniBooking}
            selectedCeremonyId={selectedCeremonyId}
          />
        )
      case 'timeline':
        return <CeremonyTimeline ceremonyType={timelineType} onBack={() => setScreen('ceremony')} />
      case 'budget':
        return (
          <BudgetDashboard
            planId={budgetPlanId}
            planTitle={budgetPlanTitle}
            onBack={() => setScreen('ceremony')}
          />
        )
      case 'ekoyinibooking':
        return (
          <EkoyiniBooking
            ceremonyId={ekoyiniBookingCeremonyId}
            ceremonyTitle={ekoyiniBookingCeremonyTitle}
            onBack={() => setScreen('ceremony')}
          />
        )
      case 'templates':
        return <Templates onBack={goMore} />
      case 'family':
        return <FamilyContributions onBack={goMore} />
      case 'ukugida':
        return <Ukugida onBack={goMore} />
      case 'ukusoka':
        return <Ukusoka onBack={goMore} />
      case 'iziduko':
        return <IzidukoNetwork onBack={goMore} />
      case 'supplier':
        return <SupplierDashboard onBack={goMore} />
      case 'portal':
        return <Portal onBack={goMore} />
      case 'ekoyini':
        return <Ekoyini onBack={goMore} />
      case 'ekoyiniadmin':
        return <EkoyiniAdmin onBack={goMore} />
      case 'identityadmin':
        return <IdentityAdmin onBack={goMore} />
      case 'hierarchy':
        return <Hierarchy onBack={goMore} />
      case 'myorders':
        return <MyOrders onBack={goMore} />
      case 'expenditure':
        return <Expenditure onBack={goMore} />
      case 'shrinefund':
        return <ShrineFund onBack={goMore} />
      case 'legends':
        return <LegendsExplore onBack={goMore} />
      case 'directory':
        return <Directory onBack={goMore} />
      case 'umqombothi':
        return <UmqombothiCalculator onBack={goMore} />
      case 'pin':
        return <PinSetup onBack={goMore} />
      case 'stokvels':
        return <Stokvels onBack={goHome} onOpenShrineFund={() => setScreen('shrinefund')} />
      case 'notifications':                                 // ✅ NEW
        return <Notifications onBack={goHome} onNavigate={setScreen} />
      case 'activity':
        return <Activity onBack={goMore} />
      case 'account':
        return <AccountSettings onBack={goMore} onOpenPrivacy={() => setScreen('privacy')} />
      case 'help':
        return <Help onBack={goMore} />
      case 'privacy':
        return <PrivacyPolicy onBack={goMore} />
      case 'more':
        return <More onNavigate={setScreen} onBack={goHome} />
      case 'profile':
        return <Profile onNavigate={setScreen} />
      default:
        return <Dashboard onNavigate={setScreen} basketCount={basketCount} onSelectCeremony={openExistingCeremony} />
    }
  }

  const activeTab =
    screen === 'home'
      ? 'home'
      : screen === 'ceremonyhub'
        ? 'ceremonyhub'
        : screen === 'store' || screen === 'basket'
          ? 'store'
          : screen === 'stokvels'
            ? 'stokvels'
            : MORE_SCREENS.includes(screen)
              ? 'more'
              : 'home'

  return (
    <div className="icamagu-bg min-h-screen">
      {renderScreen()}
      <BottomNav
        activeScreen={activeTab}
        onNavigate={setScreen}
        basketCount={basketCount}
        pendingApprovals={pendingApprovals}
      />
    </div>
  )
}

// ---------- AuthenticatedApp (enhanced loading spinner) ----------
function AuthenticatedApp() {
  const { accessToken, user, checkingSession, debugInfo } = useAuth()
  const [onboardingComplete, setOnboardingComplete] = useState(false)

  if (checkingSession) {
    return (
      <div className="icamagu-bg flex items-center justify-center min-h-screen">
        <div className="text-center">
          <img src="/icons/source/gateway-mark-1024.png" alt="iCamagu" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-brand-black/50 font-bold text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Debugging fallback: If accessToken is null, ensure Login actually renders
  if (!accessToken) {
    return <Login />
  }

  if (!user?.username) {
    return <Username />
  }

  const onboardingDone = onboardingComplete || (user?.id && localStorage.getItem(`icamagu_onboarding_done:${user.id}`) === '1')
  if (!onboardingDone) {
    return <Onboarding onDone={() => setOnboardingComplete(true)} />
  }

  return <MainApp />
}


// ---------- App Entry ----------
export default function App() {
  const path = window.location.pathname
  const shareMatch = path.match(/^\/share\/([a-zA-Z0-9]+)$/)
  const resetMatch = path.match(/^\/reset-password\/([a-zA-Z0-9]+)$/)

  if (shareMatch) {
    return <PublicPlanView token={shareMatch[1]} />
  }

  if (resetMatch) {
    return <ResetPassword token={resetMatch[1]} />
  }

  // Ubuhlanti bakwa Xhosa is a public fund — anyone can see what it has
  // raised and pledge a donation without an iCamagu account.
  if (path === '/ubuhlanti' || path === '/ubuhlanti/') {
    return <PublicUbuhlanti />
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ToastProvider>
  )
}