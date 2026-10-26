import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './ui/Toast.jsx';
import { useCommunity } from '../context/CommunityContext.jsx';
import FundingSourcePicker from './FundingSourcePicker.jsx';

const money = (n) => n == null || !Number.isFinite(Number(n)) ? 'Price to confirm' : 'R' + Number(n).toFixed(2);

export default function PoolOfferCard({ cost, ceremonyId, checklistItemId, onClose }) {
  const { accessToken } = useAuth();
  const { activeCeremony, refreshPools } = useCommunity();
  const { showToast } = useToast();
  const [result, setResult] = useState({ pools: [], sku: null, demand: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fundingSource, setFundingSource] = useState('PERSONAL');
  const [stokvelId, setStokvelId] = useState('');
  const skuId = cost?.skuId;
  const quantity = Math.max(1, Math.ceil(Number(cost?.quantity) || 1));
  const linkedCeremonyId = ceremonyId || activeCeremony?.ceremonyId || activeCeremony?.id;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ skuId: skuId || '', limit: '8' });
    if (linkedCeremonyId) params.set('ceremonyId', linkedCeremonyId);
    fetch('/api/basket/pool/suggestions?' + params, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not find pools'); return data; })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch((err) => { if (!cancelled) showToast(err.message, 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [skuId, linkedCeremonyId, accessToken, showToast]);

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

  return <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-ink/55 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Pool offers">
    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-cream p-5 space-y-4">
      <div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-terracotta">SmartMatch</p><h2 className="text-xl font-display font-bold text-ink">{cost?.label || result.sku?.name || 'Pool offers'}</h2><p className="text-sm text-ink-muted">Regular app price: {money(cost?.unitCost ?? result.sku?.casePriceZAR)}</p></div><button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-full bg-white text-ink">×</button></div>
      <FundingSourcePicker value={fundingSource} onChange={(v) => { setFundingSource(v); if (v === 'PERSONAL') setStokvelId(''); }} stokvelId={stokvelId} onStokvelChange={setStokvelId} />
      {result.demand?.nearbyUpcomingCeremonies > 0 && <p className="rounded-xl bg-white p-3 text-sm text-ink">{result.demand.nearbyUpcomingCeremonies} nearby upcoming ceremonies also need this item.</p>}
      {loading && <p className="text-sm text-ink-muted">Finding suitable pools…</p>}
      {!loading && !result.pools?.length && <p className="rounded-xl bg-white p-4 text-sm text-ink-muted">No suitable open pool yet. You can buy on your own now.</p>}
      {(result.pools || []).map((pool) => <article key={pool.id} className="rounded-2xl border border-cream-dark bg-white p-4 space-y-3">
        <div className="flex justify-between gap-3"><div><h3 className="font-bold text-ink">{pool.partnerName || pool.area} pool</h3><p className="text-xs text-ink-muted">{pool.distanceKm == null ? pool.area : pool.distanceKm + ' km away'} · {pool.participantCount} members{pool.deadline ? ' · Closes ' + new Date(pool.deadline).toLocaleDateString() : ''}</p>{pool.clanScore > 0 && <p className="text-xs font-semibold text-terracotta">Shared ancestral lines</p>}</div><span className="text-xs font-bold">{pool.currentCases}/{pool.moqTarget}</span></div>
        <div className="h-2 rounded-full bg-cream-dark overflow-hidden"><div className="h-full bg-terracotta" style={{ width: Math.min(100, pool.currentCases / Math.max(1, pool.moqTarget) * 100) + '%' }} /></div>
        <p className="text-sm text-ink">Pool price: <strong>{money(pool.poolPriceZAR)}</strong></p>
        {pool.nextTier && <p className="text-xs text-ink-muted">Next tier: {pool.nextTier.name} · {pool.nextTier.remaining.toFixed(2)} {pool.nextTier.unit} remaining</p>}
        <button type="button" disabled={busy || (fundingSource === 'STOKVEL' && !stokvelId)} onClick={() => join(pool)} className="w-full min-h-12 rounded-full bg-terracotta text-white font-bold disabled:opacity-50">{busy ? 'Please wait…' : 'Join pool'}</button>
      </article>)}
      <button type="button" disabled={busy} onClick={buy} className="w-full min-h-12 rounded-full border-2 border-terracotta bg-white text-ink font-bold">Buy on my own</button>
    </div>
  </div>;
}
