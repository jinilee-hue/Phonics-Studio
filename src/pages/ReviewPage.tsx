import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import type { Content } from '../api/types'
import { KindBadge, StatusBadge } from '../components/badges'
import { PipelinePanel } from '../components/PipelinePanel'
import { PreviewModal } from '../components/PreviewModal'

interface BulkResult {
  results: { id: number; ok: boolean; error?: string; status?: string }[]
  okCount: number
  failCount: number
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

/** 검토자 콘솔 — 검수 큐 + 테스트 플레이 + 승인/반려 + 5단계 파이프라인(SSE) + 일괄 처리 */
export function ReviewPage() {
  const [preview, setPreview] = useState<Content | null>(null)
  const [rejecting, setRejecting] = useState<Content | null>(null)
  const [reason, setReason] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [openPipeline, setOpenPipeline] = useState<Set<number>>(new Set())
  const [bulkReject, setBulkReject] = useState(false)
  const [bulkReason, setBulkReason] = useState('')
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)

  const qc = useQueryClient()
  const { data: queue = [], isLoading } = useQuery<Content[]>({
    queryKey: ['queue'],
    queryFn: () => api.get('/api/review/queue'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['queue'] })
  const clearSelection = () => setSelected(new Set())
  const deselect = (id: number) =>
    setSelected((prev) => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })

  const approve = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/contents/${id}/approve`),
    onSuccess: (_d, id) => {
      invalidate()
      deselect(id) // 개별 처리 항목은 선택에서 제거(잔존 ID로 인한 일괄 실패 방지)
    },
  })
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post<Content>(`/api/contents/${id}/reject`, { reason }),
    onSuccess: (_d, { id }) => {
      invalidate()
      deselect(id)
      setRejecting(null)
      setReason('')
    },
  })
  const bulk = useMutation({
    mutationFn: (body: { ids: number[]; action: string; reason?: string }) =>
      api.post<BulkResult>('/api/review/bulk', body),
    onMutate: () => setBulkMsg(null),
    onSuccess: (data) => {
      invalidate()
      setBulkReject(false)
      setBulkReason('')
      if (data.failCount > 0) {
        const failed = data.results.filter((r) => !r.ok)
        setBulkMsg(
          `${data.okCount}건 처리 · ${data.failCount}건 실패 — ` +
            failed.map((r) => `#${r.id}(${r.error ?? '오류'})`).join(', '),
        )
        setSelected(new Set(failed.map((r) => r.id))) // 실패분만 남겨 재시도 가능
      } else {
        setBulkMsg(null)
        clearSelection()
      }
    },
  })

  const toggleSel = (id: number) =>
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const togglePipeline = (id: number) =>
    setOpenPipeline((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h2 className="mb-1 text-lg font-bold text-brand-800">검수 대기열 ({queue.length})</h2>
      <p className="mb-5 text-sm text-gray-500">
        격리 미리보기로 실행해보고, 자동검수 파이프라인의 근거를 참고해 승인/반려하세요. 판정은 사람이 합니다.
      </p>

      {bulkMsg && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span className="flex-1">⚠ {bulkMsg}</span>
          <button onClick={() => setBulkMsg(null)} className="text-amber-500 hover:text-amber-700">
            ✕
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="sticky top-14 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm text-white shadow">
          <span className="font-semibold">{selected.size}개 선택됨</span>
          <span className="ml-auto flex flex-wrap gap-2 [&>button]:shrink-0 [&>button]:whitespace-nowrap">
            <button
              onClick={() => bulk.mutate({ ids: [...selected], action: 'approve' })}
              disabled={bulk.isPending}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold hover:bg-emerald-600 disabled:opacity-50"
            >
              일괄 승인
            </button>
            <button
              onClick={() => setBulkReject(true)}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold hover:bg-red-600"
            >
              일괄 반려
            </button>
            <button onClick={clearSelection} className="rounded-lg border border-white/40 px-3 py-1.5 text-xs">
              선택 해제
            </button>
          </span>
        </div>
      )}

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
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggleSel(c.id)}
                className="accent-brand-600"
              />
              <span className="font-semibold">{c.title}</span>
              <KindBadge kind={c.kind} />
              <StatusBadge status={c.status} />
              <span className="text-xs text-gray-400">
                {c.ownerName} · 제출 {formatDate(c.submittedAt)}
              </span>
              <span className="ml-auto flex flex-wrap gap-2 [&>button]:shrink-0 [&>button]:whitespace-nowrap">
                <button
                  onClick={() => togglePipeline(c.id)}
                  className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                >
                  심사 콘솔
                </button>
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
            {openPipeline.has(c.id) && <PipelinePanel contentId={c.id} />}
          </div>
        ))}
      </div>

      {(approve.isError || reject.isError || bulk.isError) && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          처리 실패:{' '}
          {[approve.error, reject.error, bulk.error].find((e) => e instanceof Error)?.message ?? '알 수 없는 오류'}
        </p>
      )}

      {preview && <PreviewModal content={preview} onClose={() => setPreview(null)} />}

      {rejecting && (
        <ReasonModal
          title={`반려 — ${rejecting.title}`}
          value={reason}
          onChange={setReason}
          onCancel={() => setRejecting(null)}
          onConfirm={() => reject.mutate({ id: rejecting.id, reason: reason.trim() })}
          pending={reject.isPending}
        />
      )}
      {bulkReject && (
        <ReasonModal
          title={`일괄 반려 — ${selected.size}개`}
          value={bulkReason}
          onChange={setBulkReason}
          onCancel={() => setBulkReject(false)}
          onConfirm={() => bulk.mutate({ ids: [...selected], action: 'reject', reason: bulkReason.trim() })}
          pending={bulk.isPending}
        />
      )}
    </main>
  )
}

function ReasonModal({
  title,
  value,
  onChange,
  onCancel,
  onConfirm,
  pending,
}: {
  title: string
  value: string
  onChange: (v: string) => void
  onCancel: () => void
  onConfirm: () => void
  pending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-bold text-brand-800">{title}</h3>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="반려 사유를 입력하세요 (필수). 창작자에게 그대로 전달됩니다."
          rows={4}
          className="w-full rounded-xl border border-brand-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={!value.trim() || pending}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40"
          >
            반려하기
          </button>
        </div>
      </div>
    </div>
  )
}
