import { useNavigate, NavLink } from 'react-router-dom'
import type { Role, User } from '../api/types'
import { useLogout } from '../auth/auth'

const TABS: Record<Role, { to: string; label: string }[]> = {
  creator: [
    { to: '/studio', label: '스튜디오' },
    { to: '/studio/mine', label: '내 콘텐츠' },
  ],
  reviewer: [{ to: '/review', label: '검수' }],
  ops: [
    { to: '/ops', label: '운영' },
    { to: '/ops/settings', label: '검수 규칙' },
  ],
}

const ROLE_LABEL: Record<Role, string> = { creator: '창작자', reviewer: '검토자', ops: '운영자' }

/** 역할별 탭/메뉴 필터 (F-18, A의 TopBar) */
export function TopBar({ user }: { user: User }) {
  const navigate = useNavigate()
  const logout = useLogout()

  return (
    <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <span className="text-lg font-extrabold tracking-tight text-brand-700">
          🎠 PHONICS <span className="text-brand-500">STUDIO</span>
        </span>
        <nav className="flex gap-1">
          {TABS[user.role].map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  isActive ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:text-brand-600'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-gray-600">
            {user.name} <span className="text-xs text-brand-500">({ROLE_LABEL[user.role]})</span>
          </span>
          <button
            onClick={() => logout().then(() => navigate('/login'))}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  )
}
