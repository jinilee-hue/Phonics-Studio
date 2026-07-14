import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CharacterSprite } from '../components/CharacterSprite'
import { api } from '../api/client'
import { mockThumb } from '../api/mock'
import { EDITABLE_STATUSES } from '../api/types'
import type { AnalyzeResult, Content, ContentReview, ContentUpdate, Course, Kind, PlayContentUsage, PlayStats, SkillOption, SkillTag, Status } from '../api/types'
import { KindBadge, KindIcon, STATUS_LABEL, StatusBox } from '../components/badges'
import { PreviewModal } from '../components/PreviewModal'
import { SecurityScanPanel } from '../components/SecurityScanPanel'
import { Select } from '../components/Select'
import { SkillCoursePicker } from '../components/SkillCoursePicker'
import starIcon from '../assets/ic_star.png'

const isEditable = (c: Content) => EDITABLE_STATUSES.includes(c.status)

/** 썸네일 URL — 디자인 모드면 목 썸네일, 아니면 실제 thumb 엔드포인트(없으면 null → 그라디언트) */
const thumbSrc = (c: Content) => mockThumb(c.id) ?? (c.hasThumb ? `/api/contents/${c.id}/thumb` : null)

// ── Phonics-Playground와 동일한 지표 아이콘 ────────────────────────────────
/** 재생(플레이) — 초록 삼각형 */
function PlayIcon({ className = 'h-3 w-3' }: { className?: string }) {
  // viewBox를 삼각형에 맞게 좁혀 별 아이콘과 비슷한 크기로 보이게. 연두→녹색 그라데이션(Phonics-Playground와 동일)
  return (
    <svg viewBox="5 5 14 14" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="playGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5be584" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <path d="M9 7.4v9.2l8-4.6z" fill="url(#playGrad)" stroke="url(#playGrad)" strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
/** 별점 — ic_star.png */
function StarIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return <img src={starIcon} alt="" className={className} />
}
/** 상단 성과 요약 타일 — 라벨·수치 한 줄 */
function Kpi({
  label,
  value,
  icon,
  className = '',
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-card ${className}`}>
      {icon && <span className="grid shrink-0 place-items-center">{icon}</span>}
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 leading-tight [&>span]:whitespace-nowrap">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-base font-bold text-brand-800">{value}</span>
      </span>
    </div>
  )
}

/** 시계(최근 활동) — 면(솔리드) 시계, 회색 그라데이션 */
function ClockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="clockGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#clockGrad)" />
      <path d="M12 7v5l3.5 2" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 썸네일 없을 때 형식별 플레이스홀더(그라디언트 + 짧은 라벨) */
const KIND_THUMB_LABEL: Record<Kind, string> = { html: 'HTML', zip: 'ZIP', video: 'VID', url: 'URL' }
/** 형식 필터 셀렉트 라벨 */
const KIND_SELECT_LABEL: Record<Kind, string> = { html: 'HTML', zip: 'ZIP', video: '비디오', url: 'URL' }

/** 최근 활동 시각 — 생성·제출·게시 중 가장 최신, 최근 업데이트 정렬용 */
const lastActivityAt = (c: Content) => {
  const times = [c.createdAt, c.submittedAt, c.publishedAt].filter((x): x is string => !!x).sort()
  return times[times.length - 1] ?? c.createdAt
}
const fmtDate = (iso: string) => iso.slice(0, 10).replace(/-/g, '.')
/** 날짜 + 시간(HH:mm) */
const fmtDateTime = (iso: string) => `${iso.slice(0, 10).replace(/-/g, '.')} ${iso.slice(11, 16)}`
const KIND_THUMB_GRADIENT: Record<Kind, string> = {
  html: 'from-sky-400 to-sky-600',
  zip: 'from-violet-400 to-violet-600',
  video: 'from-amber-400 to-amber-600',
  url: 'from-pink-400 to-pink-600',
}

/** 공통 모달 셸 — 미리보기 모달과 동일한 오버레이 스타일 */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="modal-scroll flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-800">{title}</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** 리뷰 반응 태그별 색상 */
const TAG_STYLE: Record<string, string> = {
  '재밌어요!': 'bg-emerald-100 text-emerald-700',
  '또 하고 싶어요!': 'bg-brand-100 text-brand-700',
  쉬워요: 'bg-blue-100 text-blue-700',
  어려워요: 'bg-amber-100 text-amber-700',
  없어요: 'bg-gray-100 text-gray-500',
}

/** 리뷰 모달 — 아이들이 남긴 별점 + 프리셋 반응 태그. 요약(평균·태그 분포) + 목록 */
function ReviewsModal({ content, onClose }: { content: Content; onClose: () => void }) {
  const { data: reviews = [], isLoading } = useQuery<ContentReview[]>({
    queryKey: ['reviews', content.id],
    queryFn: () => api.get(`/api/contents/${content.id}/reviews`),
  })
  const total = reviews.length
  const avg = total ? reviews.reduce((a, r) => a + r.rating, 0) / total : 0

  return (
    <Modal title={`리뷰 — ${content.title}`} onClose={onClose}>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-400">불러오는 중…</p>
      ) : total === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">아직 리뷰가 없어요.</p>
      ) : (
        <>
          {/* 요약 — 평균 별점 + 반응 태그 분포 */}
          <div className="mb-4 flex items-center gap-5 rounded-xl bg-brand-50/60 p-4">
            <span className="text-3xl font-extrabold leading-none text-brand-800">{avg.toFixed(1)}</span>
            <div className="flex gap-2.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <img key={i} src={starIcon} alt="" className={`h-6 w-6 ${i < Math.round(avg) ? '' : 'opacity-20 grayscale'}`} />
              ))}
            </div>
            <span className="ml-auto text-sm text-gray-500">리뷰 {total}개</span>
          </div>

          {/* 리뷰 목록 — 닉네임 + 별점 + 반응 태그 */}
          <ul className="modal-scroll max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {reviews.map((r, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-brand-100 p-3">
                {r.avatarUrl ? (
                  <img src={r.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-11 w-11 shrink-0 rounded-full bg-brand-100" />
                )}
                <span className="shrink-0 text-sm font-semibold text-brand-800">{r.nickname}</span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-amber-500">
                  <img src={starIcon} alt="" className="h-3.5 w-3.5" />
                  {r.rating.toFixed(1)}
                </span>
                {r.tag && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TAG_STYLE[r.tag] ?? 'bg-gray-100 text-gray-600'}`}>{r.tag}</span>
                )}
                <span className="ml-auto shrink-0 text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  )
}

/** 상태 필터 탭 순서(라이프사이클 순) */
const STATUS_TABS: Status[] = ['published', 'in_review', 'approved', 'suspended', 'rejected']

/** 내 콘텐츠 목록 — 본인 콘텐츠 + 승인 전(EDITABLE_STATUSES)만 인라인 수정(J MyContentPage).
 * 편집 폼은 코스→스킬 동적 피커(SkillCoursePicker)를 쓴다. */
export function MyContentPage() {
  const { data: mine = [], refetch: refetchMine, isFetching: mineFetching } = useQuery<Content[]>({
    queryKey: ['mine'],
    queryFn: () => api.get('/api/contents/mine'),
  })
  const now = new Date()
  const p2 = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${now.getFullYear()}.${p2(now.getMonth() + 1)}.${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())}`
  const { data: skillOptions = [] } = useQuery<SkillOption[]>({
    queryKey: ['skills'],
    queryFn: () => api.get('/api/skills'),
    staleTime: 300_000,
  })
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get('/api/courses'),
    staleTime: 300_000,
  })
  // 게시 콘텐츠 성과(인기순위·별점·사용자) — 재생 통계
  const { data: play } = useQuery<PlayStats>({
    queryKey: ['stats', 'play'],
    queryFn: () => api.get('/api/stats/play'),
    staleTime: 60_000,
  })
  const [preview, setPreview] = useState<Content | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null) // 상세(게임 정보·수정) 모달을 연 콘텐츠
  const [reviewsFor, setReviewsFor] = useState<Content | null>(null) // 리뷰 목록 모달을 연 콘텐츠
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [kindFilter, setKindFilter] = useState<Kind | 'all'>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [q, setQ] = useState('') // 제목·설명 검색어
  const [sort, setSort] = useState<'recent' | 'title' | 'plays'>('recent') // 정렬 기준
  const hasFilter = filter !== 'all' || kindFilter !== 'all' || courseFilter !== 'all' || skillFilter !== 'all' || q.trim() !== ''
  const resetFilters = () => {
    setFilter('all')
    setKindFilter('all')
    setCourseFilter('all')
    setSkillFilter('all')
    setQ('')
  }

  const counts = useMemo(() => {
    const m = {} as Record<Status, number>
    for (const c of mine) m[c.status] = (m[c.status] ?? 0) + 1
    return m
  }, [mine])
  const kindsInMine = Array.from(new Set(mine.map((c) => c.kind)))
  const coursesInMine = Array.from(new Set(mine.map((c) => c.courseCode).filter((c): c is string => !!c)))
  const skillsInMine = Array.from(new Set(mine.flatMap((c) => c.skills.map((s) => s.skillCode))))
  const needle = q.trim().toLowerCase()

  // 사용량 맵(uses 내림차순 → 전체 인기 순위) — 정렬·성과에 공용
  const playUsage = useMemo(() => {
    const sorted = [...(play?.topContents ?? [])].sort((a, b) => b.uses - a.uses)
    return new Map(sorted.map((t, i) => [t.contentId, { ...t, rank: i + 1 }]))
  }, [play])

  const shown = mine
    .filter((c) => filter === 'all' || c.status === filter)
    .filter((c) => kindFilter === 'all' || c.kind === kindFilter)
    .filter((c) => courseFilter === 'all' || c.courseCode === courseFilter)
    .filter((c) => skillFilter === 'all' || c.skills.some((s) => s.skillCode === skillFilter))
    .filter(
      (c) =>
        !needle ||
        c.title.toLowerCase().includes(needle) ||
        (c.description ?? '').toLowerCase().includes(needle),
    )
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'plays') return (playUsage.get(b.id)?.uses ?? 0) - (playUsage.get(a.id)?.uses ?? 0)
      return lastActivityAt(b).localeCompare(lastActivityAt(a)) // recent(기본)
    })
  const detailContent = mine.find((c) => c.id === detailId) ?? null

  // 랭킹(성과)은 게시물이 3개 이상 쌓였을 때만 노출 — 관리 페이지 본질을 흐리지 않게
  const publishedCount = mine.filter((c) => c.status === 'published').length
  const showRanking = publishedCount >= 3
  const myPublished = mine
    .filter((c) => c.status === 'published')
    .map((c) => ({ content: c, usage: playUsage.get(c.id) }))
    .sort((a, b) => (b.usage?.uses ?? 0) - (a.usage?.uses ?? 0))
    .slice(0, 3)
  // 최근 업데이트(생성·제출·게시 최신순) 상위 3개
  const recent = [...mine].sort((a, b) => lastActivityAt(b).localeCompare(lastActivityAt(a))).slice(0, 3)

  // 전체 성과 요약(KPI) + 조치 필요 카운트
  const totalPlays = mine.reduce((s, c) => s + (playUsage.get(c.id)?.uses ?? 0), 0)
  const ratings = mine.map((c) => playUsage.get(c.id)?.ratingAvg).filter((r): r is number => r != null)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  const labelFor = useMemo(() => {
    const m = new Map(skillOptions.map((o) => [o.code, o.label]))
    return (code: string) => m.get(code) ?? code
  }, [skillOptions])

  const courseLabelFor = useMemo(() => {
    const m = new Map(courses.map((c) => [c.code, c.label]))
    return (code: string) => m.get(code) ?? code
  }, [courses])

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h2 className="text-[22px] font-bold text-brand-800">내 콘텐츠</h2>

      {/* 콘텐츠 등록 유도 배너 — 포인트 배너처럼 캐릭터 + 문구 + CTA. 스튜디오(등록 화면)로 이동 */}
      <Link
        to="/studio"
        style={{ backgroundImage: 'linear-gradient(135deg, #5b4a9e, #6f5bc8 55%, #8b7fd4)' }}
        className="group relative flex items-center gap-5 overflow-hidden rounded-2xl px-7 py-4 shadow-card transition hover:brightness-105"
      >
        {/* 알파벳 장식(파닉스 느낌) — 흰 알파벳을 크기 차이 크게, 블러로 부드럽게 흩뿌림 */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden font-extrabold leading-none text-white">
          <span className="absolute right-[6%] -top-10 rotate-[14deg] text-[11rem] opacity-[0.13] blur-[2.5px]">A</span>
          <span className="absolute right-[19%] -bottom-12 rotate-[8deg] text-[8rem] opacity-[0.11] blur-[2px]">C</span>
          <span className="absolute -right-3 bottom-1 -rotate-6 text-8xl opacity-[0.1] blur-[2px]">B</span>
          <span className="absolute right-[40%] top-2 -rotate-6 text-8xl opacity-[0.18] blur-[1.5px]">b</span>
          <span className="absolute right-[28%] top-8 rotate-[-12deg] text-6xl opacity-[0.18] blur-[1.2px]">e</span>
          <span className="absolute right-[52%] bottom-1 rotate-[10deg] text-5xl opacity-[0.16] blur-[1px]">a</span>
        </div>
        {/* 캐릭터 — 로그인 화면의 움직이는 스프라이트 + 뒤 노란 반원(돔) 배경 */}
        <div className="pointer-events-none relative z-10 hidden shrink-0 self-end sm:block">
          <span
            aria-hidden="true"
            style={{ backgroundColor: '#ffd43b' }}
            className="absolute bottom-9 left-1/2 h-40 w-60 -translate-x-1/2 rounded-t-full"
          />
          <CharacterSprite className="relative aspect-[622/450] w-72 drop-shadow-[0_10px_10px_rgba(0,0,0,0.28)]" />
        </div>
        <div className="relative z-10 min-w-0">
          <p className="text-[22px] font-semibold text-white">
            새 콘텐츠를{' '}
            <span style={{ color: '#ffd43b' }}>
              <span className="relative inline-block">
                <span aria-hidden="true" style={{ backgroundColor: '#ffd43b' }} className="absolute -top-1 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full" />
                등
              </span>
              <span className="relative inline-block">
                <span aria-hidden="true" style={{ backgroundColor: '#ffd43b' }} className="absolute -top-1 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full" />
                록
              </span>
            </span>
            해 보세요
          </p>
          <p className="mt-1 text-lg text-white/75">만든 게임을 업로드하면 검수를 거쳐 게시됩니다.</p>
        </div>
        <span className="relative z-10 ml-auto mr-6 flex shrink-0 items-stretch gap-3">
          {/* 전체 콘텐츠 등록수 */}
          <span style={{ backgroundColor: '#45c6e8' }} className="flex flex-col items-center justify-center rounded-2xl px-6 text-center text-white shadow-sm">
            <span className="text-3xl font-extrabold leading-none">{mine.length}</span>
            <span className="mt-1.5 text-xs font-medium text-white/90">전체 콘텐츠</span>
          </span>
          <span className="inline-flex flex-col items-start justify-center gap-1 rounded-2xl bg-white px-8 py-5 text-left text-lg font-bold leading-tight text-brand-700 shadow-sm">
            <span>콘텐츠</span>
            <span className="inline-flex items-center gap-1.5">
              등록하기
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </span>
        </span>
      </Link>

      {/* 조치 알림(상태별 캐릭터+건수) + 성과 요약(KPI)을 한 줄에 */}
      {mine.length > 0 && (
        <div className="flex items-stretch gap-2">
          <Kpi
            className="flex-1 min-w-0"
            label="OPEN"
            value={`${publishedCount}개`}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-gray-900" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            }
          />
          {(counts.in_review ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setFilter('in_review')}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-left shadow-card transition hover:brightness-95"
            >
              <span aria-hidden="true" className="grid shrink-0 place-items-center text-blue-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 7v5l3.5 2" />
                </svg>
              </span>
              <span className="flex flex-wrap items-baseline gap-x-1 leading-tight [&>span]:whitespace-nowrap">
                <span className="text-xs text-gray-400">검수대기</span>
                <span className="text-base font-bold text-brand-800">{counts.in_review}건</span>
              </span>
            </button>
          )}
          <Kpi
            className="flex-1 min-w-0"
            label="승인완료"
            value={`${counts.approved ?? 0}개`}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          {(counts.suspended ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setFilter('suspended')}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-left shadow-card transition hover:brightness-95"
            >
              <span aria-hidden="true" className="grid shrink-0 place-items-center text-orange-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="10" y1="9" x2="10" y2="15" />
                  <line x1="14" y1="9" x2="14" y2="15" />
                </svg>
              </span>
              <span className="flex flex-wrap items-baseline gap-x-1 leading-tight [&>span]:whitespace-nowrap">
                <span className="text-xs text-gray-400">게시중단</span>
                <span className="text-base font-bold text-brand-800">{counts.suspended}건</span>
              </span>
            </button>
          )}
          {(counts.rejected ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setFilter('rejected')}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-left shadow-card transition hover:brightness-95"
            >
              <span aria-hidden="true" className="grid shrink-0 place-items-center text-red-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15.5" y1="8.5" x2="8.5" y2="15.5" />
                  <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
                </svg>
              </span>
              <span className="flex flex-wrap items-baseline gap-x-1 leading-tight [&>span]:whitespace-nowrap">
                <span className="text-xs text-gray-400">반려</span>
                <span className="text-base font-bold text-brand-800">{counts.rejected}건</span>
              </span>
            </button>
          )}
          <Kpi
            className="flex-1 min-w-0"
            label="플레이"
            value={`${totalPlays.toLocaleString()}회`}
            icon={<PlayIcon className="h-[1.15rem] w-[1.15rem]" />}
          />
          <Kpi
            className="flex-1 min-w-0"
            label="평균 별점"
            value={avgRating != null ? avgRating.toFixed(1) : '-'}
            icon={<StarIcon className="h-[1.15rem] w-[1.15rem]" />}
          />
        </div>
      )}

      {/* 내가 만든 게임 랭킹(좌, 게시 3개 이상일 때만) + 최근 업데이트(우) */}
      <div className={`grid gap-4 ${showRanking ? 'lg:grid-cols-2' : ''}`}>
      {showRanking && (
        <section className="h-full rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-3 flex h-7 items-center">
            <h3 className="text-lg font-bold text-brand-800">내가 만든 콘텐츠 랭킹</h3>
          </div>
          <div className="space-y-3">
            {myPublished.map(({ content, usage }, i) => {
              const rank = i + 1
              return (
                <div
                  key={content.id}
                  className="flex min-h-[4.75rem] items-center gap-3 rounded-2xl border border-brand-100 p-2.5"
                >
                  {/* 순위 */}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {rank}
                  </span>
                  {/* 썸네일 */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-brand-100">
                    {thumbSrc(content) ? (
                      <img src={thumbSrc(content) as string} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${KIND_THUMB_GRADIENT[content.kind]}`}
                      >
                        <span className="text-[10px] font-extrabold text-white/90">
                          {KIND_THUMB_LABEL[content.kind]}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-brand-800" title={content.title}>
                      {content.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <PlayIcon />
                        <span className="font-bold text-gray-900">{(usage?.uses ?? 0).toLocaleString()}</span>회 플레이
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                        <StarIcon />
                        {usage?.ratingAvg != null ? usage.ratingAvg.toFixed(1) : '-'}
                      </span>
                    </div>
                  </div>
                  {/* 재생(미리보기) */}
                  <button
                    onClick={() => setPreview(content)}
                    aria-label="미리보기"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100"
                  >
                    <svg viewBox="4 4 16 16" className="h-4 w-4" aria-hidden="true">
                      <path d="M9 7.4v9.2l8-4.6z" fill="currentColor" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}
      {mine.length > 0 && (
        <section className="h-full rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-3 flex h-7 items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-brand-800">최근 업데이트 콘텐츠</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>오늘 {todayStr}</span>
              <button
                type="button"
                onClick={() => refetchMine()}
                disabled={mineFetching}
                aria-label="새로고침"
                title="새로고침"
                className="grid h-7 w-7 place-items-center rounded-lg border border-brand-200 text-brand-600 transition hover:bg-brand-50 disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-3.5 w-3.5 ${mineFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {recent.map((c) => (
              <div
                key={c.id}
                className="flex min-h-[4.75rem] items-center gap-3 rounded-2xl border border-brand-100 p-2.5"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-brand-100">
                  {thumbSrc(c) ? (
                    <img src={thumbSrc(c) as string} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${KIND_THUMB_GRADIENT[c.kind]}`}
                    >
                      <span className="text-[10px] font-extrabold text-white/90">{KIND_THUMB_LABEL[c.kind]}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-brand-800" title={c.title}>
                    {c.title}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <ClockIcon />
                    {fmtDateTime(lastActivityAt(c))}
                  </div>
                </div>
                <button
                  onClick={() => setPreview(c)}
                  aria-label="미리보기"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100"
                >
                  <svg viewBox="4 4 16 16" className="h-4 w-4" aria-hidden="true">
                    <path d="M9 7.4v9.2l8-4.6z" fill="currentColor" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>

      {/* 정렬(좌) + 상태·형식·레벨·스킬 필터·검색(우) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={sort}
          onChange={(v) => setSort(v as 'recent' | 'title' | 'plays')}
          className="shrink-0"
          options={[
            { value: 'recent', label: '최신순' },
            { value: 'title', label: '이름순' },
            { value: 'plays', label: '플레이순' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filter}
          onChange={(v) => setFilter(v as Status | 'all')}
          className="shrink-0"
          options={[
            { value: 'all', label: `전체 상태 (${mine.length})` },
            ...STATUS_TABS.map((s) => ({ value: s, label: `${STATUS_LABEL[s]} (${counts[s] ?? 0})` })),
          ]}
        />
        <Select
          value={kindFilter}
          onChange={(v) => setKindFilter(v as Kind | 'all')}
          className="shrink-0"
          options={[
            { value: 'all', label: '전체 형식' },
            ...kindsInMine.map((k) => ({ value: k, label: KIND_SELECT_LABEL[k] })),
          ]}
        />
        <Select
          value={courseFilter}
          onChange={setCourseFilter}
          className="shrink-0"
          options={[
            { value: 'all', label: '전체 레벨' },
            ...coursesInMine.map((code) => ({
              value: code,
              label: courseLabelFor(code) !== code ? `${code} · ${courseLabelFor(code)}` : code,
            })),
          ]}
        />
        <Select
          value={skillFilter}
          onChange={setSkillFilter}
          className="shrink-0"
          options={[
            { value: 'all', label: '전체 스킬' },
            ...skillsInMine.map((code) => ({ value: code, label: labelFor(code) })),
          ]}
        />
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·설명 검색"
            style={{ borderRadius: '0.5rem' }}
            className="w-full rounded-lg border border-brand-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-brand-500"
          />
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={resetFilters}
            aria-label="필터 초기화"
            title="필터 초기화"
            className="grid shrink-0 place-items-center rounded-lg border border-brand-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mine.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white p-10 text-center shadow-card">
            <p className="text-sm font-semibold text-brand-800">아직 등록한 콘텐츠가 없어요</p>
            <p className="mt-1 text-sm text-gray-400">
              상단 메뉴 <span className="font-semibold text-brand-600">콘텐츠 등록</span>에서 첫 게임을 올려보세요.
              등록하면 여기서 상태를 관리하고 검수에 제출할 수 있어요.
            </p>
          </div>
        )}
        {mine.length > 0 && shown.length === 0 && (
          <p className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            조건에 맞는 콘텐츠가 없어요. 필터를 바꾸거나 초기화해 보세요.
          </p>
        )}
        {shown.map((c) => (
          <div
            key={c.id}
            className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ${
              c.status === 'suspended' || c.status === 'rejected' ? 'opacity-70' : ''
            }`}
          >
            {/* 상단 게임 썸네일 + 상태 원 배지 오버레이 (게시중단은 그레이스케일) */}
            <div className="relative">
              {thumbSrc(c) ? (
                <img
                  src={thumbSrc(c) as string}
                  alt=""
                  className={`h-40 w-full object-cover ${c.status === 'suspended' || c.status === 'rejected' ? 'grayscale' : ''}`}
                />
              ) : (
                <div
                  className={`flex h-40 w-full items-center justify-center bg-gradient-to-br ${KIND_THUMB_GRADIENT[c.kind]} ${
                    c.status === 'suspended' || c.status === 'rejected' ? 'grayscale' : ''
                  }`}
                >
                  <span className="text-2xl font-extrabold tracking-wide text-white/90">
                    {KIND_THUMB_LABEL[c.kind]}
                  </span>
                </div>
              )}
              <StatusBox status={c.status} variant="circle" className="absolute left-3 top-3 shadow-md" />
            </div>

            {/* 본문 — flex 컬럼으로 액션 행을 카드 하단에 고정 */}
            <div className="flex flex-1 flex-col p-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <KindIcon kind={c.kind} />
                  <span className="font-semibold text-brand-800">{c.title}</span>
                  {c.courseCode && (
                    <span
                      className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
                      title={courseLabelFor(c.courseCode)}
                    >
                      {c.courseCode}
                    </span>
                  )}
                </div>
                {/* 상태별 한 줄: 게시=플레이수 / 반려=재제출 유도 */}
                {(() => {
                  const u = playUsage.get(c.id)
                  if (u)
                    return (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <PlayIcon /> <span className="font-bold text-gray-900">{u.uses.toLocaleString()}</span>회 플레이
                        </span>
                        <span className="text-gray-300">·</span>
                        <button
                          type="button"
                          onClick={() => setReviewsFor(c)}
                          className="group inline-flex items-center gap-1 font-semibold text-amber-500"
                          title="리뷰 보기"
                        >
                          <StarIcon />
                          {u.ratingAvg != null ? u.ratingAvg.toFixed(1) : '-'}
                          <span className="font-medium text-gray-600 group-hover:underline">리뷰 <b className="font-bold text-gray-900">{u.ratingCount}</b></span>
                        </button>
                      </div>
                    )
                  if (c.status === 'rejected')
                    return (
                      <span className="text-xs font-semibold text-red-500">
                        반려 사유를 콘텐츠 관리에서 확인하세요
                      </span>
                    )
                  if (c.status === 'in_review')
                    return <span className="text-xs text-amber-600">검수 진행 중이에요</span>
                  return null
                })()}
              </div>

              {/* 액션 — 미리보기 / 콘텐츠 관리(아이콘+텍스트). 수정·제출·삭제는 콘텐츠 관리 모달에서 */}
              <div className="mt-auto flex items-center gap-2 pt-3">
                <button
                  onClick={() => setPreview(c)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-200 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  미리보기
                </button>
                <button
                  onClick={() => setDetailId(c.id)}
                  style={{
                    backgroundColor: c.status === 'suspended' || c.status === 'rejected' ? '#dc2626' : '#5b4a9e',
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                  콘텐츠 관리
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && <PreviewModal content={preview} onClose={() => setPreview(null)} />}
      {reviewsFor && <ReviewsModal content={reviewsFor} onClose={() => setReviewsFor(null)} />}

      {detailContent && (
        <Modal
          title={`${isEditable(detailContent) ? '콘텐츠 수정' : '게임 정보'} — ${detailContent.title}`}
          onClose={() => setDetailId(null)}
        >
          <ContentDetail
            content={detailContent}
            usage={playUsage.get(detailContent.id)}
            onClose={() => setDetailId(null)}
          />
        </Modal>
      )}
    </main>
  )
}

/** 성과 통계 타일 — 상세 모달 내 플레이/별점/완료율 표시용 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-brand-50/60 px-3 py-2 text-center">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-brand-800">{value}</div>
    </div>
  )
}

/** 상세(게임 정보·수정) 모달 본문 — 정보와 수정을 하나로 통합.
 * 승인 전 상태(작성중·반려됨)면 "등록 화면에 기존 값이 채워진" 편집 폼 + 저장/제출,
 * 그 외엔 읽기전용 정보. 성과·반려사유·보안검사는 공통으로 함께 보여준다. */
function ContentDetail({
  content,
  usage,
  onClose,
}: {
  content: Content
  usage?: PlayContentUsage
  onClose: () => void
}) {
  const qc = useQueryClient()
  const editable = isEditable(content)

  // 편집 상태(승인 전 상태에서만 사용) — 등록 폼에 기존 값이 채워진 형태
  const [title, setTitle] = useState(content.title)
  const [description, setDescription] = useState(content.description)
  const [course, setCourse] = useState<string | null>(content.courseCode)
  const [skills, setSkills] = useState<SkillTag[]>(content.skills)
  const [usesAi, setUsesAi] = useState(content.usesAi)
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [thumbVer, setThumbVer] = useState(0) // 썸네일 교체 후 캐시 무효화용

  const hasPrimary = skills.some((s) => s.isPrimary)
  const canThumb = content.kind === 'html' || content.kind === 'zip'

  const setThumb = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData()
      fd.set('file', f)
      return api.postForm<Content>(`/api/contents/${content.id}/thumb`, fd)
    },
    onSuccess: () => {
      setThumbVer((v) => v + 1)
      qc.invalidateQueries({ queryKey: ['mine'] })
    },
  })

  const analyze = useMutation({
    mutationFn: () => api.post<AnalyzeResult>(`/api/contents/${content.id}/analyze`),
    onSuccess: (data) => {
      setAnalysis(data)
      if (data.confident) {
        const code = data.suggested.skillCode
        if (code) {
          // 제안 스킬을 주 스킬로 채택(기존 선택은 보조로 유지)
          setSkills((prev) => [
            { skillCode: code, isPrimary: true },
            ...prev.filter((s) => s.skillCode !== code).map((s) => ({ ...s, isPrimary: false })),
          ])
        }
      }
      qc.invalidateQueries({ queryKey: ['mine'] })
    },
  })

  const patchBody = (): ContentUpdate => ({
    title: title.trim(),
    description: description.trim(),
    courseCode: course ?? '',
    skills,
    usesAi,
  })

  const save = useMutation({
    mutationFn: () => api.patch<Content>(`/api/contents/${content.id}`, patchBody()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mine'] }),
  })

  // 제출/재제출 — 현재 편집 내용을 먼저 저장한 뒤 검수로 상태 전환
  const submit = useMutation({
    mutationFn: async () => {
      await api.patch<Content>(`/api/contents/${content.id}`, patchBody())
      return api.post<Content>(`/api/contents/${content.id}/submit`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mine'] })
      onClose()
    },
  })

  // 삭제 — 내용을 확인하고 상세에서만(리스트 오삭제 방지)
  const remove = useMutation({
    mutationFn: () => api.del(`/api/contents/${content.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mine'] })
      onClose()
    },
  })

  // 레벨·스킬·AI는 아래 편집 폼에서 수정하므로 상단 메타 요약엔 불변 항목만
  const meta: { label: string; value: ReactNode }[] = [
    { label: '상태', value: STATUS_LABEL[content.status] },
    { label: '형식', value: <KindBadge kind={content.kind} /> },
    { label: '등록일', value: fmtDate(content.createdAt) },
  ]

  return (
    <div className="space-y-5">
      {/* 메타 정보 — 세로형 테이블(라벨/값) */}
      <div className="overflow-hidden rounded-xl border border-brand-100">
        <table className="w-full text-sm">
          <tbody>
            {meta.map((m) => (
              <tr key={m.label} className="border-b border-brand-100 last:border-0">
                <th className="w-24 border-r border-brand-100 bg-brand-50/70 px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                  {m.label}
                </th>
                <td className="px-4 py-2.5 text-gray-700">{m.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== 편집 폼 — 모든 상태에서 수정 가능(등록 화면에 기존 값 채움) ===== */}
      <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          {canThumb && (
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand-100 bg-white">
                {mockThumb(content.id) ?? content.hasThumb ? (
                  <img
                    src={mockThumb(content.id) ?? `/api/contents/${content.id}/thumb?v=${thumbVer}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-gray-400">썸네일 없음</span>
                )}
              </div>
              <div>
                <label className="cursor-pointer rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50">
                  {content.hasThumb ? '썸네일 변경' : '썸네일 등록'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setThumb.mutate(f)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-[10px] text-gray-400">PNG·JPG·WebP·GIF · 5MB (SVG 미지원)</p>
                {setThumb.isError && (
                  <p className="mt-1 text-[10px] text-red-600">
                    {setThumb.error instanceof Error ? setThumb.error.message : '업로드 실패'}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => analyze.mutate()}
              disabled={analyze.isPending}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {analyze.isPending ? '분석 중…' : '✨ AI 자동 분석'}
            </button>
            {analysis && (
              <span className="text-xs text-gray-500">
                확신도 {(analysis.suggested.confidence * 100).toFixed(0)}%
                {analysis.confident ? ' · 스킬 자동 채움 완료' : ' · 낮아 미반영'}
              </span>
            )}
          </div>
          {analysis && (
            <div className="space-y-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
              {analysis.suggested.title && (
                <div className="flex flex-wrap items-center gap-2">
                  제안 제목: <b>{analysis.suggested.title}</b>
                  <button
                    type="button"
                    onClick={() => setTitle(analysis.suggested.title as string)}
                    className="rounded border border-indigo-300 px-2 py-0.5 font-semibold hover:bg-indigo-100"
                  >
                    제목에 적용
                  </button>
                </div>
              )}
              {analysis.warnings.map((w, i) => (
                <div key={i} className="text-amber-700">
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}
          {analyze.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              분석 실패: {analyze.error instanceof Error ? analyze.error.message : '알 수 없는 오류'}
            </p>
          )}
          <label className="block text-xs font-semibold text-gray-500">
            제목
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ borderRadius: '0.5rem' }}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal text-gray-800 outline-none focus:border-brand-500"
            />
          </label>
          <label className="block text-xs font-semibold text-gray-500">
            설명
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ borderRadius: '0.5rem' }}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal text-gray-800 outline-none focus:border-brand-500"
            />
          </label>
          <SkillCoursePicker
            skills={skills}
            onSkillsChange={setSkills}
            courseCode={course}
            onCourseChange={setCourse}
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <input
              type="checkbox"
              checked={usesAi}
              onChange={(e) => setUsesAi(e.target.checked)}
              className="accent-brand-600"
            />
            이 콘텐츠는 AI를 사용해 제작되었습니다
          </label>
      </div>

      {/* 성과 통계(게시 등 데이터가 있을 때) */}
      {usage && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-400">성과</p>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="플레이" value={`${usage.uses.toLocaleString()}회`} />
            <Stat
              label="별점"
              value={usage.ratingAvg != null ? `★ ${usage.ratingAvg.toFixed(1)} (${usage.ratingCount})` : '-'}
            />
            <Stat label="완료율" value={`${usage.uses ? Math.round((usage.completions / usage.uses) * 100) : 0}%`} />
          </div>
        </div>
      )}

      {content.status === 'rejected' && content.rejectReason && (
        <div>
          <p className="mb-1 text-xs font-semibold text-red-500">반려 사유</p>
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{content.rejectReason}</p>
        </div>
      )}

      {/* 보안 검사 — 게임 정보와 함께(zip·html만) */}
      {(content.kind === 'zip' || content.kind === 'html') && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-400">보안 검사</p>
          <SecurityScanPanel content={content} />
        </div>
      )}

      {/* 액션 — 삭제 / 저장(모든 상태 수정) / 제출·재제출(승인 전만) */}
      <div className="space-y-1.5 border-t border-brand-100 pt-4">
        {(save.isError || submit.isError || remove.isError) && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            처리에 실패했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('삭제하면 되돌릴 수 없어요. 삭제할까요?')) remove.mutate()
              }}
              disabled={remove.isPending}
              style={{ backgroundColor: '#4b5563' }}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {remove.isPending ? '삭제 중…' : '삭제'}
            </button>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending || submit.isPending || !title.trim() || !hasPrimary}
              className="flex-1 rounded-lg border border-brand-300 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
            >
              {save.isPending ? '저장 중…' : '저장'}
            </button>
            {editable && (
              <button
                type="button"
                onClick={() => submit.mutate()}
                disabled={submit.isPending || save.isPending || !title.trim() || !hasPrimary}
                style={{ backgroundColor: '#5b4a9e' }}
                className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
              >
                {submit.isPending ? '제출 중…' : content.status === 'rejected' ? '재제출' : '제출'}
              </button>
            )}
          </div>
          {!hasPrimary && (
            <p className="text-xs text-gray-400">주 스킬(★) 1개를 지정해야 저장·제출할 수 있어요.</p>
          )}
        </div>
    </div>
  )
}
