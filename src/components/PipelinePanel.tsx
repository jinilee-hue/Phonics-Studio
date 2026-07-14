import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DESIGN_MODE, MOCK_PIPELINE_OVERALL, MOCK_PIPELINE_STAGES } from '../api/mock'
import type { PipelineOverall, PipelineStage } from '../api/types'
import { RadarChart } from './RadarChart'

/** 단계 상태별 메타 — 라벨/색/틴트/라인아이콘 */
const STAGE_META: Record<PipelineStage['status'], { label: string; text: string; tint: string; icon: ReactNode }> = {
  pass: { label: '통과', text: 'text-emerald-600', tint: 'bg-emerald-50', icon: <polyline points="20 6 9 17 4 12" /> },
  reject: {
    label: '반려',
    text: 'text-red-600',
    tint: 'bg-red-50',
    icon: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  },
  flag: {
    label: '경고',
    text: 'text-amber-600',
    tint: 'bg-amber-50',
    icon: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  },
  skip: { label: '건너뜀', text: 'text-gray-400', tint: 'bg-gray-100', icon: <line x1="5" y1="12" x2="19" y2="12" /> },
  info: {
    label: '참고',
    text: 'text-sky-600',
    tint: 'bg-sky-50',
    icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
  },
}

const StageIcon = ({ status }: { status: PipelineStage['status'] }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
    {STAGE_META[status].icon}
  </svg>
)

const REC_STYLE: Record<PipelineOverall['recommendation'], { label: string; cls: string }> = {
  approve: { label: '승인 권고', cls: 'text-emerald-600' },
  reject: { label: '반려 권고', cls: 'text-red-600' },
  manual: { label: '사람 검토 필요', cls: 'text-red-600' },
}

/** 심사 라이브 콘솔(SSE) — 5단계 파이프라인 진행을 실시간 스트리밍하고 루브릭·권고를 보여준다. */
export function PipelinePanel({ contentId }: { contentId: number }) {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [overall, setOverall] = useState<PipelineOverall | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const doneRef = useRef(false)
  const esRef = useRef<EventSource | null>(null)

  const run = () => {
    esRef.current?.close()
    setStages([])
    setOverall(null)
    setError(null)
    setRunning(true)
    doneRef.current = false
    // 디자인 모드: 백엔드 SSE 대신 목 결과로 즉시 채운다(네트워크 호출 없음)
    if (DESIGN_MODE) {
      setStages(MOCK_PIPELINE_STAGES)
      setOverall(MOCK_PIPELINE_OVERALL)
      doneRef.current = true
      setRunning(false)
      return
    }
    const es = new EventSource(`/api/review/${contentId}/pipeline/stream`, { withCredentials: true })
    esRef.current = es
    es.addEventListener('stage', (e) => setStages((prev) => [...prev, JSON.parse((e as MessageEvent).data)]))
    es.addEventListener('done', (e) => {
      setOverall(JSON.parse((e as MessageEvent).data))
      doneRef.current = true
      setRunning(false)
      es.close()
    })
    es.onerror = () => {
      // 정상 완료(done) 후의 close는 무시, 그 외 중단은 에러로 표시
      if (!doneRef.current) setError('검수 스트림이 중단됐습니다. 다시 시도해주세요.')
      setRunning(false)
      es.close()
    }
  }

  useEffect(() => () => esRef.current?.close(), [])

  const rubric = overall?.rubric

  return (
    <div className="mt-3 rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      {/* 헤더 — 실행 버튼 + 권고 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-800 disabled:opacity-50"
        >
          {running ? (
            '검수 진행 중…'
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              자동검수 파이프라인 실행
            </>
          )}
        </button>
        {overall?.autoReject && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">①② 자동반려 대상</span>
        )}
        {overall && (
          <span className={`ml-auto inline-flex items-center gap-1 text-sm font-semibold ${REC_STYLE[overall.recommendation].cls}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {REC_STYLE[overall.recommendation].label}
          </span>
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">⚠ {error}</p>}

      {(stages.length > 0 || rubric) && (
        <div className="mt-3 grid gap-4 md:grid-cols-2 md:items-stretch">
          {/* 좌 — 5단계 검사 결과 (우측 차트 높이에 맞춰 균등 분배) */}
          {stages.length > 0 && (
            <ol className="flex h-full flex-col">
              {stages.map((s) => {
                const m = STAGE_META[s.status]
                return (
                  <li key={s.stage} className="flex flex-1 items-center gap-3 border-b border-gray-100 py-2 last:border-b-0">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${m.tint} ${m.text}`}>
                      <StageIcon status={s.status} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        <span className="text-gray-400">{s.stage}.</span> {s.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">{s.summary}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.tint} ${m.text}`}>{m.label}</span>
                  </li>
                )
              })}
            </ol>
          )}

          {/* 우 — 5차원 루브릭 */}
          {rubric && (
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">5차원 루브릭</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">
                    가중합 <b className="text-sm text-gray-800">{rubric.total}</b>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${rubric.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {rubric.passed ? '통과' : '미달'}
                  </span>
                </span>
              </div>
              <RadarChart
                data={Object.entries(rubric.dimensions).map(([code, label]) => ({ label, value: rubric.breakdown[code] ?? 0 }))}
                max={4}
              />
              {rubric.gateFailures.length > 0 && (
                <ul className="mt-2.5 space-y-1 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
                  {rubric.gateFailures.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span aria-hidden="true">•</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* 패널 전체 안내 — 결과가 있을 때만 */}
      {(stages.length > 0 || overall) && (
        <p className="mt-3 border-t border-gray-100 pt-2.5 text-[11px] leading-relaxed text-gray-400">
          ※ AI 점수·요약은 콘텐츠 텍스트에 영향받을 수 있어 참고용입니다. 자동 반려는 형식·정적 검사(①②)로만 결정되며 최종 판정은 사람이 합니다.
        </p>
      )}
    </div>
  )
}
