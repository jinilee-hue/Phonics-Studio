import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Content, Preview } from '../api/types'

/** 테스트 플레이 미리보기 (F-07/F-12) — kind별 분기, iframe은 allow-same-origin 없이 격리(G). */
export function PreviewModal({ content, onClose }: { content: Content; onClose: () => void }) {
  const { data: preview, isLoading, error } = useQuery<Preview>({
    queryKey: ['preview', content.id],
    queryFn: () => api.get<Preview>(`/api/contents/${content.id}/preview`),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-800">미리보기 — {content.title}</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100">
            ✕ 닫기
          </button>
        </div>

        {isLoading && <p className="py-16 text-center text-gray-400">불러오는 중…</p>}
        {error instanceof Error && (
          <p className="py-16 text-center text-red-500">{error.message}</p>
        )}

        {/* zip(SPA)은 격리된 서브도메인 오리진에서 서빙되므로 allow-same-origin이 안전(ES모듈·localStorage·상대 fetch 필요) */}
        {preview && content.kind === 'zip' && (
          <iframe
            src={preview.url}
            sandbox="allow-scripts allow-same-origin allow-modals"
            allow="microphone; autoplay"
            title={content.title}
            className="h-[60vh] w-full rounded-xl border border-brand-100 bg-white"
          />
        )}

        {/* html(자체완결)은 플랫폼 오리진 서빙 → opaque origin 유지(allow-same-origin 금지) */}
        {preview && content.kind === 'html' && (
          <iframe
            src={preview.url}
            sandbox="allow-scripts"
            title={content.title}
            className="h-[60vh] w-full rounded-xl border border-brand-100 bg-white"
          />
        )}

        {preview && content.kind === 'video' && (
          <video src={preview.url} controls className="max-h-[60vh] w-full rounded-xl bg-black" />
        )}

        {preview && content.kind === 'url' && (
          <div className="space-y-3">
            <iframe
              src={preview.url}
              sandbox="allow-scripts allow-same-origin"
              title={content.title}
              className="h-[55vh] w-full rounded-xl border border-brand-100 bg-white"
            />
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <span>외부 사이트 정책(X-Frame-Options/CSP)에 따라 화면이 비어 보일 수 있습니다.</span>
              <button
                onClick={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}
                className="ml-3 shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700"
              >
                새 탭에서 열기 ↗
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
