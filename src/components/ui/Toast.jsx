import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import Icon from '../Icon.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="fixed top-4 left-4 right-4 z-[100] max-w-sm mx-auto space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration, handleDismiss, isPaused]);

  const iconNames = {
    success: 'check',
    error: 'close',
    info: 'info',
  };

  const iconColors = {
    success: '#4a7a4a',
    error: '#c45c26',
    info: '#c1922f',
  };

  const barColors = {
    success: 'bg-sage-500',
    error: 'bg-terracotta',
    info: 'bg-brand-ochre',
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        'bg-white rounded-soft shadow-elevated border border-cream-dark p-4 flex items-center gap-3 relative overflow-hidden transform transition-all duration-300 ease-snap pointer-events-auto',
        exiting ? '-translate-y-4 opacity-0 scale-95' : 'translate-y-0 opacity-100 animate-slide-down'
      )}
    >
      <div className="w-9 h-9 rounded-pill bg-sage-50 flex items-center justify-center flex-shrink-0">
        <Icon name={iconNames[toast.type] || iconNames.info} size={18} color={iconColors[toast.type] || iconColors.info} />
      </div>

      <p className="text-sm font-bold text-ink flex-1">{toast.message}</p>

      <button
        onClick={handleDismiss}
        className="text-ink-muted hover:text-ink p-1 rounded-pill transition-colors"
        aria-label="Close toast"
      >
        <Icon name="close" size={14} />
      </button>

      {/* Pure CSS Progress Bar (Smooth 60FPS animation with hover-pause support) */}
      <div className="absolute bottom-0 left-0 h-[3px] bg-cream-dark w-full overflow-hidden">
        <div
          className={cn('h-full w-full origin-left transition-all', barColors[toast.type] || barColors.info)}
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
