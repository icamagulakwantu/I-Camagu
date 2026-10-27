import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './ui/Toast.jsx';
import { useCommunity } from '../context/CommunityContext.jsx';
import FundingSourcePicker from './FundingSourcePicker.jsx';

const money = (n) => n == null || !Number.isFinite(Number(n)) ? 'Price to confirm' : 'R' + Number(n).toFixed(2);

export default function PoolOfferCard({ cost, ceremonyId, checklistItemId, onClose, variant = 'sheet', pool: feedPool = null, onOpen }) {
  const { accessToken } = useAuth();
  const { activeCeremony, refreshPools } = useCommunity();
  const { showToast } = useToast();
  const [result, setResult] = useState({ pools: [], sku: null, demand: null, combinedOrderSuggestions: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fundingSource, setFundingSource] = useState('PERSONAL');
  const [stokvelId, setStokvelId] = useState('');
  const skuId = cost?.skuId;
  const quantity = Math.max(1, Math.ceil(Number(cost?.quantity) || 1));
  const linkedCeremonyId = ceremonyId || activeCeremony?.ceremonyId || activeCeremony?.id;

  useEffect(() => {
    if (variant === 'feed' && feedPool) { setLoading(false); return undefined; }
    let cancelled = false;
    const params = new URLSearchParams({ skuId: skuId || '', limit: '8' });
    if (linkedCeremonyId) params.set('ceremonyId', linkedCeremonyId);
    fetch('/api/basket/pool/suggestions?' + params, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not find pools'); return data; })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch((err) => { if (!cancelled) showToast(err.message, 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [skuId, linkedCeremonyId, accessToken, showToast, variant, feedPool]);

  const buy = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/basket/items', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ skuId, quantity }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not add item');
      showToast(data.message || 'Added to basket', 'success'); onClose?.();
    } catch (err) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };

  const join = async (pool) => {
    if (fundingSource === 'STOKVEL' && !stokvelId) return showToast('Choose a stokvel first', 'error');
    setBusy(true);
    try {
      const res = await fetch('/api/basket/pool/join-item', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ poolId: pool.id, skuId, quantity, ceremonyId: linkedCeremonyId || undefined, checklistItemId: checklistItemId || undefined, ceremonyCostItemId: cost?.id || undefined, fundingSource, stokvelId: fundingSource === 'STOKVEL' ? stokvelId : undefined }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not join pool');
      showToast(data.message || 'Added to pool', 'success'); await refreshPools(); onClose?.();
    } catch (err) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };

  if (variant === 'feed' && feedPool) {
    return <article className="w-full rounded-2xl border border-cream-dark bg-white p-4 text-left shadow-soft space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-bold text-ink">{feedPool.partnerName || feedPool.category} pool</h3><p className="text-xs text-ink-muted mt-1">{feedPool.distanceKm == null ? feedPool.area : feedPool.distanceKm + ' km away'} · {feedPool.participantCount} members{feedPool.deadline ? ' · Closes ' + new Date(feedPool.deadline).toLocaleDateString() : ''}</p>
        {feedPool.clanMemberCount > 0 && <p className="text-xs font-semibold text-terracotta mt-1">{feedPool.clanMemberCount} clan member{feedPool.clanMemberCount === 1 ? '' : 's'} already joined</p>}</div>
        <span className="text-xs font-bold text-ink">{feedPool.currentCases}/{feedPool.moqTarget} cases</span>
      </div>
      <div className="h-2 rounded-full bg-cream-dark overflow-hidden"><div className="h-full bg-terracotta" style={{ width: Math.min(100, feedPool.moqTarget > 0 ? feedPool.currentCases / feedPool.moqTarget * 100 : 0) + '%' }} /></div>
      <p className="text-xs text-ink-muted">{feedPool.nextTier ? 'Next tier: ' + feedPool.nextTier.name : 'Pool price awaits a real quote'}</p>
      <button type="button" onClick={onOpen} className="w-full min-h-10 rounded-full border border-terracotta text-terracotta font-bold">Browse items</button>
    </article>;
  }

  return <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-ink/55 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Pool offers">
    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-cream p-5 space-y-4">
      <div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-terracotta">SmartMatch</p><h2 className="text-xl font-display font-bold text-ink">{cost?.label || result.sku?.name || 'Pool offers'}</h2><p className="text-sm text-ink-muted">Regular app price: {money(cost?.unitCost ?? result.sku?.casePriceZAR)}</p></div><button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-full bg-white text-ink">×</button></div>
      <FundingSourcePicker value={fundingSource} onChange={(v) => { setFundingSource(v); if (v === 'PERSONAL') setStokvelId(''); }} stokvelId={stokvelId} onStokvelChange={setStokvelId} />
      {result.demand?.nearbyUpcomingCeremonies > 0 && <p className="rounded-xl bg-white p-3 text-sm text-ink">{result.demand.nearbyUpcomingCeremonies} nearby upcoming ceremonies also need this item.</p>}
      {!loading && (result.combinedOrderSuggestions || []).length > 0 && <section className="rounded-2xl border border-terracotta/30 bg-white p-4 space-y-3" aria-label="Combined bulk-buying opportunities">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-terracotta">Join forces</p>
          <h3 className="text-base font-bold text-ink mt-1">Combine demand across products</h3>
          <p className="text-sm text-ink-muted mt-1">Groups collecting different products may qualify for a stronger bulk tier when their orders can be sourced together.</p>
        </div>
        {result.combinedOrderSuggestions.slice(0, 3).map((suggestion) => <article key={suggestion.poolIds.join(':')} className="rounded-xl bg-cream p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-ink">{suggestion.area}</p>
              <p className="text-xs text-ink-muted mt-0.5">{suggestion.poolCount} open groups · {(suggestion.distinctCategories || []).join(', ') || 'Mixed products'}</p>
              <p className="text-xs text-ink-muted mt-0.5">{suggestion.supplierName ? 'Supplier: ' + suggestion.supplierName : 'Supplier not selected — outlet coordination needed'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-ink">{money(suggestion.combinedOrderValueZAR)}</p>
              <p className="text-[11px] text-ink-muted">combined value</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-terracotta">Possible savings are unconfirmed until a supplier provides a written quote for this combined order.</p>
          {suggestion.reachesThreePalletEquivalent && <p className="text-xs text-ink-muted">Indicative value is around {Number(suggestion.indicativePalletEquivalent).toFixed(2)} pallet-equivalents using a reference case price; the supplier must confirm mixed-product eligibility and the conversion.</p>}
          <p className="text-xs text-ink-muted">{suggestion.message}</p>
          <p className="text-xs text-ink-muted">This is an opportunity, not a confirmed quote or guaranteed saving. Pools and payments stay separate; each organiser must opt in before any combined order.</p>
        </article>)}
      </section>}
      {loading && <p className="text-sm text-ink-muted">Finding suitable pools…</p>}
      {!loading && !result.pools?.length && <p className="rounded-xl bg-white p-4 text-sm text-ink-muted">No suitable open pool yet. You can buy on your own now.</p>}
      {(result.pools || []).map((pool) => <article key={pool.id} className="rounded-2xl border border-cream-dark bg-white p-4 space-y-3">
        <div className="flex justify-between gap-3"><div><h3 className="font-bold text-ink">{pool.partnerName || pool.area} pool</h3><p className="text-xs text-ink-muted">{pool.distanceKm == null ? pool.area : pool.distanceKm + ' km away'} · {pool.participantCount} members{pool.deadline ? ' · Closes ' + new Date(pool.deadline).toLocaleDateString() : ''}</p>{pool.clanMemberCount > 0 && <p className="text-xs font-semibold text-terracotta">{pool.clanMemberCount} clan member{pool.clanMemberCount === 1 ? '' : 's'} already in this pool</p>}</div><span className="text-xs font-bold">{pool.currentCases}/{pool.moqTarget} cases</span></div>
        <p className="text-xs font-bold text-ink-muted">Progress to next discount tier</p>
        {pool.tierProgress != null ? <div className="h-2 rounded-full bg-cream-dark overflow-hidden"><div className="h-full bg-terracotta" style={{ width: Math.max(0, Math.min(100, pool.tierProgress)) + '%' }} /></div> : <p className="text-xs text-ink-muted">No quote-backed discount ladder is configured for this pool yet.</p>}
        <p className="text-sm text-ink">Pool price: <strong>{money(pool.poolPriceZAR)}</strong></p>
        {pool.nextTier && <p className="text-xs text-ink-muted">Next tier: {pool.nextTier.name} · {Number(pool.nextTier.remaining).toFixed(2)} {pool.nextTier.unit} remaining</p>}
        <p className="text-xs text-ink-muted">Supplier minimum: {pool.currentCases}/{pool.moqTarget} cases</p>
        <button type="button" disabled={busy || (fundingSource === 'STOKVEL' && !stokvelId)} onClick={() => join(pool)} className="w-full min-h-12 rounded-full bg-terracotta text-white font-bold disabled:opacity-50">{busy ? 'Please wait…' : 'Join pool'}</button>
      </article>)}
      <button type="button" disabled={busy} onClick={buy} className="w-full min-h-12 rounded-full border-2 border-terracotta bg-white text-ink font-bold">Buy on my own</button>
    </div>
  </div>;
}
