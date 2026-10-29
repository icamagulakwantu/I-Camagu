import { lazy, Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { CommunityProvider } from './context/CommunityContext.jsx'
import { BASKET_CHANGED_EVENT } from './lib/basketEvents.js'
import { ToastProvider } from './components/ui/Toast.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'

// Components
import BottomNav from './components/BottomNav.jsx'
import Icon from './components/Icon.jsx'
import PendingStokvelJoin from './components/PendingStokvelJoin.jsx'
import PendingClanJoin from './components/PendingClanJoin.jsx'
import { PENDING_STOKVEL_KEY, PENDING_CLAN_KEY } from './lib/inviteLinks.js'

// Home is the first screen, so it is loaded straight away.
import Home from './pages/Home.jsx'

// Load feature screens on demand so first-time and returning mobile visits do not
// download every ceremony, admin, and community screen before the home screen.
const Login = lazy(() => import('./pages/Login.jsx'))
const Username = lazy(() => import('./pages/Username.jsx'))
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'))
const Store = lazy(() => import('./pages/Store.jsx'))
const Basket = lazy(() => import('./pages/Basket.jsx'))
const CeremonyHub = lazy(() => import('./pages/CeremonyHub.jsx'))
const CeremonyPlanner = lazy(() => import('./pages/CeremonyPlanner.jsx'))
const CeremonyTimeline = lazy(() => import('./pages/CeremonyTimeline.jsx'))
const Templates = lazy(() => import('./pages/Templates.jsx'))
const FamilyContributions = lazy(() => import('./pages/FamilyContributions.jsx'))
const Ukugida = lazy(() => import('./pages/Ukugida.jsx'))
const Ukusoka = lazy(() => import('./pages/Ukusoka.jsx'))
const IzidukoNetwork = lazy(() => import('./pages/IzidukoNetwork.jsx'))
const IzidukoProfileView = lazy(() => import('./pages/IzidukoProfileView.jsx'))
const IzidukoChat = lazy(() => import('./pages/IzidukoChat.jsx'))
const ClanGroups = lazy(() => import('./pages/ClanGroups.jsx'))
const Stokvels = lazy(() => import('./pages/StokvelsWithInvites.jsx'))
const Portal = lazy(() => import('./pages/Portal.jsx'))
const Ekoyini = lazy(() => import('./pages/Ekoyini.jsx'))
const EkoyiniAdmin = lazy(() => import('./pages/EkoyiniAdmin.jsx'))
const IdentityAdmin = lazy(() => import('./pages/IdentityAdmin.jsx'))
const MarginAdmin = lazy(() => import('./pages/MarginAdmin.jsx'))
const DemandDashboard = lazy(() => import('./pages/DemandDashboard.jsx'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const Hierarchy = lazy(() => import('./pages/Hierarchy.jsx'))
const MyOrders = lazy(() => import('./pages/MyOrders.jsx'))
const Expenditure = lazy(() => import('./pages/Expenditure.jsx'))
const ShrineFund = lazy(() => import('./pages/ShrineFund.jsx'))
const LegendsExplore = lazy(() => import('./pages/LegendsExplore.jsx'))
const Directory = lazy(() => import('./pages/Directory.jsx'))
const UmqombothiCalculator = lazy(() => import('./pages/UmqombothiCalculator.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const PinSetup = lazy(() => import('./pages/PinSetup.jsx'))
const PublicPlanView = lazy(() => import('./pages/PublicPlanView.jsx'))
const PublicUbuhlanti = lazy(() => import('./pages/PublicUbuhlanti.jsx'))
const More = lazy(() => import('./pages/More.jsx'))
const Activity = lazy(() => import('./pages/Activity.jsx'))
const Notifications = lazy(() => import('./pages/Notifications.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const AccountSettings = lazy(() => import('./pages/AccountSettings.jsx'))
const Help = lazy(() => import('./pages/Help.jsx'))
const BudgetDashboard = lazy(() => import('./pages/BudgetDashboard.jsx'))
const SupplierDashboard = lazy(() => import('./pages/SupplierDashboard.jsx'))
const EkoyiniBooking = lazy(() => import('./pages/EkoyiniBooking.jsx'))

const MORE_SCREENS = [
  'more', 'ceremony', 'timeline', 'budget', 'ekoyinibooking',
  'templates', 'family', 'ukugida', 'ukusoka', 'iziduko',
  'izidukoprofile', 'izidukochat', 'clangroups', 'supplier', 'portal', 'ekoyini',
  'ekoyiniadmin', 'identityadmin', 'marginadmin', 'demandadmin',
  'privacy', 'hierarchy', 'myorders', 'expenditure', 'shrinefund',
  'legends', 'directory', 'umqombothi', 'pin', 'profile',
  'notifications', 'account', 'help', 'activity',
]

// Screens that belong to one ceremony plan. They light up the Ceremonies tab.
// Ceremony tools opened from More (templates, ukugida, ...) light up More,
// because that is where their Back button returns.
const CEREMONY_SCREENS = ['ceremony', 'timeline', 'budget', 'ekoyinibooking']

const SCREEN_PATHS = {
  home: '/',
  ceremonyhub: '/ceremonies',
  ceremony: '/ceremonies/plan',
  timeline: '/ceremonies/timeline',
  store: '/smartmatch',
  basket: '/basket',
  stokvels: '/stokvels',
  more: '/me',
  profile: '/me/profile',
  iziduko: '/me/iziduko',
  clangroups: '/me/clan-groups',
  legends: '/me/legends',
  directory: '/me/directory',
  myorders: '/smartmatch/orders',
  notifications: '/me/notifications',
  account: '/me/account',
  help: '/me/help',
  privacy: '/me/privacy',
  activity: '/me/activity',
  budget: '/ceremonies/budget',
  templates: '/ceremonies/templates',
  hierarchy: '/ceremonies/hierarchy',
  family: '/ceremonies/family',
  ukugida: '/ceremonies/ukugida',
  ukusoka: '/ceremonies/ukusoka',
  umqombothi: '/me/umqombothi',
  expenditure: '/me/expenditure',
  shrinefund: '/me/ubuhlanti',
  pin: '/me/pin',
  ekoyini: '/services/ekoyini',
  ekoyinibooking: '/services/ekoyini/booking',
  supplier: '/supplier',
  portal: '/me/portal',
  identityadmin: '/admin/identity',
  marginadmin: '/admin/margins',
  demandadmin: '/admin/demand',
  ekoyiniadmin: '/admin/ekoyini',
  izidukoprofile: '/me/iziduko-profile',
  izidukochat: '/me/messages',
};

function isKnownAppPath(pathname) {
  if (pathname === '/' || Object.values(SCREEN_PATHS).includes(pathname)) return true;
  return [
    /^\/ceremonies\/[^/]+$/,
    /^\/me\/iziduko\/[^/]+$/,
    /^\/me\/messages\/[^/]+$/,
    /^\/me\/clan-groups\/[^/]+$/,
    /^\/ceremonies\/budget\/[^/]+$/,
    /^\/services\/ekoyini\/booking\/[^/]+$/,
  ].some((pattern) => pattern.test(pathname));
}

function LostPage({ onNavigate }) {
  return (
    <main className="min-h-[70vh] px-5 py-12 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-cream-dark bg-white p-6 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta/10">
          <Icon name="compass" size={28} color="#c45c26" />
        </div>
        <p className="eyebrow text-terracotta">You’re still in iCamagu</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">Let’s get you back on track</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          This page may have moved or the link may be incomplete. Choose where you’d like to go next.
        </p>
        <div className="mt-5 grid gap-2">
          <button type="button" onClick={() => onNavigate('home')} className="min-h-11 rounded-full bg-terracotta px-4 py-3 text-sm font-bold text-white">Go to Home</button>
          <button type="button" onClick={() => onNavigate('store')} className="min-h-11 rounded-full border border-terracotta px-4 py-3 text-sm font-bold text-terracotta">Browse Bulk Buy</button>
          <button type="button" onClick={() => onNavigate('ceremonyhub')} className="min-h-11 rounded-full border border-cream-dark px-4 py-3 text-sm font-bold text-ink">Open Ceremonies</button>
          <button type="button" onClick={() => onNavigate('more')} className="min-h-11 rounded-full border border-cream-dark px-4 py-3 text-sm font-bold text-ink">More help and features</button>
        </div>
      </section>
    </main>
  );
}

function screenForPath(pathname) {
  if (pathname === '/' || pathname === '') return 'home';
  if (/^\/ceremonies\/[^/]+$/.test(pathname) && !['/ceremonies/plan', '/ceremonies/timeline'].includes(pathname)) return 'ceremony';
  if (/^\/me\/iziduko\/[^/]+$/.test(pathname)) return 'izidukoprofile';
  if (/^\/me\/messages\/[^/]+$/.test(pathname)) return 'izidukochat';
  if (/^\/me\/clan-groups\/[^/]+$/.test(pathname)) return 'clangroups';
  if (/^\/ceremonies\/budget\/[^/]+$/.test(pathname)) return 'budget';
  if (/^\/services\/ekoyini\/booking\/[^/]+$/.test(pathname)) return 'ekoyinibooking';
  return Object.entries(SCREEN_PATHS).find(([, path]) => path === pathname)?.[0] || 'home';
}

// ---------- MainApp ----------
function MainApp() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [screen, setScreenState] = useState(() => screenForPath(location.pathname))
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
  // Clan group to open straight away (e.g. after joining through a link)
  const [clanGroupId, setClanGroupId] = useState(null)
  // Hierarchy: optionally pre-select a ceremony from CeremonyHub
  const [hierarchyCeremonyId, setHierarchyCeremonyId] = useState(null)

  // Keep the browser address in sync with screen navigation so refresh, share
  // and the browser back button return to a meaningful place in the app.
  const setScreen = (nextScreen) => {
    setScreenState(nextScreen)
    navigate(SCREEN_PATHS[nextScreen] || '/')
  }

  useEffect(() => {
    const path = location.pathname;
    const ceremonyMatch = path.match(/^\/ceremonies\/([^/]+)$/);
    if (ceremonyMatch && !['plan', 'timeline'].includes(ceremonyMatch[1])) {
      setSelectedCeremonyId(ceremonyMatch[1]);
      setScreenState('ceremony');
      return;
    }
    const izidukoProfileMatch = path.match(/^\/me\/iziduko\/([^/]+)$/);
    if (izidukoProfileMatch) setIzidukoTargetUserId(izidukoProfileMatch[1]);
    const izidukoChatMatch = path.match(/^\/me\/messages\/([^/]+)$/);
    if (izidukoChatMatch) setIzidukoTargetUserId(izidukoChatMatch[1]);
    const clanGroupMatch = path.match(/^\/me\/clan-groups\/([^/]+)$/);
    if (clanGroupMatch) setClanGroupId(clanGroupMatch[1]);
    const budgetMatch = path.match(/^\/ceremonies\/budget\/([^/]+)$/);
    if (budgetMatch) setBudgetPlanId(budgetMatch[1]);
    const bookingMatch = path.match(/^\/services\/ekoyini\/booking\/([^/]+)$/);
    if (bookingMatch) setEkoyiniBookingCeremonyId(bookingMatch[1]);
    setScreenState(screenForPath(path));
  }, [location.pathname])

  // Basket count stays in sync when a component outside the Basket screen adds an item.
  useEffect(() => {
    if (!accessToken) {
      setBasketCount(0)
      return undefined
    }
    let cancelled = false
    const refreshBasketCount = () => {
      fetch('/api/basket', { headers: { Authorization: `Bearer ${accessToken}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (!cancelled && data?.items) setBasketCount(data.items.length) })
        .catch(() => {})
    }
    refreshBasketCount()
    window.addEventListener(BASKET_CHANGED_EVENT, refreshBasketCount)
    return () => {
      cancelled = true
      window.removeEventListener(BASKET_CHANGED_EVENT, refreshBasketCount)
    }
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
    setScreenState('budget')
    navigate('/ceremonies/budget/' + encodeURIComponent(planId))
  }

  const openEkoyiniBooking = (ceremonyId, ceremonyTitle) => {
    setEkoyiniBookingCeremonyId(ceremonyId)
    setEkoyiniBookingCeremonyTitle(ceremonyTitle)
    setScreenState('ekoyinibooking')
    navigate('/services/ekoyini/booking/' + encodeURIComponent(ceremonyId))
  }

  const openExistingCeremony = (ceremonyId) => {
    setSelectedCeremonyId(ceremonyId)
    setScreenState('ceremony')
    navigate('/ceremonies/' + encodeURIComponent(ceremonyId))
  }

  const openIzidukoProfile = (userId) => {
    setIzidukoTargetUserId(userId)
    setScreenState('izidukoprofile')
    navigate('/me/iziduko/' + encodeURIComponent(userId))
  }

  const openIzidukoChat = (userId) => {
    setIzidukoTargetUserId(userId)
    setScreenState('izidukochat')
    navigate('/me/messages/' + encodeURIComponent(userId))
  }

  const openClanGroup = (groupId) => {
    setClanGroupId(groupId || null)
    setScreenState('clangroups')
    navigate(groupId ? '/me/clan-groups/' + encodeURIComponent(groupId) : '/me/clan-groups')
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
    if (!isKnownAppPath(location.pathname)) return <LostPage onNavigate={setScreen} />;
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
            onBack={() => setScreen('ceremonyhub')}
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
      case 'clangroups':
        return (
          <ClanGroups
            onBack={goMore}
            onGoToClanLines={() => { setProfileInitialTab('clan'); setScreen('profile') }}
            initialGroupId={clanGroupId}
            onConsumeInitialGroup={() => setClanGroupId(null)}
          />
        )
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
        return <Stokvels onBack={goHome} onNavigate={setScreen} onOpenShrineFund={() => setScreen('shrinefund')} />
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
        return <Home onNavigate={setScreen} basketCount={basketCount} onSelectCeremony={openExistingCeremony} />
    }
  }

  const activeTab =
    screen === 'home' ? 'home'
    : screen === 'ceremonyhub' || CEREMONY_SCREENS.includes(screen) ? 'ceremonyhub'
    : screen === 'store' || screen === 'basket' || screen === 'myorders' ? 'store'
    : screen === 'stokvels' ? 'stokvels'
    : MORE_SCREENS.includes(screen) ? 'more'
    : 'home'

  return (
    <div className="icamagu-bg min-h-screen">
      {/* Acts on a stokvel invite link the person arrived with, then shows them the stokvels */}
      <PendingStokvelJoin onJoined={() => setScreen('stokvels')} />
      {/* Same for a clan group invite link, e.g. one shared into a family WhatsApp group */}
      <PendingClanJoin onJoined={openClanGroup} />
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

// A clan group invite link, usually tapped from a family WhatsApp group.
// Works the same way as the stokvel link above.
function ClanJoinRoute() {
  const { code } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    if (code) localStorage.setItem(PENDING_CLAN_KEY, code)
    navigate('/', { replace: true })
  }, [code, navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <Suspense fallback={
        <div className="icamagu-bg flex min-h-screen items-center justify-center" role="status" aria-live="polite">
          <p className="text-brand-black/60 font-bold text-sm">Loading iCamagu…</p>
        </div>
      }>
      <Routes>
        <Route path="/share/:token" element={<ShareRoute />} />
        <Route path="/reset-password/:token" element={<ResetPasswordRoute />} />
        <Route path="/pool/:id" element={<PoolJoinRoute />} />
        <Route path="/join/stokvel/:id" element={<StokvelJoinRoute />} />
        <Route path="/join/clan/:code" element={<ClanJoinRoute />} />
        <Route path="/ubuhlanti" element={<PublicUbuhlanti />} />
        <Route path="/ubuhlanti/" element={<PublicUbuhlanti />} />
        <Route
          path="/*"
          element={
            <ToastProvider>
              <AuthProvider>
                <CommunityProvider>
                  <AuthenticatedApp />
                </CommunityProvider>
              </AuthProvider>
            </ToastProvider>
          }
        />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
