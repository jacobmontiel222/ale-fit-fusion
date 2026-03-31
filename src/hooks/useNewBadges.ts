import { useEffect, useRef, useState } from 'react';
import { BADGE_CATALOG } from '@/config/badgeCatalog';
import type { BadgeCatalogEntry, UserBadge } from '@/types/gamification';

const STORAGE_KEY = 'celebrated_badges_v1';

function getCelebrated(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markCelebrated(badgeId: string): void {
  try {
    const set = getCelebrated();
    set.add(badgeId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

/**
 * useNewBadges(unlockedBadges, isLoading)
 *
 * BEHAVIOR
 * ─────────
 * • While isLoading is true: does nothing. This prevents the [] → [actual data]
 *   transition from being misread as "all badges just unlocked".
 *
 * • First settled render (isLoading just went false):
 *   Compares current unlocked set against localStorage.
 *   Any badge NOT yet in localStorage is queued for celebration — including
 *   badges unlocked in past sessions (backfill, etc.) that the user has never
 *   seen celebrated.
 *
 * • Subsequent renders (data already settled):
 *   Diffs previous vs current. Only genuinely new unlocks are queued.
 *
 * • On dismissCurrent(): marks that badge in localStorage so it is never
 *   shown again, then advances the queue.
 *
 * GUARANTEE: each badge shows its celebration modal exactly once per device,
 * regardless of how many times the component re-renders or the app is reloaded.
 */
export function useNewBadges(unlockedBadges: UserBadge[], isLoading: boolean) {
  // null = not yet initialized (still loading or first render)
  const prevIdsRef = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<BadgeCatalogEntry[]>([]);

  useEffect(() => {
    // Skip until Supabase has returned real data
    if (isLoading) return;

    const currentIds = new Set(unlockedBadges.map(b => b.badgeId));
    const celebrated = getCelebrated();

    if (prevIdsRef.current === null) {
      // ── First settled render ──────────────────────────────────────────────
      // Show every badge the user has earned but hasn't seen celebrated yet.
      // This handles: backfill awards, awards from previous sessions, etc.
      const toShow: BadgeCatalogEntry[] = [];
      currentIds.forEach(id => {
        if (!celebrated.has(id)) {
          const entry = BADGE_CATALOG.find(b => b.id === id);
          if (entry) toShow.push(entry);
        }
      });
      if (toShow.length > 0) setQueue(toShow);
      prevIdsRef.current = currentIds;
      return;
    }

    // ── Subsequent renders: real-time unlock detection ────────────────────
    const newlyUnlocked: BadgeCatalogEntry[] = [];
    currentIds.forEach(id => {
      if (!prevIdsRef.current!.has(id) && !celebrated.has(id)) {
        const entry = BADGE_CATALOG.find(b => b.id === id);
        if (entry) newlyUnlocked.push(entry);
      }
    });

    if (newlyUnlocked.length > 0) {
      setQueue(prev => [...prev, ...newlyUnlocked]);
    }

    prevIdsRef.current = currentIds;
  }, [unlockedBadges, isLoading]);

  const currentBadge = queue[0] ?? null;

  function dismissCurrent() {
    if (queue[0]) markCelebrated(queue[0].id);
    setQueue(prev => prev.slice(1));
  }

  return { currentBadge, dismissCurrent };
}
