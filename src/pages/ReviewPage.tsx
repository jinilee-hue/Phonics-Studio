import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import type { Content } from '../api/types'
import { KindBadge, StatusBadge } from '../components/badges'
import { PreviewModal } from '../components/PreviewModal'

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

/** 검토자 콘솔 — 검수 큐(F-06) + 테스트 플레이(F-07) + 승인/반려(F-08) */
export function ReviewPage() {
  const [preview, setPreview] = useState<Content | null>(null)
  const [rejecting, setRejecting] = useState<Content | null>(null)
  const [reason, setReason] = useState('')

  const qc = useQueryClient()
  const { data: queue = [], isLoading } = useQuery<Content[]>({
    queryKey: ['queue'],
    queryFn: () => api.get('/api/review/queue'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['queue'] })

  const approve = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/contents/${id}/approve`),
    onSuccess: invalidate,
  })

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post<Content>(`/api/contents/${id}/reject`, { reason }),
    onSuccess: () => {
      invalidate()
      setRejecting(null)
      setReason('')
    },
  })

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h2 className="mb-1 text-lg font-bold text-brand-800">검수 대기열 ({queue.length})</h2>
      <p className="mb-5 text-sm text-gray-500">
        제출된 순서대로 표시됩니다. 격리된 미리보기로 실제 실행해본 뒤 승인 또는 반려하세요.
      </p>

      {isLoading && <p className="py-10 text-center text-gray-400">불러오는 중…</p>}
      {!isLoading && queue.length === 0 && (
        <p className="rounded-2xl bg-white p-10 text-center text-sm text-gray-400 shadow-card">
          검수 대기 중인 콘텐츠가 없습니다. 🎉
        </p>
      )}

      <div className="space-y-3">
        {queue.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{c.title}</span>
              <KindBadge kind={c.kind} />
              <StatusBadge status={c.status} />
              <span className="text-xs text-gray-400">
                {c.ownerName} · 제출 {formatDate(c.submittedAt)}
              </span>
              <span className="ml-auto flex gap-2">
                <button
                  onClick={() => setPreview(c)}
                  className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  ▶ 테스트 플레이
                </button>
                <button
                  onClick={() => approve.mutate(c.id)}
                  disabled={approve.isPending}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  승인
                </button>
                <button
                  onClick={() => {
                    setRejecting(c)
                    setReason('')
                  }}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600"
                >
                  반려
                </button>
              </span>
            </div>
            {c.description && <p className="mt-1 text-sm text-gray-500">{c.description}</p>}
          </div>
        ))}
      </div>

      {(approve.isError || reject.isError) && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          처리 실패:{' '}
          {[approve.error, reject.error].find((e) => e instanceof Error)?.message ?? '알 수 없는 오류'}
        </p>
      )}

      {preview && <PreviewModal content={preview} onClose={() => setPreview(null)} />}

      {rejecting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setRejecting(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 font-bold text-brand-800">반려 — {rejecting.title}</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="반려 사유를 입력하세요 (필수). 창작자에게 그대로 전달됩니다."
              rows={4}
              className="w-full rounded-xl border border-brand-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setRejecting(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => reject.mutate({ id: rejecting.id, reason: reason.trim() })}
                disabled={!reason.trim() || reject.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40"
              >
                반려하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
