const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const storage = localStorage.getItem('printly-storage');
  if (!storage) return null;
  
  try {
    const data = JSON.parse(storage);
    return data.state.token || null;
  } catch {
    return null;
  }
}
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),  
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// Auth
export const createGuestUser = (deviceId: string, name?: string) =>
  apiCall<{ token: string; userId: string; name: string; isGuest: boolean }>('/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ deviceId, name }),
  });
export const login = (email: string, password: string) =>
  apiCall<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const register = (data: { 
  name: string; 
  email: string; 
  password: string;
  guestUserId?: string | null;  
}) =>
  apiCall<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Shops
export const getShop = (shopId: string) =>
  apiCall<any>(`/shops/${shopId}`);

export const getShopPrinters = (shopId: string) =>
  apiCall<any[]>(`/shops/${shopId}/printers`);

// Files
export const getUploadUrl = (data: { fileName: string; shopId: string; printerId: string }) =>
  apiCall<{ uploadUrl: string; fileKey: string; fileName: string }>('/files/upload-url', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Jobs
export const createJob = (data: any) =>
  apiCall<{ jobNumber: string; jobId: string }>('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getJob = (jobId: string) =>
  apiCall<any>(`/jobs/${jobId}`);
export const getUserJobs = (userId: string) =>
  apiCall<any[]>(`/jobs/user/${userId}`);

