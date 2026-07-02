import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Role, User } from '../api/types'
import { homeFor } from '../auth/auth'

const inputCls =
  'w-full rounded-xl border border-brand-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('creator')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user =
        mode === 'login'
          ? await api.post<User>('/api/auth/login', { email, password })
          : await api.post<User>('/api/auth/signup', { email, password, name, role })
      qc.setQueryData(['me'], user)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? homeFor(user.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">🎠</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">
            PHONICS <span className="text-brand-500">STUDIO</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">파닉스 콘텐츠 등록 · 검수 · 게시</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-brand-50 p-1 text-sm font-semibold">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`rounded-lg py-1.5 ${mode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-400'}`}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" required className={inputCls} />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              required
              className={inputCls}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? '비밀번호 (8자 이상)' : '비밀번호'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              className={inputCls}
            />
            {mode === 'signup' && (
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
                <option value="creator">창작자 (콘텐츠 등록)</option>
                <option value="reviewer">검토자 (검수·승인)</option>
                <option value="ops">운영자 (게시)</option>
              </select>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}
            </button>
          </form>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-brand-200 bg-white/60 p-3 text-center text-xs text-gray-500">
          데모 계정 — creator@demo.test · reviewer@demo.test · ops@demo.test
          <br />
          비밀번호 공통: <b>demo1234</b>
        </div>
      </div>
    </div>
  )
}
