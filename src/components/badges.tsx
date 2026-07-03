import type { Kind, Status } from '../api/types'

const STATUS_STYLE: Record<Status, { label: string; cls: string }> = {
  draft: { label: '작성 중', cls: 'bg-gray-100 text-gray-600' },
  in_review: { label: '검수 대기', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인됨', cls: 'bg-sky-100 text-sky-700' },
  rejected: { label: '반려됨', cls: 'bg-red-100 text-red-700' },
  published: { label: '게시됨', cls: 'bg-emerald-100 text-emerald-700' },
}

/** 상태 코드 → 한글 라벨 (StatusBadge와 상태 필터 탭이 공유) */
export const STATUS_LABEL: Record<Status, string> = {
  draft: STATUS_STYLE.draft.label,
  in_review: STATUS_STYLE.in_review.label,
  approved: STATUS_STYLE.approved.label,
  rejected: STATUS_STYLE.rejected.label,
  published: STATUS_STYLE.published.label,
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
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
