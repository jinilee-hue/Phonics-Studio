import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import type { Content, Status } from '../api/types'
import { AiBadge, KindBadge, StatusBadge } from '../components/badges'
import { PreviewModal } from '../components/PreviewModal'

const STATUS_FILTERS: { value: Status; label: string }[] = [
  { value: 'in_review', label: '검수 대기' },
  { value: 'approved', label: '승인완료' },
  { value: 'rejected', label: '반려' },
  { value: 'published', label: 'OPEN' },
  { value: 'suspended', label: '게시중단' },
  { value: 'archived', label: '보관됨' },
]

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

/** 운영자 콘솔 — 게시(F-09, 승인·게시 분리) + 전체 콘텐츠 현황(F-11) */
export function OpsPage() {
  const [selectedFilters, setSelectedFilters] = useState<Set<Status>>(new Set())
  const [preview, setPreview] = useState<Content | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<Content | null>(null) // 긴급철회 사유 모달
  const [actionError, setActionError] = useState<string | null>(null)

  const onActionError = (e: unknown) =>
    setActionError(e instanceof Error ? e.message : '작업을 처리하지 못했습니다.')

  const qc = useQueryClient()
  const { data: approved = [] } = useQuery<Content[]>({
    queryKey: ['contents', 'approved'],
    queryFn: () => api.get('/api/contents?status=approved'),
  })
  const { data: allContents = [] } = useQuery<Content[]>({
    queryKey: ['contents', 'list', 'ops-all'],
    queryFn: () => api.get('/api/contents'),
  })

  const shown =
    selectedFilters.size === 0
      ? allContents
      : allContents.filter((c) => selectedFilters.has(c.status))

  const toggleFilter = (status: Status) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const publish = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/contents/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contents'] }),
  })
  const reset = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/review/${id}/reset`),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['contents'] })
    },
    onError: onActionError,
  })
  const suspend = useMutation({
    mutationFn: (v: { id: number; reason: string }) =>
      api.post<Content>(`/api/contents/${v.id}/suspend`, { reason: v.reason }),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['contents'] })
      setSuspendTarget(null)
    },
    onError: onActionError,
  })
  const archive = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/contents/${id}/archive`),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['contents'] })
    },
    onError: onActionError,
  })
  const restore = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/contents/${id}/restore`),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['contents'] })
    },
    onError: onActionError,
  })

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <section>
        <h2 className="mb-1 text-[22px] font-bold text-brand-800">게시 대기 ({approved.length})</h2>
        <p className="mb-4 text-sm text-gray-600">
          검토자가 승인한 콘텐츠입니다. 게시하면 학생(Play 서비스)에게 공개됩니다.
        </p>
        <div className="space-y-3">
          {approved.length === 0 && (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-card">
              게시를 기다리는 콘텐츠가 없습니다.
            </p>
          )}
          {approved.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 shadow-card">
              <span className="font-semibold">{c.title}</span>
              <KindBadge kind={c.kind} />
              {c.usesAi && <AiBadge />}
              <span className="text-xs font-medium text-gray-600">{c.ownerName}</span>
              <span className="ml-auto flex flex-wrap gap-2 [&>button]:shrink-0 [&>button]:whitespace-nowrap">
                <button
                  onClick={() => setPreview(c)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  미리보기
                </button>
                <button
                  onClick={() => publish.mutate(c.id)}
                  disabled={publish.isPending}
                  style={{ backgroundColor: '#6f5bc8', borderRadius: '0.5rem' }}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                  </svg>
                  게시
                </button>
              </span>
            </div>
          ))}
        </div>
        {publish.isError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            게시 실패: {publish.error instanceof Error ? publish.error.message : '알 수 없는 오류'}
          </p>
        )}
      </section>

      {actionError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          작업 실패: {actionError}
        </p>
      )}

      <section>
        <div className="mb-3">
          <h2 className="mb-3 text-[22px] font-bold text-brand-800">전체 콘텐츠</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedFilters(new Set())}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                selectedFilters.size === 0
                  ? 'bg-brand-600 text-white'
                  : 'border border-brand-100 bg-white text-gray-700 hover:bg-brand-50'
              }`}
            >
              전체
            </button>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  selectedFilters.has(f.value)
                    ? 'bg-brand-600 text-white'
                    : 'border border-brand-100 bg-white text-gray-700 hover:bg-brand-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-left text-xs font-semibold text-brand-800">
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">형식</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">창작자</th>
                <th className="px-4 py-3">제출</th>
                <th className="px-4 py-3">게시</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-b border-brand-50 last:border-0">
                  <td className="px-4 py-3 font-semibold text-brand-900">{c.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-1">
                      <KindBadge kind={c.kind} />
                      {c.usesAi && <AiBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-center text-gray-700">{c.ownerName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center text-xs font-medium tabular-nums text-gray-600">{formatDate(c.submittedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center text-xs font-medium tabular-nums text-gray-600">{formatDate(c.publishedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {(c.status === 'approved' || c.status === 'rejected') && (
                        <button
                          onClick={() => reset.mutate(c.id)}
                          disabled={reset.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                          title="승인/반려 판정을 취소하고 검수 대기로 되돌립니다"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          되돌리기
                        </button>
                      )}
                      {c.status === 'published' && (
                        <button
                          onClick={() => setSuspendTarget(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-orange-300 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                          title="게시본을 긴급 철회합니다(카탈로그에서 즉시 제외)"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="10" y1="9" x2="10" y2="15" />
                            <line x1="14" y1="9" x2="14" y2="15" />
                          </svg>
                          게시중단
                        </button>
                      )}
                      {c.status === 'suspended' && (
                        <button
                          onClick={() => restore.mutate(c.id)}
                          disabled={restore.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                          title="다시 게시합니다"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                          재게시
                        </button>
                      )}
                      {(c.status === 'suspended' || c.status === 'rejected') && (
                        <button
                          onClick={() => archive.mutate(c.id)}
                          disabled={archive.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          title="목록에서 내려 보관합니다"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                            <polyline points="21 8 21 21 3 21 3 8" />
                            <rect x="1" y="3" width="22" height="5" />
                            <line x1="10" y1="12" x2="14" y2="12" />
                          </svg>
                          보관
                        </button>
                      )}
                      {c.status === 'archived' && (
                        <button
                          onClick={() => restore.mutate(c.id)}
                          disabled={restore.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                          title="보관을 해제하고 검수 대기로 되돌립니다"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          복구
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    콘텐츠가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {preview && <PreviewModal content={preview} onClose={() => setPreview(null)} />}
      {suspendTarget && (
        <SuspendModal
          content={suspendTarget}
          pending={suspend.isPending}
          onCancel={() => setSuspendTarget(null)}
          onConfirm={(reason) => suspend.mutate({ id: suspendTarget.id, reason })}
        />
      )}
    </main>
  )
}

/** 게시중단(긴급철회) 사유 입력 모달 — 사유 필수 */
function SuspendModal({
  content,
  pending,
  onCancel,
  onConfirm,
}: {
  content: Content
  pending: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-bold text-brand-800">게시중단 — {content.title}</h3>
        <p className="mb-3 text-sm text-gray-500">
          게시본을 긴급 철회합니다. 카탈로그에서 즉시 제외되며, 사유는 감사 이력에 남습니다.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="게시중단 사유를 입력하세요"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={pending || !reason.trim()}
            className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {pending ? '처리 중…' : '게시중단'}
          </button>
        </div>
      </div>
    </div>
  )
}
