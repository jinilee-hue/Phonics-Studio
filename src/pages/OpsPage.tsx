import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import type { Content, Status } from '../api/types'
import { KindBadge, StatusBadge } from '../components/badges'
import { PreviewModal } from '../components/PreviewModal'

const FILTERS: { value: Status | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'draft', label: '작성 중' },
  { value: 'in_review', label: '검수 대기' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
  { value: 'published', label: '게시됨' },
]

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

/** 운영자 콘솔 — 게시(F-09, 승인·게시 분리) + 전체 콘텐츠 현황(F-11) */
export function OpsPage() {
  const [filter, setFilter] = useState<Status | ''>('')
  const [preview, setPreview] = useState<Content | null>(null)

  const qc = useQueryClient()
  const { data: approved = [] } = useQuery<Content[]>({
    queryKey: ['contents', 'approved'],
    queryFn: () => api.get('/api/contents?status=approved'),
  })
  const { data: all = [] } = useQuery<Content[]>({
    queryKey: ['contents', filter],
    queryFn: () => api.get(filter ? `/api/contents?status=${filter}` : '/api/contents'),
  })

  const publish = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/contents/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contents'] }),
  })

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <section>
        <h2 className="mb-1 text-lg font-bold text-brand-800">게시 대기 ({approved.length})</h2>
        <p className="mb-4 text-sm text-gray-500">
          검토자가 승인한 콘텐츠입니다. 게시하면 학생(Play 서비스)에게 공개됩니다.
        </p>
        <div className="space-y-3">
          {approved.length === 0 && (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
              게시를 기다리는 콘텐츠가 없습니다.
            </p>
          )}
          {approved.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 shadow-card">
              <span className="font-semibold">{c.title}</span>
              <KindBadge kind={c.kind} />
              <span className="text-xs text-gray-400">{c.ownerName}</span>
              <span className="ml-auto flex gap-2">
                <button
                  onClick={() => setPreview(c)}
                  className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  미리보기
                </button>
                <button
                  onClick={() => publish.mutate(c.id)}
                  disabled={publish.isPending}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  🚀 게시
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

      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-bold text-brand-800">전체 콘텐츠</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Status | '')}
            className="rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-xs text-gray-400">
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">형식</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">창작자</th>
                <th className="px-4 py-3">제출</th>
                <th className="px-4 py-3">게시</th>
              </tr>
            </thead>
            <tbody>
              {all.map((c) => (
                <tr key={c.id} className="border-b border-brand-50 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3"><KindBadge kind={c.kind} /></td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{c.ownerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.submittedAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.publishedAt)}</td>
                </tr>
              ))}
              {all.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    콘텐츠가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {preview && <PreviewModal content={preview} onClose={() => setPreview(null)} />}
    </main>
  )
}
