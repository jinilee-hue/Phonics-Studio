import type { ReactNode } from 'react'
import type { Kind, Status } from '../api/types'

// cls: StatusCircle용(원형 색 배경) / text·line: StatusBadge용 / tint: 아이콘 색 10% 배경(icon-only 칩)
const STATUS_STYLE: Record<Status, { label: string; cls: string; text: string; line: string; tint: string }> = {
  draft: { label: '작성중', cls: 'bg-gray-100 text-gray-600', text: 'text-brand-600', line: 'decoration-brand-400', tint: 'bg-brand-500/10' },
  in_review: { label: '검수대기', cls: 'bg-amber-100 text-amber-700', text: 'text-blue-600', line: 'decoration-blue-500', tint: 'bg-blue-500/10' },
  approved: { label: '승인완료', cls: 'bg-sky-100 text-sky-700', text: 'text-emerald-600', line: 'decoration-emerald-500', tint: 'bg-emerald-500/10' },
  rejected: { label: '반려', cls: 'bg-red-100 text-red-700', text: 'text-red-700', line: 'decoration-red-500', tint: 'bg-red-500/10' },
  published: { label: 'OPEN', cls: 'bg-emerald-100 text-emerald-700', text: 'text-gray-900', line: 'decoration-gray-400', tint: 'bg-gray-800/10' },
  suspended: { label: '게시중단', cls: 'bg-orange-100 text-orange-700', text: 'text-orange-600', line: 'decoration-orange-500', tint: 'bg-orange-500/10' },
  archived: { label: '보관됨', cls: 'bg-slate-200 text-slate-600', text: 'text-slate-600', line: 'decoration-slate-400', tint: 'bg-slate-500/10' },
}

/** 상태 코드 → 한글 라벨 (StatusBadge와 상태 필터 탭이 공유) */
export const STATUS_LABEL: Record<Status, string> = {
  draft: STATUS_STYLE.draft.label,
  in_review: STATUS_STYLE.in_review.label,
  approved: STATUS_STYLE.approved.label,
  rejected: STATUS_STYLE.rejected.label,
  published: STATUS_STYLE.published.label,
  suspended: STATUS_STYLE.suspended.label,
  archived: STATUS_STYLE.archived.label,
}

/** 상태별 라인 아이콘 path(래퍼와 분리 — 크기를 사용처에서 지정) */
const STATUS_ICON_PATHS: Record<Status, ReactNode> = {
  draft: <path d="M16.5 4.5a1.9 1.9 0 0 1 2.7 2.7L8.7 17.7l-3.5 1 1-3.5L16.5 4.5z" />,
  in_review: <><circle cx="12" cy="12" r="10" /><path d="M12 7v5l3.5 2" /></>,
  approved: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
  rejected: <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>,
  published: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  suspended: <><circle cx="12" cy="12" r="10" /><line x1="10" y1="9" x2="10" y2="15" /><line x1="14" y1="9" x2="14" y2="15" /></>,
  archived: <><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></>,
}

/** 상태 아이콘 SVG — currentColor 상속. size 클래스는 사용처에서 지정 */
const StatusIc = ({ status, className }: { status: Status; className: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`${className} shrink-0`} aria-hidden="true">
    {STATUS_ICON_PATHS[status]}
  </svg>
)

export function StatusBadge({ status, iconOnly = false }: { status: Status; iconOnly?: boolean }) {
  const s = STATUS_STYLE[status]
  // 아이콘 전용 — 텍스트 없이 아이콘 색 10% 배경의 라운드 정사각 칩(아이콘 크게)
  if (iconOnly) {
    return (
      <span
        title={s.label}
        aria-label={s.label}
        className={`grid h-8 w-8 place-items-center rounded-lg ${s.tint} ${s.text}`}
      >
        <StatusIc status={status} className="h-[1.15rem] w-[1.15rem]" />
      </span>
    )
  }
  // 아이콘 + 텍스트 — 텍스트(text-xs)와 정렬되도록 아이콘 h-4
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold leading-none ${s.text}`}
    >
      <StatusIc status={status} className="h-4 w-4 translate-y-[0.5px]" />
      {s.label}
    </span>
  )
}

/** 상태 라운드박스(텍스트형) — 흰 반투명 정사각 박스 + 상태별 텍스트 색 + 2px 밑줄.
 * 썸네일 위/리스트 공용(동일 크기). 4글자 라벨은 박스 폭에 맞춰 2줄로 줄바꿈 */
export function StatusBox({
  status,
  variant = 'box',
  className = '',
}: {
  status: Status
  /** box: 흰 반투명 라운드박스(리스트용) / circle: 옅은 흰 원(썸네일 위) */
  variant?: 'box' | 'circle'
  className?: string
}) {
  const { label, text } = STATUS_STYLE[status]
  // 한글 4글자 라벨은 2+2로 줄바꿈(영문 라벨은 그대로), 3글자 이하는 한 줄
  const body =
    label.length === 4 && /[가-힣]/.test(label) ? (
      <>
        {label.slice(0, 2)}
        <br />
        {label.slice(2)}
      </>
    ) : (
      label
    )
  const shape = variant === 'circle' ? 'rounded-full bg-white/90' : 'rounded-2xl bg-white/70'
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center ${shape} px-1 text-center shadow-sm ${className}`}
    >
      <span className={`whitespace-nowrap text-xs font-bold leading-tight ${text}`}>{body}</span>
    </span>
  )
}

/** 상태별 아이콘 — 색 외에 모양으로도 구분되게 */
const STATUS_ICON: Record<Status, ReactNode> = {
  draft: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  in_review: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3 1.7" />
    </>
  ),
  approved: <polyline points="20 6 9 17 4 12" />,
  rejected: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  published: (
    <>
      <path d="M12 19V6" />
      <polyline points="6 12 12 6 18 12" />
    </>
  ),
  suspended: (
    <>
      <line x1="9" y1="6" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="18" />
    </>
  ),
  archived: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="1" />
      <path d="M3 7l1.8-3h14.4L21 7" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </>
  ),
}

/** 원형 상태 배지 — 색 + 상태별 아이콘으로 구분(라벨은 title/aria로 제공) */
export function StatusCircle({ status, className = '' }: { status: Status; className?: string }) {
  const { label, cls } = STATUS_STYLE[status]
  return (
    <span
      title={label}
      aria-label={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${cls} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        {STATUS_ICON[status]}
      </svg>
    </span>
  )
}

const KIND_LABEL: Record<Kind, string> = {
  html: 'HTML',
  zip: 'ZIP',
  video: '비디오',
  url: 'URL',
}

export function KindBadge({ kind }: { kind: Kind }) {
  return (
    <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
      {KIND_LABEL[kind]}
    </span>
  )
}

/** 형식별 라인 아이콘 — 스튜디오(콘텐츠 등록)의 IconCode/IconPackage/IconVideo/IconLink와 동일 */
const KIND_ICON: Record<Kind, ReactNode> = {
  html: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  zip: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  video: (
    <>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </>
  ),
  url: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
}

/** 타이틀 앞 형식 아이콘 — 브랜드 틴트 사각 칩 */
export function KindIcon({ kind, className = '' }: { kind: Kind; className?: string }) {
  return (
    <span
      title={KIND_LABEL[kind]}
      aria-label={KIND_LABEL[kind]}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3"
        aria-hidden="true"
      >
        {KIND_ICON[kind]}
      </svg>
    </span>
  )
}

/** AI 사용 콘텐츠 표시 배지 — 공통 규약 §4. Phonics-Playground의 ✦ AI 태그와 동일(반짝이 + AI, 인디고 파스텔) */
export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
      <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
        <path d="M12 2.2l1.9 5.9 5.9 1.9-5.9 1.9L12 17.8l-1.9-5.9L4.2 10l5.9-1.9z" fill="currentColor" />
        <path d="M19 3l.7 2.1L21.8 6l-2.1.7L19 8.8l-.7-2.1L16.2 6l2.1-.9z" fill="currentColor" />
      </svg>
      AI
    </span>
  )
}
