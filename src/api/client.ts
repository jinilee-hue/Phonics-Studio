export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (res.status === 204 ? null : await res.json()) as T
  }
  let detail = `${res.status} ${res.statusText}`
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') detail = body.detail
    else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join(', ')
  } catch {
    // 본문이 JSON이 아니면 상태 텍스트 유지
  }
  throw new ApiError(res.status, detail)
}

export const api = {
  get<T>(path: string): Promise<T> {
    return fetch(path, { credentials: 'include' }).then((r) => handle<T>(r))
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => handle<T>(r))
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return fetch(path, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handle<T>(r))
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return fetch(path, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handle<T>(r))
  },
  postForm<T>(path: string, form: FormData): Promise<T> {
    return fetch(path, { method: 'POST', credentials: 'include', body: form }).then((r) => handle<T>(r))
  },
  del<T>(path: string): Promise<T> {
    return fetch(path, { method: 'DELETE', credentials: 'include' }).then((r) => handle<T>(r))
  },
}
