import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Role } from './api/types'
import { homeFor, RequireRole, useMe } from './auth/auth'
import { TopBar } from './components/TopBar'
import { LoginPage } from './pages/LoginPage'
import { MileagePage } from './pages/MileagePage'
import { MyContentPage } from './pages/MyContentPage'
import { OpsPage } from './pages/OpsPage'
import { ResourcePage } from './pages/ResourcePage'
import { ReviewPage } from './pages/ReviewPage'
import { RubricSettingsPage } from './pages/RubricSettingsPage'
import { StatsPage } from './pages/StatsPage'
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
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/studio" element={<Protected roles={['creator']}><StudioPage /></Protected>} />
        <Route path="/studio/mine" element={<Protected roles={['creator']}><MyContentPage /></Protected>} />
        <Route path="/studio/resources" element={<Protected roles={['creator']}><ResourcePage /></Protected>} />
        <Route path="/studio/points" element={<Protected roles={['creator']}><MileagePage /></Protected>} />
        <Route path="/review" element={<Protected roles={['ops']}><ReviewPage /></Protected>} />
        <Route path="/ops" element={<Protected roles={['ops']}><OpsPage /></Protected>} />
        <Route path="/ops/settings" element={<Protected roles={['ops']}><RubricSettingsPage /></Protected>} />
        <Route path="/ops/stats" element={<Protected roles={['ops']}><StatsPage /></Protected>} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
