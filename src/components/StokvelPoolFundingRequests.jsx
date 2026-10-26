import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function StokvelPoolFundingRequests() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/stokvels/my', { headers: { Authorization: `Bearer ${accessToken}` } });
      const stokvels = await response.json();
      if (!response.ok || !Array.isArray(stokvels)) throw new Error('Could not load your stokvels');
      const results = await Promise.all(stokvels.map(async (membership) => {
        const stokvel = membership.stokvel || membership;
        if (!stokvel?.id) return [];
        const res = await fetch(`/api/stokvels/${stokvel.id}/pool-funding`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.requests || []).map((request) => ({ ...request, stokvelName: stokvel.name, canDecide: data.canDecide, currentOfficialId: data.currentOfficialId }));
      }));
      setRequests(results.flat());
    } catch (err) { setError(err.message || 'Could not load funding requests'); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const decide = async (request, decision) => {
    setBusyId(request.id);
    try {
      const response = await fetch(`/api/stokvels/${request.stokvelId}/pool-funding/${request.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not record decision');
      await load();
    } catch (err) { setError(err.message || 'Could not record decision'); }
    finally { setBusyId(null); }
  };

  if (loading) return <section className="mx-4 my-4 rounded-2xl bg-white p-4 text-sm text-ink-muted">Loading stokvel funding requests…</section>;
  const pending = requests.filter((request) => request.status === 'PENDING_APPROVAL');
  if (!pending.length && !error) return null;

  return <section className="mx-4 my-4 rounded-2xl border border-cream-dark bg-white p-4 space-y-3">
    <div><h2 className="font-display text-lg font-bold text-ink">Funding requests</h2><p className="text-sm text-ink-muted">Pool orders paid by a stokvel need two or more officials to approve.</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {pending.map((request) => {
      const approved = request.approvals?.filter((item) => item.decision === 'APPROVE').length || 0;
      const alreadyVoted = request.approvals?.some((item) => item.officialId === request.currentOfficialId);
      return <article key={request.id} className="rounded-xl bg-cream p-3 space-y-2">
        <div className="flex justify-between gap-3"><div><p className="font-bold text-ink">{request.stokvelName} · {request.pool?.area || 'SmartMatch pool'}</p><p className="text-xs text-ink-muted">Requested by {request.requestedBy?.firstName || 'member'} · {approved}/{request.requiredApprovals} approvals</p></div><strong className="text-ink">R{Number(request.amountZAR).toFixed(2)}</strong></div>
        {request.basket?.items?.map((item) => <p key={item.id} className="text-xs text-ink-muted">{item.sku?.name} × {item.quantity}</p>)}
        {request.canDecide && request.requestedBy?.id !== request.currentOfficialId && !alreadyVoted && <div className="flex gap-2"><button type="button" disabled={busyId === request.id} onClick={() => decide(request, 'APPROVE')} className="flex-1 min-h-11 rounded-full bg-terracotta text-white font-bold disabled:opacity-50">Approve</button><button type="button" disabled={busyId === request.id} onClick={() => decide(request, 'DECLINE')} className="flex-1 min-h-11 rounded-full border border-cream-dark bg-white text-ink font-bold disabled:opacity-50">Decline</button></div>}
        <p className="text-xs text-ink-muted">Approval authorizes the spend; supplier settlement is still a separate step.</p>
      </article>;
    })}
  </section>;
}
