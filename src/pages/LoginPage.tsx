import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { User } from '../api/types'
import { DESIGN_ALL_EMAIL, DESIGN_USER, homeFor } from '../auth/auth'
import { BackgroundMusic } from '../components/BackgroundMusic'
import { CharacterSprite } from '../components/CharacterSprite'
import bgVideo from '../assets/login_bg.mp4'

const ICON_ID = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
    <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="2" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const ICON_PW = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" stroke="currentColor" strokeWidth="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const ICON_EYE = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
    <path
      d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const ICON_EYE_OFF = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
    <path
      d="M4 12s3.5-6.5 8-6.5c1.2 0 2.3.3 3.3.8M20 12s-1 1.9-2.8 3.5M9.5 9.6A3 3 0 0 0 12 15c.5 0 .9-.1 1.3-.3M4 4l16 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

type AuthView = 'signup' | 'findId' | 'findPw'
const AUTH_TITLE: Record<AuthView, string> = {
  signup: '회원가입',
  findId: '아이디 찾기',
  findPw: '비밀번호 찾기',
}

const modalInputCls =
  'h-11 w-full rounded-xl border border-[#ddd2ff] bg-[#f1ecff] px-3.5 text-sm text-[#2f264f] outline-none placeholder:text-[#a99fd0] focus:border-[#6f5bc8] focus:bg-white'

/** 경량 인증 모달 — 회원가입은 실제 API, 아이디·비밀번호 찾기는 안내. */
function AuthModal({
  mode,
  onClose,
  onSignedUp,
}: {
  mode: AuthView
  onClose: () => void
  onSignedUp: (email: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await api.post<User>('/api/auth/signup', { email, password, name })
      onSignedUp(email)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '가입에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[380px] max-w-full rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#2f264f]">{AUTH_TITLE[mode]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#a99fd0] hover:bg-[#f1ecff] hover:text-[#6f5bc8]"
          >
            ✕
          </button>
        </div>

        {mode === 'signup' ? (
          <form onSubmit={submitSignup} className="flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              required
              className={modalInputCls}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 (로그인 아이디)"
              required
              className={modalInputCls}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (8자 이상)"
              required
              minLength={8}
              className={modalInputCls}
            />
            <p className="text-xs text-[#6f6a8f]">
              가입 시 창작자 계정으로 시작합니다. 운영자 권한은 관리자가 부여합니다.
            </p>
            {err && <p className="text-sm font-semibold text-red-500">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 h-11 rounded-xl bg-[#6f5bc8] text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? '처리 중…' : '가입하기'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-[#4a4470]">
              {mode === 'findId'
                ? '가입 시 사용한 이메일이 로그인 아이디입니다. 이메일이 기억나지 않으면 운영 관리자에게 문의해 주세요.'
                : '비밀번호 재설정은 운영 관리자에게 요청해 주세요. 계정 이메일로 안내드립니다.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl bg-[#6f5bc8] text-sm font-bold text-white transition hover:brightness-110"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** 로그인 화면 — playground 로그인과 동일한 레이아웃, studio 브랜드(보라) 색상.
 * 로고 대신 PHONICS STUDIO 텍스트, 데모 우회(demo2@test.com) 로직은 studio 그대로 유지. */
export function LoginPage() {
  const [id, setId] = useState(() => localStorage.getItem('savedId') ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberId, setRememberId] = useState(() => !!localStorage.getItem('savedId'))
  const [error, setError] = useState('')
  const [fieldErr, setFieldErr] = useState<{ id?: string; password?: string }>({})
  const [busy, setBusy] = useState(false)
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [notice, setNotice] = useState('')

  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const idRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // 기본 브라우저 말풍선 대신 커스텀 검증 — 빈 칸이면 해당 필드 강조 후 포커스
    const next: { id?: string; password?: string } = {}
    if (!id.trim()) next.id = '아이디를 입력해 주세요.'
    if (!password) next.password = '비밀번호를 입력해 주세요.'
    setFieldErr(next)
    if (next.id) {
      idRef.current?.focus()
      return
    }
    if (next.password) {
      pwRef.current?.focus()
      return
    }

    const rememberSave = () => {
      if (rememberId) localStorage.setItem('savedId', id)
      else localStorage.removeItem('savedId')
    }

    // 디자인 우회: demo2 계정은 백엔드 호출 없이 전체 권한으로 통과
    if (id.trim().toLowerCase() === DESIGN_ALL_EMAIL) {
      rememberSave()
      qc.setQueryData(['me'], DESIGN_USER)
      navigate('/studio', { replace: true })
      return
    }

    setBusy(true)
    try {
      const user = await api.post<User>('/api/auth/login', { email: id, password })
      rememberSave()
      qc.setQueryData(['me'], user)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? homeFor(user.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  // 에러 시 부드러운 빨강 테두리·배경, 평상시 연보라
  const fieldCls = (hasErr: boolean) =>
    `h-12 w-full rounded-full border pl-12 text-[20px] text-[#2f264f] placeholder:text-[#a99fd0] focus:outline-none ${
      hasErr
        ? 'border-[#ff9d9d] bg-[#fff4f4] focus:border-[#ff6b6b] focus:bg-white'
        : 'border-[#ddd2ff] bg-[#f1ecff] focus:border-[#6f5bc8] focus:bg-white'
    }`

  // 필드 아래 커스텀 에러 메시지 (앱 톤 — 둥근 배지 스타일)
  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="mt-1.5 flex items-center gap-1.5 pl-3 text-[14px] font-semibold text-[#ff6b6b]">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.2" r="1.1" fill="currentColor" />
        </svg>
        {msg}
      </p>
    ) : null

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* 배경음악 — 로그인 화면에서만 재생(첫 사용자 제스처에서 시작), 페이지 이탈 시 정지 */}
      <BackgroundMusic />

      {/* 배경 (영상) */}
      <video
        src={bgVideo}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* 로그인 카드 + 하단 푸터: flex 컬럼으로 배치해 카드가 항상 푸터 위 공간에서 중앙 정렬(겹침 방지) */}
      <div className="relative z-10 flex min-h-screen flex-col p-4">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-2">
          <div className="relative w-[420px] max-w-full rounded-[20px] bg-white px-[50px] py-[clamp(2.75rem,6vh,5.5rem)] shadow-2xl">
            {/* 로고 대신 텍스트 로고 + 소개 문구 */}
            <div className="text-center">
              <h1 className="text-[clamp(2rem,5vh,3rem)] font-extrabold leading-[0.95] tracking-tight text-[#2f264f]">
                PHONICS <span className="text-[#6f5bc8]">STUDIO</span>
              </h1>
              <p className="mt-2.5 text-[15px] font-medium text-[#6f6a8f]">
                재밌는 파닉스 학습 게임을 등록하고 검수해요.
              </p>
            </div>

            {notice && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-600">
                {notice}
              </p>
            )}

            <form
              onSubmit={onSubmit}
              noValidate
              className="mt-[clamp(2rem,4.5vh,3.75rem)] flex flex-col gap-[clamp(0.75rem,2vh,1.75rem)]"
            >
              <div>
                <div className="relative">
                  <span
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${
                      fieldErr.id ? 'text-[#ff6b6b]' : 'text-[#6f5bc8]'
                    }`}
                  >
                    {ICON_ID}
                  </span>
                  <input
                    ref={idRef}
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value)
                      if (fieldErr.id) setFieldErr((p) => ({ ...p, id: undefined }))
                    }}
                    placeholder="ID"
                    aria-label="ID"
                    aria-invalid={!!fieldErr.id}
                    autoComplete="username"
                    className={`${fieldCls(!!fieldErr.id)} pr-4`}
                  />
                </div>
                <FieldError msg={fieldErr.id} />
              </div>

              <div>
                <div className="relative">
                  <span
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${
                      fieldErr.password ? 'text-[#ff6b6b]' : 'text-[#6f5bc8]'
                    }`}
                  >
                    {ICON_PW}
                  </span>
                  <input
                    ref={pwRef}
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErr.password) setFieldErr((p) => ({ ...p, password: undefined }))
                    }}
                    placeholder="Password"
                    aria-label="Password"
                    aria-invalid={!!fieldErr.password}
                    autoComplete="current-password"
                    className={`${fieldCls(!!fieldErr.password)} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[#a99fd0] transition hover:text-[#6f5bc8]"
                  >
                    {showPw ? ICON_EYE_OFF : ICON_EYE}
                  </button>
                </div>
                <FieldError msg={fieldErr.password} />
              </div>

              <label className="mt-1 flex w-fit cursor-pointer items-center gap-2 text-[16px] text-[#2f264f]">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(e) => setRememberId(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-[#ddd2ff] bg-white text-white peer-checked:border-[#6f5bc8] peer-checked:bg-[#6f5bc8]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M5 12.5l4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                아이디 저장
              </label>

              {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="mt-[clamp(0.75rem,2.2vh,2rem)] h-[60px] w-full rounded-full bg-gradient-to-b from-[#8a75e0] to-[#6f5bc8] text-[28px] font-bold tracking-wide text-white shadow-[0_6px_0_#453877,0_11px_16px_rgba(69,56,119,0.3)] transition active:translate-y-[3px] active:shadow-[0_3px_0_#453877,0_6px_10px_rgba(69,56,119,0.25)] disabled:opacity-60"
              >
                {busy ? '로그인 중…' : 'LOGIN'}
              </button>
            </form>

            {/* 회원가입 · 아이디찾기 · 비밀번호찾기 */}
            <div className="mt-[clamp(1.25rem,3vh,2.5rem)] flex items-center justify-center gap-3 text-[14px] text-[#4a4470]">
              <button type="button" className="hover:underline" onClick={() => setAuthView('signup')}>
                회원가입
              </button>
              <span className="h-3.5 w-px bg-[#ddd2ff]" />
              <button type="button" className="hover:underline" onClick={() => setAuthView('findId')}>
                아이디찾기
              </button>
              <span className="h-3.5 w-px bg-[#ddd2ff]" />
              <button type="button" className="hover:underline" onClick={() => setAuthView('findPw')}>
                비밀번호찾기
              </button>
            </div>
          </div>
        </div>

        {/* 카피라이트 — 흐름상 하단에 배치해 카드와 겹치지 않음 */}
        <div className="shrink-0 px-4 pt-3 text-center text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
          <p className="text-[12px] font-medium tracking-wide">
            COPYRIGHT © 2026 Poly Inspiration. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>

      {/* 캐릭터(스프라이트 애니메이션) — 화면 우하단, 카드 위(z-20). 데스크톱(lg+)에서만 표시 */}
      <CharacterSprite className="pointer-events-none absolute bottom-[2vw] right-[2vw] z-20 hidden aspect-[622/450] w-[clamp(300px,40vw,820px)] max-w-[calc(48vw-160px)] drop-shadow-[0_18px_14px_rgba(0,0,0,0.38)] lg:block xl:max-w-[calc(48vw-140px)]" />

      {authView && (
        <AuthModal
          mode={authView}
          onClose={() => setAuthView(null)}
          onSignedUp={(email) => {
            setAuthView(null)
            setId(email)
            setPassword('')
            setNotice('가입이 완료되었어요. 로그인해 주세요.')
          }}
        />
      )}
    </main>
  )
}
