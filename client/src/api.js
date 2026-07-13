const API_BASE = '/api/dashboard';

/**
 * Fetch analytics data from the server.
 * If the user is logged into the main portal, their Firebase auth token
 * is automatically picked up from localStorage and included in the request.
 */
export async function fetchAnalytics() {
  const token = localStorage.getItem('ia_idToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}/analytics`, { headers });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          'Authentication required. Please log into the main portal first, then visit Crowz. ' +
          '(The analytics API requires a valid Firebase session.)'
        );
      }
      throw new Error(`Server error: ${res.status} — ${text.slice(0, 80)}`);
    }
    const data = await res.json();
    return data.analytics || data;
  } catch (err) {
    console.error('Crowz: Failed to fetch analytics:', err);
    return null;
  }
}
