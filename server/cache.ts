// server/cache.ts

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const MAX_ENTRIES = 500;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

const store = new Map<string, CacheEntry<any>>();

// ── Limpieza periódica de entradas expiradas ──
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    let deleted = 0;
    for (const [key, entry] of Array.from(store.entries())) {
      if (now > entry.expiresAt) {
        store.delete(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      console.log(`[cache] Cleanup: removed ${deleted} expired entries (${store.size} remaining)`);
    }
  }, CLEANUP_INTERVAL_MS);
  // Permitir que el proceso termine aunque el timer esté activo
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

startCleanup();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number = 60000): void {
  // Si estamos en el límite, eliminar la entrada más antigua (primera del Map)
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    store.clear();
    return;
  }
  // Soporte para patrones más precisos: trata pattern como substring o regex
  for (const key of Array.from(store.keys())) {
    if (key.includes(pattern) || key.match(pattern)) {
      store.delete(key);
    }
  }
}

export function getCacheSize(): number {
  return store.size;
}
