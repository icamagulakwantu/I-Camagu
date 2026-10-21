import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider, useToast } from './components/ui/Toast.jsx'
import { Skeleton } from './components/ui/Skeleton.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'

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
import IzidukoProfileView from './pages/IzidukoProfileView.jsx'
import IzidukoChat from './pages/IzidukoChat.jsx'
import Stokvels from './pages/Stokvels.jsx'
import Portal from './pages/Portal.jsx'
import Ekoyini from './pages/Ekoyini.jsx'
import EkoyiniAdmin from './pages/EkoyiniAdmin.jsx'
import IdentityAdmin from './pages/IdentityAdmin.jsx'
import MarginAdmin from './pages/MarginAdmin.jsx'
import DemandDashboard from './pages/DemandDashboard.jsx'
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
import Notifications from './pages/Notifications.jsx'
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
import NotificationBell from './components/NotificationBell.jsx'
import PinReminder from './components/PinReminder.jsx'
import FirstVisitExplainer from './components/FirstVisitExplainer.jsx'
import PendingStokvelJoin from './components/PendingStokvelJoin.jsx'
import { PENDING_STOKVEL_KEY } from './lib/inviteLinks.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

const MORE_SCREENS = [
  'more', 'ceremony', 'timeline', 'budget', 'ekoyinibooking',
  'templates', 'family', 'ukugida', 'ukusoka', 'iziduko',
  'izidukoprofile', 'izidukochat', 'supplier', 'portal', 'ekoyini',
  'ekoyiniadmin', 'identityadmin', 'marginadmin', 'demandadmin',
  'privacy', 'hierarchy', 'myorders', 'expenditure', 'shrinefund',
  'legends', 'directory', 'umqombothi', 'pin', 'profile',
  'notifications', 'account', 'help', 'activity',
]

// ---------- Dashboard ----------
function Dashboard({ onNavigate, basketCount = 0, onSelectCeremony }) {
  const { user, accessToken } = useAuth()
  const { showToast } = useToast()
  const [stokvels, setStokvels] = useState([])
  const [ceremonies, setCeremonies] = useState([])
  const [loadingStokvels, setLoadingStokvels] = useState(true)
  const [loadingCeremonies, setLoadingCeremonies] = useState(true)

  useEffect(() => {
    if (!accessToken) return

    setLoadingStokvels(true)
    fetch('/api/stokvels/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load stokvels'))))
      .then((data) => setStokvels(Array.isArray(data) ? data : []))
      .catch((err) => { showToast(err.message, 'error'); setStokvels([]) })
      .finally(() => setLoadingStokvels(false))

    setLoadingCeremonies(true)
    fetch('/api/ceremonies/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load ceremonies'))))
      .then((data) => setCeremonies(Array.isArray(data) ? data : []))
      .catch((err) => { showToast(err.message, 'error'); setCeremonies([]) })
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

      {/* Home hero — contextual ceremony card or generic entry point */}
      <button
        type="button"
        onClick={() => (leadCeremony?.id ? onSelectCeremony?.(leadCeremony.id) : onNavigate('ceremonyhub'))}
        className={`relative w-full text-left overflow-hidden rounded-soft mb-5 shadow-soft ${pressable}`}
      >
        <img src="/images/home-hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/10" />
        <div className="relative p-5 pt-16">
          <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-cream">
            <img src="/icons/source/gateway-mark-1024.png" alt="" className="w-4 h-4" style={{ filter: 'brightness(0) invert(1)' }} />
            Molo, {user?.firstName || 'friend'}
          </p>
          <h1 className="mt-1.5 font-display text-2xl leading-tight text-cream">
            {leadCeremony ? leadCeremony.title : 'uMntu ngumntu ngabantu.'}
          </h1>
          <div className="mt-3 flex items-center justify-between border-t border-cream/20 pt-3">
            <p className="tabular text-sm font-bold text-cream">
              {leadCeremony
                ? (leadCeremonyProgress != null ? `${leadCeremonyProgress}% prepared` : 'In progress')
                : 'Start planning your first ceremony'}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-cream flex-shrink-0">
              {leadCeremony ? 'Continue planning' : 'Get started'}
              <Icon name="arrowRight" size={16} color="#ffffff" />
            </span>
          </div>
        </div>
      </button>

      {/* Ukugida */}
      <p className="eyebrow text-ink-muted mb-2">Quick actions</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => onNavigate('ukugida')}
          className={`bg-white border-2 border-terracotta/25 rounded-soft p-4 text-left shadow-soft ${pressable}`}
        >
          <div className="w-9 h-9 rounded-xl bg-terracotta/10 flex items-center justify-center mb-2">
            <Icon name="send" size={18} color="#c45c26" />
          </div>
          <p className="font-bold text-sm text-ink">Ukugida</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Gift records & reciprocity</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('store')}
          className={`bg-white border-2 border-terracotta/25 rounded-soft p-4 text-left shadow-soft ${pressable}`}
        >
          <div className="w-9 h-9 rounded-xl bg-terracotta/10 flex items-center justify-center mb-2">
            <Icon name="cart" size={18} color="#c45c26" />
          </div>
          <p className="font-bold text-sm text-ink">SmartMatch</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Bulk alcohol, groceries & more</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('stokvels')}
          className={`bg-white border-2 border-terracotta/25 rounded-soft p-4 text-left shadow-soft ${pressable}`}
        >
          <div className="w-9 h-9 rounded-xl bg-terracotta/10 flex items-center justify-center mb-2">
            <Icon name="users" size={18} color="#c45c26" />
          </div>
          <p className="font-bold text-sm text-ink">Stokvels</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Pools & payout tracking</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('shrinefund')}
          className={`text-left rounded-soft p-4 shadow-soft ${pressable}`}
          style={{ background: 'linear-gradient(135deg, #c45c26 0%, #8c3b1a 100%)' }}
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-2">
            <Icon name="flame" size={18} color="#ffffff" strokeWidth={1.5} />
          </div>
          <p className="font-bold text-sm text-white">Ubuhlanti</p>
          <p className="text-[11px] text-white/75 mt-0.5">Community dev fund</p>
        </button>
      </div>

      {/* Stokvels strip */}
      {loadingStokvels ? (
        <Skeleton className="h-20 w-full rounded-soft mb-6" />
      ) : stokvels.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="eyebrow text-ink-muted">Your stokvels</p>
            <button type="button" onClick={() => onNavigate('stokvels')} className="text-xs font-bold text-terracotta">View all</button>
          </div>
          <div className="space-y-2">
            {stokvels.slice(0, 2).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onNavigate('stokvels')}
                className={`w-full bg-white border-2 border-terracotta/15 rounded-soft p-3.5 flex items-center justify-between gap-3 shadow-soft text-left ${pressable}`}
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-ink truncate">{s.name}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {s.memberCount || 0} member{s.memberCount !== 1 ? 's' : ''}
                    {s.totalBalance != null ? ` · R${Number(s.totalBalance).toLocaleString('en-ZA')}` : ''}
                  </p>
                </div>
                <Icon name="arrowRight" size={16} color="#8a8278" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* First-visit explainer: how-it-works + sample ceremony, shown only
          to brand-new users with no ceremonies or stokvels of their own yet.
          Gives people something to look at and tap on without needing a
          real ceremony to plan first. */}
      {!loadingStokvels && !loadingCeremonies && stokvels.length === 0 && ceremonies.length === 0 && (
        <FirstVisitExplainer onNavigate={onNavigate} />
      )}

      <DidYouKnow />
      <PinReminder onNavigate={onNavigate} />
    </div>
  )
}

// ---------- MainApp ----------
function MainApp() {
  const { accessToken } = useAuth()
  const [screen, setScreen] = useState('home')
  const [basketCount, setBasketCount] = useState(0)

  // Ceremony planning state
  const [selectedCeremonyId, setSelectedCeremonyId] = useState(null)
  const [ceremonyHubType, setCeremonyHubType] = useState(null)
  const [timelineType, setTimelineType] = useState(null)
  const [budgetPlanId, setBudgetPlanId] = useState(null)
  const [budgetPlanTitle, setBudgetPlanTitle] = useState('')
  const [ekoyiniBookingCeremonyId, setEkoyiniBookingCeremonyId] = useState(null)
  const [ekoyiniBookingCeremonyTitle, setEkoyiniBookingCeremonyTitle] = useState('')
  const [profileInitialTab, setProfileInitialTab] = useState(null)
  const [izidukoTargetUserId, setIzidukoTargetUserId] = useState(null)
  // Hierarchy: optionally pre-select a ceremony from CeremonyHub
  const [hierarchyCeremonyId, setHierarchyCeremonyId] = useState(null)

  // Basket count
  useEffect(() => {
    if (!accessToken) return
    fetch('/api/basket', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.items) setBasketCount(data.items.length) })
      .catch(() => {})
  }, [accessToken])

  const goHome = () => setScreen('home')
  const goMore = () => setScreen('more')

  const openCeremonyType = (type) => {
    setCeremonyHubType(type)
    setSelectedCeremonyId(null)
    setScreen('ceremony')
  }

  const openTimeline = (type) => {
    setTimelineType(type)
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

  const openIzidukoProfile = (userId) => {
    setIzidukoTargetUserId(userId)
    setScreen('izidukoprofile')
  }

  const openIzidukoChat = (userId) => {
    setIzidukoTargetUserId(userId)
    setScreen('izidukochat')
  }

  // Open Hierarchy, optionally with a pre-selected ceremony
  const openHierarchyForCeremony = (ceremonyId) => {
    setHierarchyCeremonyId(ceremonyId || null)
    setScreen('hierarchy')
  }

  const [pendingApprovals, setPendingApprovals] = useState(0)
  const refreshPendingApprovals = () => {
    if (!accessToken) return
    fetch('/api/stokvels/pending-approvals/count', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json())
      .then(data => setPendingApprovals(data.count || 0))
      .catch(() => {})
  }
  useEffect(() => { refreshPendingApprovals() }, [screen])

  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const refreshUnreadNotifications = () => {
    if (!accessToken) return
    fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((data) => setUnreadNotifications(data.count || 0))
      .catch(() => {})
  }
  useEffect(() => {
    refreshUnreadNotifications()
    const interval = setInterval(refreshUnreadNotifications, 30000)
    return () => clearInterval(interval)
  }, [accessToken])
  useEffect(() => { refreshUnreadNotifications() }, [screen])

  const renderScreen = () => {
    switch (screen) {
      case 'ceremonyhub':
        return (
          <CeremonyHub
            onBack={goHome}
            onOpenType={openCeremonyType}
            onSelectCeremony={openExistingCeremony}
            onGoToHierarchy={openHierarchyForCeremony}
          />
        )
      case 'store':
        return <Store onGoToBasket={() => setScreen('basket')} basketCount={basketCount} />
      case 'basket':
        return <Basket onBack={() => setScreen('store')} onBasketChanged={setBasketCount} onGoToOrders={() => setScreen('myorders')} />
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
        return <BudgetDashboard planId={budgetPlanId} planTitle={budgetPlanTitle} onBack={() => setScreen('ceremony')} />
      case 'ekoyinibooking':
        return <EkoyiniBooking ceremonyId={ekoyiniBookingCeremonyId} ceremonyTitle={ekoyiniBookingCeremonyTitle} onBack={() => setScreen('ceremony')} />
      case 'templates':
        return <Templates onBack={goMore} />
      case 'family':
        return <FamilyContributions onBack={goMore} />
      case 'ukugida':
        return <Ukugida onBack={goMore} />
      case 'ukusoka':
        return <Ukusoka onBack={goMore} />
      case 'iziduko':
        return (
          <IzidukoNetwork
            onBack={goMore}
            onGoToClanLines={() => { setProfileInitialTab('clan'); setScreen('profile') }}
            onViewProfile={openIzidukoProfile}
            onMessage={openIzidukoChat}
          />
        )
      case 'izidukoprofile':
        return <IzidukoProfileView userId={izidukoTargetUserId} onBack={() => setScreen('iziduko')} onMessage={openIzidukoChat} />
      case 'izidukochat':
        return <IzidukoChat userId={izidukoTargetUserId} onBack={() => setScreen('iziduko')} onViewProfile={openIzidukoProfile} />
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
      case 'marginadmin':
        return <MarginAdmin onBack={goMore} />
      case 'demandadmin':
        return <DemandDashboard onBack={goMore} />
      case 'hierarchy':
        return <Hierarchy onBack={goMore} initialCeremonyId={hierarchyCeremonyId} />
      case 'myorders':
        return <MyOrders onBack={() => setScreen('store')} />
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
      case 'notifications':
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
        return <Profile onNavigate={setScreen} initialTab={profileInitialTab} onConsumeInitialTab={() => setProfileInitialTab(null)} />
      default:
        return <Dashboard onNavigate={setScreen} basketCount={basketCount} onSelectCeremony={openExistingCeremony} />
    }
  }

  const activeTab =
    screen === 'home' ? 'home'
    : screen === 'ceremonyhub' ? 'ceremonyhub'
    : screen === 'store' || screen === 'basket' ? 'store'
    : screen === 'stokvels' ? 'stokvels'
    : MORE_SCREENS.includes(screen) ? 'more'
    : 'home'

  return (
    <div className="icamagu-bg min-h-screen">
      {/* Acts on a stokvel invite link the person arrived with, then shows them the stokvels */}
      <PendingStokvelJoin onJoined={() => setScreen('stokvels')} />
      {renderScreen()}
      <BottomNav
        activeScreen={activeTab}
        onNavigate={setScreen}
        basketCount={basketCount}
        pendingApprovals={pendingApprovals}
        unreadNotifications={unreadNotifications}
      />
    </div>
  )
}

// ---------- AuthenticatedApp ----------
function AuthenticatedApp() {
  const { accessToken, user, checkingSession } = useAuth()
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

  if (!accessToken) return <Login />
  if (!user?.username) return <Username />

  const onboardingDone = onboardingComplete || (user?.id && localStorage.getItem(`icamagu_onboarding_done:${user.id}`) === '1')
  if (!onboardingDone) return <Onboarding onDone={() => setOnboardingComplete(true)} />

  return <MainApp />
}

function ShareRoute() {
  const { token } = useParams()
  return <PublicPlanView token={token} />
}

function ResetPasswordRoute() {
  const { token } = useParams()
  return <ResetPassword token={token} />
}

function PoolJoinRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    if (id) localStorage.setItem('icamagu_join_pool_id', id)
    navigate('/', { replace: true })
  }, [id, navigate])
  return null
}

// A stokvel invite link: remember which stokvel, then open the app. Signed-in
// people are joined straight away; new people see the sign-in/register screen
// first and are joined as soon as they are inside.
function StokvelJoinRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    if (id) localStorage.setItem(PENDING_STOKVEL_KEY, id)
    navigate('/', { replace: true })
  }, [id, navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <Routes>
        <Route path="/share/:token" element={<ShareRoute />} />
        <Route path="/reset-password/:token" element={<ResetPasswordRoute />} />
        <Route path="/pool/:id" element={<PoolJoinRoute />} />
        <Route path="/join/stokvel/:id" element={<StokvelJoinRoute />} />
        <Route path="/ubuhlanti" element={<PublicUbuhlanti />} />
        <Route path="/ubuhlanti/" element={<PublicUbuhlanti />} />
        <Route
          path="/*"
          element={
            <ToastProvider>
              <AuthProvider>
                <AuthenticatedApp />
              </AuthProvider>
            </ToastProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
