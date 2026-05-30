const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

export const adminApi = {
  getDashboardData: (params: Record<string, string>) =>
    request(`/api/admin/analytics/dashboard?${new URLSearchParams(params)}`),
  getRealTimeData: () =>
    request('/api/admin/analytics/realtime'),
  getUserAnalytics: (params: Record<string, string>) =>
    request(`/api/admin/analytics/users?${new URLSearchParams(params)}`),
  getContentAnalytics: (params: Record<string, string>) =>
    request(`/api/admin/analytics/content?${new URLSearchParams(params)}`),
  getRevenueAnalytics: (params: Record<string, string>) =>
    request(`/api/admin/analytics/revenue?${new URLSearchParams(params)}`),
  exportAnalyticsData: (params: Record<string, string>) =>
    request(`/api/admin/analytics/export?${new URLSearchParams(params)}`),
  getUserBehaviorAnalytics: (params: Record<string, string>) =>
    request(`/api/admin/analytics/user-behavior?${new URLSearchParams(params)}`),
  getContentPerformanceAnalytics: (params: Record<string, string>) =>
    request(`/api/admin/analytics/content-performance?${new URLSearchParams(params)}`),
  // User management
  getUsers: (params: Record<string, string>) =>
    request(`/api/admin/users?${new URLSearchParams(params)}`),
  getUser: (id: string) => request(`/api/admin/users/${id}`),
  banUser: (id: string) => request(`/api/admin/users/${id}/ban`, { method: 'POST' }),
  unbanUser: (id: string) => request(`/api/admin/users/${id}/unban`, { method: 'POST' }),
  changeUserRole: (id: string, role: string) => request(`/api/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
};
