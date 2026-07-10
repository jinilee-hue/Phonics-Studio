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
          <span>
            {user.name} <b>{roleLabel}</b>
          </span>
          <button onClick={() => logout().then(() => navigate('/login'))} className="app-logout">
            로그아웃
          </button>
        </div>
      </div>
    </header>
  )
}
