import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { RubricConfig } from '../api/types'

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

  if (!data) return <main className="mx-auto max-w-3xl px-4 py-8 text-gray-400">불러오는 중…</main>

  const weightSum = Object.values(weights).reduce((a, b) => a + Number(b || 0), 0)

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h2 className="text-lg font-bold text-brand-800">검수 규칙 편집</h2>
        <p className="text-sm text-gray-500">5차원 루브릭의 가중치·최소 가중합·하드게이트 임계를 조정합니다. (0~4 척도)</p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 text-sm font-bold text-gray-700">차원별 가중치 (합계 {weightSum.toFixed(2)})</h3>
        <div className="space-y-2">
          {Object.entries(data.dimensions).map(([code, label]) => (
            <div key={code} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="w-24 text-sm text-gray-600">{label}</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights[code] ?? 0}
                onChange={(e) => setWeights({ ...weights, [code]: Number(e.target.value) })}
                className="w-24 rounded-lg border border-brand-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
              />
              <span className="whitespace-nowrap text-xs text-gray-400">가중치</span>
              <span className="ml-auto whitespace-nowrap text-xs text-gray-400">하드게이트 최소점수</span>
              <input
                type="number"
                step="1"
                min="0"
                max="4"
                value={hardGates[code] ?? 0}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setHardGates(v > 0 ? { ...hardGates, [code]: v } : Object.fromEntries(Object.entries(hardGates).filter(([k]) => k !== code)))
                }}
                className="w-20 rounded-lg border border-brand-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
              />
            </div>
          ))}
        </div>
        {Math.abs(weightSum - 1) > 0.001 && (
          <p className="mt-2 text-xs text-amber-600">가중치 합계가 1.0이 아니어도 저장되지만, 1.0 권장합니다.</p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <label className="flex items-center gap-3 text-sm text-gray-700">
          최소 가중합(min total)
          <input
            type="number"
            step="0.1"
            min="0"
            max="4"
            value={minTotal}
            onChange={(e) => setMinTotal(Number(e.target.value))}
            className="w-24 rounded-lg border border-brand-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <p className="mt-1 text-xs text-gray-400">가중합이 이 값 미만이면 하드게이트 실패(반려 권고).</p>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {save.isPending ? '저장 중…' : '규칙 저장'}
        </button>
        {save.isSuccess && <span className="text-sm text-emerald-600">저장되었습니다.</span>}
        {save.isError && (
          <span className="text-sm text-red-600">
            저장 실패: {save.error instanceof Error ? save.error.message : '오류'}
          </span>
        )}
      </div>
    </main>
  )
}
