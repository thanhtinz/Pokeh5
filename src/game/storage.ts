import { Capacitor } from '@capacitor/core';

/**
 * Saves live in localStorage because it is synchronous — the game can flush on
 * `pagehide` without racing the process being killed. On a real device that
 * store can be evicted under storage pressure, so a native mirror is written in
 * the background and is preferred when it holds a newer copy.
 */
const isNative = Capacitor.isNativePlatform();

let nativeApi: typeof import('@capacitor/preferences').Preferences | null = null;
let nativeReady: Promise<void> | null = null;

async function loadNative(): Promise<void> {
  if (!isNative || nativeApi) return;
  try {
    const module = await import('@capacitor/preferences');
    nativeApi = module.Preferences;
  } catch {
    nativeApi = null;
  }
}

function ensureNative(): Promise<void> {
  nativeReady ??= loadNative();
  return nativeReady;
}

export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // A blocked storage API is not worth crashing over.
  }
}

/** Best-effort durable copy. Never throws; the local copy is the source of truth. */
export async function mirrorNative(key: string, value: string): Promise<void> {
  if (!isNative) return;
  await ensureNative();
  try {
    await nativeApi?.set({ key, value });
  } catch {
    // Ignored on purpose — losing the mirror only costs durability.
  }
}

export async function readNative(key: string): Promise<string | null> {
  if (!isNative) return null;
  await ensureNative();
  try {
    const result = await nativeApi?.get({ key });
    return result?.value ?? null;
  } catch {
    return null;
  }
}

export { isNative };
