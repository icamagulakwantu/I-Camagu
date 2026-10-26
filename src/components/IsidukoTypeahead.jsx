import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function IsidukoTypeahead({ label, value, onChange, nationLabel = '', required = false, placeholder = 'Type a clan or praise name' }) {
  const { accessToken } = useAuth();
  const [result, setResult] = useState({ results: [], advice: '' });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const query = String(value || '').trim();
    if (query.length < 2 || !accessToken) {
      setResult({ results: [], advice: '' });
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        const response = await fetch('/api/iziduko/match?' + params, { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not search clan names');
        if (!cancelled) setResult(data);
      } catch {
        if (!cancelled) setResult({ results: [], advice: 'Search is temporarily unavailable. You can still submit the name for review.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [value, accessToken]);

  const submitUnknown = async () => {
    const typedText = String(value || '').trim();
    if (typedText.length < 2) return;
    setSubmitting(true);
    setNotice('');
    try {
      const response = await fetch('/api/iziduko/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ typedText, nationLabel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit for review');
      setNotice(data.message || 'Sent for community review.');
    } catch (error) {
      setNotice(error.message || 'Could not submit for review.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="space-y-2">
    <label className="block text-sm font-bold text-ink">{label}</label>
    <input
      value={value || ''}
      onChange={(event) => { onChange(event.target.value); setNotice(''); }}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full min-h-12 rounded-xl border border-cream-dark bg-white px-4 py-3 text-ink"
      aria-label={label}
      required={required}
    />
    {loading && <p className="text-xs text-ink-muted">Checking registered names…</p>}
    {result.advice && <p className="text-xs text-ink-muted">{result.advice}</p>}
    {result.results?.length > 0 && <div className="rounded-xl border border-cream-dark bg-white p-2 space-y-1" role="listbox" aria-label="Clan name suggestions">
      {result.results.map((item) => <button key={item.id} type="button" onClick={() => { onChange(item.head); setNotice(''); setResult({ results: [], advice: '' }); }} className="w-full rounded-lg p-3 text-left hover:bg-cream focus:bg-cream">
        <span className="block font-bold text-ink">{item.display}</span>
        <span className="block text-xs text-ink-muted">{item.matchedName !== item.head ? item.matchedName + ' is a registered name for ' + item.head : item.head}</span>
        {item.nation && <span className="block text-xs text-ink-muted">Nation: {item.nation}</span>}
        {item.possibleDistinct && <span className="block text-xs font-bold text-terracotta">Possible distinct spelling — please confirm carefully</span>}
        {item.fuzzy && <span className="block text-xs text-ink-muted">Suggestion only; tap to confirm</span>}
      </button>)}
    </div>}
    {String(value || '').trim().length >= 2 && <button type="button" disabled={submitting} onClick={submitUnknown} className="text-sm font-bold text-terracotta underline disabled:opacity-50">{submitting ? 'Submitting…' : 'My clan is not listed'}</button>}
    {notice && <p role="status" className="rounded-lg bg-cream p-3 text-sm text-ink">{notice}</p>}
  </div>;
}
