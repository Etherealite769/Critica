// frontend/src/lib/api.ts
const BASE = 'http://127.0.0.1:8000/api'

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...(options.headers ?? {}),
    },
  })

  const data = await res.json()
  if (!res.ok) throw { ...data, status: res.status }  // ← attach status
  return data
}