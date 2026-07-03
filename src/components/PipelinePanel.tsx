import { useEffect, useRef, useState } from 'react'
import type { PipelineOverall, PipelineStage } from '../api/types'

const STATUS_ICON: Record<PipelineStage['status'], { icon: string; cls: string }> = {
  pass: { icon: '✓', cls: 'text-emerald-600' },
  reject: { icon: '✗', cls: 'text-red-600' },
  flag: { icon: '⚠', cls: 'text-amber-600' },
  skip: { icon: '–', cls: 'text-gray-400' },
  info: { icon: 'ℹ', cls: 'text-sky-600' },
}

const REC_STYLE: Record<PipelineOverall['recommendation'], { label: string; cls: string }> = {
  approve: { label: '승인 권고', cls: 'bg-emerald-100 text-emerald-700' },
  reject: { label: '반려 권고', cls: 'bg-red-100 text-red-700' },
  manual: { label: '사람 검토 필요', cls: 'bg-amber-100 text-amber-700' },
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
    <div className="mt-3 rounded-xl border border-brand-100 bg-gray-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {running ? '검수 진행 중…' : '🔎 자동검수 파이프라인 실행'}
        </button>
        {overall && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${REC_STYLE[overall.recommendation].cls}`}>
            {REC_STYLE[overall.recommendation].label}
          </span>
        )}
        {overall?.autoReject && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">①② 자동반려 대상</span>
        )}
      </div>

      {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">⚠ {error}</p>}

      {stages.length > 0 && (
        <ol className="space-y-1 text-sm">
          {stages.map((s) => (
            <li key={s.stage} className="flex items-start gap-2">
              <span className={`font-bold ${STATUS_ICON[s.status].cls}`}>{STATUS_ICON[s.status].icon}</span>
              <span className="font-semibold text-gray-700">
                {s.stage}. {s.name}
              </span>
              <span className="text-gray-500">— {s.summary}</span>
            </li>
          ))}
        </ol>
      )}

      {rubric && (
        <div className="mt-3 border-t border-brand-100 pt-2">
          <div className="mb-1 text-xs font-semibold text-gray-500">
            5차원 루브릭 — 가중합 {rubric.total} / {rubric.passed ? '통과' : '미달'}
          </div>
          <div className="space-y-1">
            {Object.entries(rubric.dimensions).map(([code, label]) => {
              const score = rubric.breakdown[code] ?? 0
              return (
                <div key={code} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-gray-500">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(score / 4) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-gray-600">{score}</span>
                </div>
              )
            })}
          </div>
          {rubric.gateFailures.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-600">
              {rubric.gateFailures.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-gray-400">
            ※ AI 점수·요약은 콘텐츠 텍스트에 영향받을 수 있어 참고용입니다. 자동 반려는 형식·정적 검사(①②)로만 결정되며 최종 판정은 사람이 합니다.
          </p>
        </div>
      )}
    </div>
  )
}
