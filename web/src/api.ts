import { API_URL, DEMO } from './config';
import { mockCall } from './mock';
import type { ApiResult } from './types';

const TOKEN_KEY = 'criminals.session';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode: session lasts until reload */ }
}

/**
 * Apps Script only accepts "simple" CORS requests, so we POST JSON as text/plain.
 */
export async function call<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  const body = { action, token: getToken(), ...payload };
  if (DEMO) return mockCall(body) as Promise<ApiResult<T>>;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    return (await res.json()) as ApiResult<T>;
  } catch (e) {
    return { ok: false, error: 'network', message: String(e) };
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
