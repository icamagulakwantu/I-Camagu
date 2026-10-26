import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const CommunityContext = createContext(null);

export function CommunityProvider({ children }) {
  const { accessToken, user, isAuthenticated } = useAuth();
  const [pools, setPools] = useState([])
  const [feed, setFeed] = useState({ pools: [], upcomingClanCeremonies: [], featuredLegends: [] });
  const [activeCeremony, setActiveCeremony] = useState(null);
  const [loadingPools, setLoadingPools] = useState(false);
  const [poolError, setPoolError] = useState('');

  const refreshPools = useCallback(async () => {
    if (!accessToken || !isAuthenticated) {
      setPools([]);
      setFeed({ pools: [], upcomingClanCeremonies: [], featuredLegends: [] });
      return [];
    }
    setLoadingPools(true);
    setPoolError('');
    try {
      const response = await fetch('/api/basket/pool-status/my', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not refresh SmartMatch pools');
      const rows = Array.isArray(payload) ? payload : (payload.pools || payload.orders || payload.statuses || payload.items || []);
      setPools(rows);
      try {
        const feedResponse = await fetch('/api/basket/feed', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const feedPayload = await feedResponse.json().catch(() => ({}));
        if (feedResponse.ok) setFeed({
          pools: feedPayload.pools || [],
          upcomingClanCeremonies: feedPayload.upcomingClanCeremonies || [],
          featuredLegends: feedPayload.featuredLegends || [],
        });
      } catch { /* Pool status remains useful when the community feed is unavailable. */ }
      return rows;
    } catch (error) {
      setPoolError(error.message || 'Could not refresh SmartMatch pools');
      return [];
    } finally {
      setLoadingPools(false);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    refreshPools();
  }, [refreshPools]);

  const value = useMemo(() => ({
    clanGroupId: user?.clanGroupId || null,
    clan: {
      paternal: user?.paternalIziduko || '',
      maternal: user?.maternalIziduko || '',
      paternalGrandmother: user?.paternalGrandmotherIziduko || '',
      maternalGrandmother: user?.maternalGrandmotherIziduko || '',
    },
    location: {
      label: user?.location || '',
      latitude: user?.latitude ?? null,
      longitude: user?.longitude ?? null,
    },
    activeCeremony,
    setActiveCeremony,
    pools,
    feed,
    loadingPools,
    poolError,
    refreshPools,
  }), [user, activeCeremony, pools, loadingPools, poolError, refreshPools]);

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const value = useContext(CommunityContext);
  if (!value) throw new Error('useCommunity must be used inside CommunityProvider');
  return value;
}
