import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { RubricConfig } from '../api/types'

/** 숫자 입력 — 네이티브 스피너를 숨기고 보라색 커스텀 증감 화살표(클릭 가능)를 붙인다. */
function NumberField({
  value,
  onChange,
  step,
  min,
  max,
  className = 'w-24',
}: {
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max: number
  className?: string
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-brand-200 py-1 pl-2 pr-6 text-center text-sm outline-none focus:border-brand-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="absolute right-1.5 flex flex-col text-brand-500">
        <button
          type="button"
          tabIndex={-1}
          aria-label="증가"
          onClick={() => onChange(clamp(value + step))}
          className="flex h-3 items-end justify-center transition-colors hover:text-brand-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden="true">
            <polyline points="6 15 12 9 18 15" />
          </svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="감소"
          onClick={() => onChange(clamp(value - step))}
          className="flex h-3 items-start justify-center transition-colors hover:text-brand-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </span>
    </span>
  )
}

/** 검수 규칙 편집(C 설정 화면, ops 전용) — 5차원 가중치·최소 가중합·하드게이트 임계 편집. */
export function RubricSettingsPage() {
  const qc = useQueryClient()
  const { data } = useQuery<RubricConfig>({
    queryKey: ['rubric-settings'],
    queryFn: () => api.get('/api/settings/rubric'),
  })

  const [weights, setWeights] = useState<Record<string, number>>({})
  const [minTotal, setMinTotal] = useState(2.0)
  const [hardGates, setHardGates] = useState<Record<string, number>>({})

  useEffect(() => {
    if (data) {
      setWeights(data.weights)
      setMinTotal(data.minTotal)
      setHardGates(data.hardGates)
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => api.put<RubricConfig>('/api/settings/rubric', { weights, minTotal, hardGates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rubric-settings'] }),
  })

  if (!data) return <main className="mx-auto max-w-6xl px-4 py-8 text-gray-400">불러오는 중…</main>

  const weightSum = Object.values(weights).reduce((a, b) => a + Number(b || 0), 0)
  const hardGateSum = Object.values(hardGates).reduce((a, b) => a + Number(b || 0), 0)

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h2 className="text-[22px] font-bold text-brand-800">검수 규칙 편집</h2>
        <p className="text-sm text-gray-500">5차원 루브릭의 가중치·최소 가중합·하드게이트 임계를 조정합니다. (0~4 척도)</p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 text-lg font-bold text-gray-700">차원별 가중치</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs">
                <th className="px-4 py-3">차원</th>
                <th className="px-4 py-3">가중치 (0~1)</th>
                <th className="px-4 py-3">하드게이트 최소점수 (0~4)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.dimensions).map(([code, label]) => (
                <tr key={code} className="border-b border-brand-50 last:border-0">
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{label}</td>
                  <td className="px-4 py-3 text-center">
                    <NumberField
                      value={weights[code] ?? 0}
                      onChange={(v) => setWeights({ ...weights, [code]: v })}
                      step={0.05}
                      min={0}
                      max={1}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <NumberField
                      value={hardGates[code] ?? 0}
                      onChange={(v) => setHardGates(v > 0 ? { ...hardGates, [code]: v } : Object.fromEntries(Object.entries(hardGates).filter(([k]) => k !== code)))}
                      step={1}
                      min={0}
                      max={4}
                      className="w-20"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand-100 bg-brand-50/50 font-bold text-brand-800">
                <td className="px-4 py-3 text-center">합계</td>
                <td className="px-4 py-3 text-center">{weightSum.toFixed(2)}</td>
                <td className="px-4 py-3 text-center">{hardGateSum}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {Math.abs(weightSum - 1) > 0.001 && (
          <p className="mt-2 text-xs text-amber-600">가중치 합계가 1.0이 아니어도 저장되지만, 1.0 권장합니다.</p>
        )}

        {/* 최소 가중합 — 가중치 카드 하단에 통합(관련 임계 설정) */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-brand-50 pt-4">
          <span className="text-sm font-semibold text-gray-700">최소 가중합(min total)</span>
          <NumberField value={minTotal} onChange={(v) => setMinTotal(v)} step={0.1} min={0} max={4} />
          <span className="text-xs text-gray-400">가중합이 이 값 미만이면 하드게이트 실패(반려 권고).</span>
        </div>
      </section>

      <div className="flex flex-col items-center gap-3">
        {save.isSuccess && <span className="text-sm text-emerald-600">저장되었습니다.</span>}
        {save.isError && (
          <span className="text-sm text-red-600">
            저장 실패: {save.error instanceof Error ? save.error.message : '오류'}
          </span>
        )}
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          style={{ backgroundColor: '#5b4a9e' }}
          className="w-full max-w-[15.5rem] rounded-2xl py-4 text-xl font-bold tracking-wide text-white shadow-card transition hover:brightness-110 disabled:opacity-50"
        >
          {save.isPending ? '저장 중…' : '규칙 저장'}
        </button>
      </div>
    </main>
  )
}
