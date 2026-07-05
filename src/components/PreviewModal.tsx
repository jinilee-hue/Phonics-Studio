import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Content, Preview } from '../api/types'
import { resolveEmbed } from '../utils/embed'

/** 미리보기 뷰포트 — iframe 엘리먼트 너비를 기기별 폭으로 제한해 반응형 레이아웃을 확인 */
type Viewport = 'desktop' | 'tablet' | 'mobile'

const VIEWPORTS: { id: Viewport; label: string; width: number | null }[] = [
  { id: 'desktop', label: '데스크톱', width: null }, // null = 전체 너비
  { id: 'tablet', label: '태블릿', width: 768 },
  { id: 'mobile', label: '모바일', width: 375 },
]

/**
 * 뷰포트 폭이 적용된 iframe 프레임. vpWidth가 있으면 그 px 폭으로 고정하고
 * (max-w 제약 없이) 래퍼가 가로 스크롤을 처리 → 실제 기기 폭을 보장.
 */
function ViewportFrame({
  src,
  sandbox,
  allow,
  title,
  heightClass,
  vpWidth,
}: {
  src: string
  sandbox: string
  allow?: string
  title: string
  heightClass: string
  vpWidth: number | null
}) {
  return (
    <div className="flex justify-center overflow-auto">
      <iframe
        src={src}
        sandbox={sandbox}
        allow={allow}
        title={title}
        style={vpWidth ? { width: vpWidth } : undefined}
        className={`${heightClass} shrink-0 rounded-xl border border-brand-100 bg-white ${vpWidth ? '' : 'w-full'}`}
      />
    </div>
  )
}

/** 테스트 플레이 미리보기 (F-07/F-12) — kind별 분기. zip·html은 per-content 격리 서브도메인
 *  오리진에서 서빙되므로 allow-same-origin이 안전(G), video는 element 직접 재생, url은 외부 임베드. */
export function PreviewModal({ content, onClose }: { content: Content; onClose: () => void }) {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const vpWidth = VIEWPORTS.find((v) => v.id === viewport)?.width ?? null

  const { data: preview, isLoading, error } = useQuery<Preview>({
    queryKey: ['preview', content.id],
    queryFn: () => api.get<Preview>(`/api/contents/${content.id}/preview`),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  // iframe 기반 kind에서만 뷰포트 전환 툴바 노출 (video 제외)
  const showViewportToolbar = content.kind !== 'video'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-800">미리보기 — {content.title}</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100">
            ✕ 닫기
          </button>
        </div>

        {showViewportToolbar && preview && (
          <div className="mb-3 flex items-center gap-2">
            {VIEWPORTS.map((v) => (
              <button
                key={v.id}
                onClick={() => setViewport(v.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  viewport === v.id
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-brand-200 text-brand-600 hover:bg-brand-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {isLoading && <p className="py-16 text-center text-gray-400">불러오는 중…</p>}
        {error instanceof Error && (
          <p className="py-16 text-center text-red-500">{error.message}</p>
        )}

        {/* zip(SPA)·html 모두 격리된 서브도메인 오리진에서 서빙되므로 allow-same-origin이 안전
            (마이크·ES모듈·localStorage·상대 fetch 필요) */}
        {preview && (content.kind === 'zip' || content.kind === 'html') && (
          <ViewportFrame
            src={preview.url}
            sandbox="allow-scripts allow-same-origin allow-modals"
            allow="microphone; autoplay"
            title={content.title}
            heightClass="h-[60vh]"
            vpWidth={vpWidth}
          />
        )}

        {preview && content.kind === 'video' && (
          <video src={preview.url} controls className="max-h-[60vh] w-full rounded-xl bg-black" />
        )}

        {preview && content.kind === 'url' && (() => {
          // YouTube/Vimeo는 embed URL로 변환하면 iframe 삽입이 허용되어 앱 안에서 바로 재생된다.
          const embed = resolveEmbed(preview.url)
          return (
            <div className="space-y-3">
              <ViewportFrame
                src={embed.url}
                sandbox={
                  embed.embeddable
                    ? 'allow-scripts allow-same-origin allow-presentation allow-popups'
                    : 'allow-scripts allow-same-origin'
                }
                allow={embed.embeddable ? 'autoplay; encrypted-media; fullscreen; picture-in-picture' : undefined}
                title={content.title}
                heightClass="h-[55vh]"
                vpWidth={vpWidth}
              />
              <div
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                  embed.embeddable ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {embed.embeddable ? (
                  <span>영상 플레이어로 임베드해 재생합니다.</span>
                ) : (
                  <span>외부 사이트 정책(X-Frame-Options/CSP)에 따라 화면이 비어 보일 수 있습니다.</span>
                )}
                <button
                  onClick={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}
                  className="ml-3 shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700"
                >
                  새 탭에서 열기 ↗
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
