import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function FundingSourcePicker({ value, onChange, stokvelId, onStokvelChange }) {
  const { accessToken } = useAuth();
  const [stokvels, setStokvels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value !== 'STOKVEL' || !accessToken) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/stokvels/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load your stokvels');
        const rows = Array.isArray(data) ? data : (data.stokvels || data.items || []);
        const groups = rows.map((row) => ({ ...(row.stokvel || row), availablePoolFundingBalance: row.availablePoolFundingBalance })).filter((item) => item?.id);
        if (!cancelled) {
          setStokvels(groups.filter((item) => {
            const available = item.availablePoolFundingBalance ?? (Number(item.groupLedger?.totalBalance ?? item.availableBalance ?? 0) - Number(item.groupLedger?.groupExpenses ?? 0));
            return Number(available) > 0;
          }));
        }
      })
      .catch(() => { if (!cancelled) setStokvels([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [value, accessToken]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-bold text-ink mb-2">How will you pay?</legend>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onChange('PERSONAL')} className={`rounded-xl border-2 p-3 text-sm font-bold ${value === 'PERSONAL' ? 'border-terracotta bg-terracotta/10 text-ink' : 'border-cream-dark bg-white text-ink-muted'}`}>
          I'll pay
        </button>
        <button type="button" onClick={() => onChange('STOKVEL')} className={`rounded-xl border-2 p-3 text-sm font-bold ${value === 'STOKVEL' ? 'border-terracotta bg-terracotta/10 text-ink' : 'border-cream-dark bg-white text-ink-muted'}`}>
          Use my stokvel
        </button>
      </div>
      {value === 'STOKVEL' && (
        <div className="space-y-2">
          {loading ? <p className="text-sm text-ink-muted">Loading stokvel balances…</p> : null}
          {!loading && stokvels.length === 0 ? (
            <p className="rounded-xl bg-cream p-3 text-sm text-ink-muted">No stokvel with available funds was found. You can pay personally or check your stokvel balance.</p>
          ) : null}
          {stokvels.length > 0 && (
            <select value={stokvelId || ''} onChange={(event) => onStokvelChange(event.target.value)} className="w-full rounded-xl border border-cream-dark bg-white p-3 text-sm text-ink" required>
              <option value="">Choose a stokvel</option>
              {stokvels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · available R{Math.max(0, Number(item.availablePoolFundingBalance ?? (Number(item.groupLedger?.totalBalance ?? item.availableBalance ?? 0) - Number(item.groupLedger?.groupExpenses ?? 0)))).toFixed(2)}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-ink-muted">Two or more stokvel officials must approve. Approval does not mean the supplier has been paid yet.</p>
        </div>
      )}
    </fieldset>
  );
}
