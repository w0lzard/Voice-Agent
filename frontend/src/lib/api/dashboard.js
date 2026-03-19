import { API_BASE, getAuthHeaders } from '@/lib/api';

export async function getDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/v1/stats`, {
      cache: 'no-store',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('stats fetch failed');
    return res.json();
  } catch {
    return { ok: false };
  }
}

export async function getCallAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/v1/metrics`, {
      cache: 'no-store',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('metrics fetch failed');
    return res.json();
  } catch {
    return { ok: false };
  }
}
