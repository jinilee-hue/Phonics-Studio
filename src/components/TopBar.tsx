import { NavLink, useNavigate } from 'react-router-dom'
import type { Role, User } from '../api/types'
import { isAllAccess, useLogout } from '../auth/auth'

const TABS: Record<Role, { to: string; label: string }[]> = {
  creator: [
    { to: '/studio', label: '스튜디오' },
    { to: '/studio/mine', label: '내 콘텐츠' },
    { to: '/studio/resources', label: '리소스' },
    { to: '/studio/points', label: '포인트' },
  ],
  ops: [
    { to: '/review', label: '검수' },
    { to: '/ops', label: '게시관리' },
    { to: '/ops/settings', label: '검수 규칙' },
    { to: '/ops/stats', label: '통계' },
  ],
}

const ROLE_LABEL: Record<Role, string> = { creator: '창작자', ops: '운영자' }

export function TopBar({ user }: { user: User }) {
  const navigate = useNavigate()
  const logout = useLogout()

  // 디자인 우회: 전체 권한 계정이면 창작자+운영자 탭을 모두 노출
  const tabs = isAllAccess(user) ? [...TABS.creator, ...TABS.ops] : TABS[user.role]
  const roleLabel = isAllAccess(user) ? '전체 권한' : ROLE_LABEL[user.role]

  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">
        <span className="app-brand">
          <span>
            PHONICS <b>STUDIO</b>
          </span>
        </span>
        <nav className="app-nav" aria-label="주 메뉴">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end className="app-nav-link">
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-user-menu">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgb(111_91_200_/_0.18)] bg-white/80 py-1 pl-1 pr-3 text-xs font-bold text-brand-700">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M12 13.5c-3.8 0-6.5 2.4-6.5 5.4 0 1.16.94 2.1 2.1 2.1h8.8c1.16 0 2.1-.94 2.1-2.1 0-3-2.7-5.4-6.5-5.4z" />
              </svg>
            </span>
            {user.name} <b className="font-extrabold text-brand-500">{roleLabel}</b>
          </span>
          <button
            onClick={() => logout().then(() => navigate('/login'))}
            className="app-logout inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  )
}
