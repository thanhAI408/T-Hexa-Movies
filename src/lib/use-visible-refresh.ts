'use client';
import { useEffect, useRef } from 'react';

/** Poll only while visible and online, and catch up after returning to a stale tab. */
export function useVisibleRefresh(refresh: () => void, intervalMs: number, enabled = true) {
  const callback = useRef(refresh);
  useEffect(() => { callback.current = refresh; }, [refresh]);
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    function check() {
      if (document.visibilityState !== 'visible' || !navigator.onLine || Date.now() - last < intervalMs) return;
      last = Date.now();
      callback.current();
    }
    const timer = window.setInterval(check, intervalMs);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
      window.removeEventListener('focus', check);
    };
  }, [intervalMs, enabled]);
}
