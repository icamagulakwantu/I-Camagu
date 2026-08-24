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
import PatternStrip from './components/PatternStrip.jsx'
import ActionCard from './components/ActionCard.jsx'
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

  return (
    <div className="px-5 pt-6 pb-28 max-w-md mx-auto">
      {/* Heritage Header Banner */}
      <div className="mb-5 rounded-soft overflow-hidden shadow-sm border border-brand-black/10 bg-white/80 backdrop-blur-md">
        <PatternStrip height="6px" variant="glow" />
        <div className="p-4">
          <DidYouKnow />
        </div>
      </div>

      {/* Greeting with Notification Bell */}
      <div className="flex items-center justify-between mb-0.5">
        <h1 className="text-2xl font-black text-brand-black">
          Molo, {user?.firstName || ''} 🌾
        </h1>
        <NotificationBell onOpen={() => onNavigate('notifications')} />  {/* ✅ NEW */}
      </div>
      <p className="text-brand-black/50 text-xs font-bold uppercase tracking-wider mb-6">
        Culture before capital.
      </p>
      <PinReminder onNavigate={onNavigate} />

      {/* Primary Grid Action Cards (same order as first file) */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <ActionCard icon="📿" onClick={() => onNavigate('ceremonyhub')}>
          <span className="font-extrabold text-sm text-brand-black block">Ceremonies</span>
          <span className="text-[10px] text-brand-black/50 font-medium block">Plan & Execute</span>
        </ActionCard>

        <ActionCard icon="🛒" badge={basketCount} onClick={() => onNavigate('store')}>
          <span className="font-extrabold text-sm text-brand-black block">Store</span>
          <span className="text-[10px] text-brand-black/50 font-medium block">Wholesale Bulk</span>
        </ActionCard>

        <ActionCard icon="🏘️" onClick={() => onNavigate('stokvels')}>
          <span className="font-extrabold text-sm text-brand-black block">Stokvels</span>
          <span className="text-[10px] text-brand-black/50 font-medium block">Group Savings</span>
        </ActionCard>

        <ActionCard icon="🎁" onClick={() => onNavigate('ukugida')}>
          <span className="font-extrabold text-sm text-brand-black block">Ukugida</span>
          <span className="text-[10px] text-brand-black/50 font-medium block">Reciprocity Ledger</span>
        </ActionCard>
      </div>

      {/* Your Ceremonies */}
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-wider text-brand-black/40 mb-2">
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
                className={`w-full text-left bg-white/90 backdrop-blur-md border-2 border-brand-black/10 rounded-soft p-3.5 shadow-sm ${pressable}`}
              >
                <p className="font-extrabold text-sm text-brand-black">{c?.title || 'Untitled Ceremony'}</p>
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
        <p className="text-xs font-black uppercase tracking-wider text-brand-black/40 mb-2">
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
                className={`w-full text-left bg-white/90 backdrop-blur-md border-2 border-brand-black/10 rounded-soft p-3.5 shadow-sm ${pressable}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-sm text-brand-black">{m?.stokvel?.name || 'Stokvel'}</p>
                    <p className="text-xs text-brand-black/50">
                      {m?.stokvel?.type ? m.stokvel.type.replace(/_/g, ' ') : ''}
                    </p>
                  </div>
                  <span className="font-black text-xs text-brand-ochre bg-brand-ochre/10 px-2.5 py-1 rounded-pill">
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
        return <AccountSettings onBack={goMore} />
      case 'help':
        return <Help onBack={goMore} />
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
          <div className="w-12 h-12 rounded-full border-4 border-brand-black/10 border-t-brand-blue animate-spin mx-auto mb-4" />
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

  return (
    <ToastProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ToastProvider>
  )
}