import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Role } from './api/types'
import { homeFor, RequireRole, useMe } from './auth/auth'
import { TopBar } from './components/TopBar'
import { LoginPage } from './pages/LoginPage'
import { OpsPage } from './pages/OpsPage'
import { ReviewPage } from './pages/ReviewPage'
import { StudioPage } from './pages/StudioPage'

/** 역할 가드 + TopBar 셸 (F-17/F-18) */
function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  return (
    <RequireRole roles={roles}>
      <Shell>{children}</Shell>
    </RequireRole>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { data: me } = useMe()
  if (!me) return null
  return (
    <>
      <TopBar user={me} />
      {children}
    </>
  )
}

function HomeRedirect() {
  const { data: me, isLoading } = useMe()
  if (isLoading) return null
  return <Navigate to={me ? homeFor(me.role) : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/studio" element={<Protected roles={['creator']}><StudioPage /></Protected>} />
        <Route path="/review" element={<Protected roles={['reviewer']}><ReviewPage /></Protected>} />
        <Route path="/ops" element={<Protected roles={['ops']}><OpsPage /></Protected>} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
