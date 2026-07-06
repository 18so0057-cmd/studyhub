import { useState, useEffect } from "react";

const STORAGE_KEY = "studyhub_points";
export const POINTS_PER_ACTION = 5;

// Module-level singleton so all hook instances share state
const listeners = new Set<(pts: number) => void>();
let current = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw !== null ? parseInt(raw, 10) : 0;
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
})();

function broadcast(next: number) {
  current = next;
  try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(next));
}

/** Call from anywhere to add points (default +5). */
export function earnPoints(amount = POINTS_PER_ACTION) {
  broadcast(current + amount);
}

/** React hook — subscribes to point updates and returns the live total. */
export function usePoints(): number {
  const [points, setPoints] = useState(current);

  useEffect(() => {
    setPoints(current); // sync in case value changed before mount
    listeners.add(setPoints);
    return () => { listeners.delete(setPoints); };
  }, []);

  return points;
}
