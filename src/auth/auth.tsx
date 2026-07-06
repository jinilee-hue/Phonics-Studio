import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Role, User } from '../api/types'

export function useMe() {
  return useQuery<User | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.get<User>('/api/auth/me')
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }
    },
    staleTime: 60_000,
    retry: false,
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return async () => {
    await api.post('/api/auth/logout')
    qc.setQueryData(['me'], null)
    qc.clear()
  }
}

/** 역할별 홈 라우트 (F-18) */
export function homeFor(role: Role): string {
  return { creator: '/studio', reviewer: '/review', ops: '/ops' }[role]
}

function CenterNotice({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[800px] items-center justify-center text-brand-600">{children}</div>
}

/** 라우터 가드(F-15/F-18) — 프런트 이중 방어. 판정은 항상 서버가 한다. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { data: me, isLoading } = useMe()
  const location = useLocation()

  if (isLoading) return <CenterNotice>불러오는 중…</CenterNotice>
  if (!me) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!roles.includes(me.role)) return <Navigate to={homeFor(me.role)} replace />
  return <>{children}</>
}
