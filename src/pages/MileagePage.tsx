import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PointsResult } from '../api/types'

const EVENT_LABEL: Record<string, string> = {
  register: '콘텐츠 등록',
  publish: '콘텐츠 게시',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

/** 내 포인트 — 적립 합계 + 내역 (조회 전용) */
export function MileagePage() {
  const { data } = useQuery<PointsResult>({
    queryKey: ['points'],
    queryFn: () => api.get('/api/me/points'),
  })

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="mb-1 text-lg font-bold text-brand-800">내 포인트</h2>
        <p className="text-sm text-gray-500">콘텐츠 등록·게시로 포인트가 적립됩니다.</p>
        <div className="mt-4 text-3xl font-extrabold text-brand-700">
          {(data?.points ?? 0).toLocaleString()} <span className="text-base font-semibold text-gray-400">P</span>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-brand-800">적립 내역</h3>
        {!data || data.entries.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            아직 적립 내역이 없어요.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs text-gray-400">
                  <th className="px-4 py-3">이벤트</th>
                  <th className="px-4 py-3">콘텐츠</th>
                  <th className="px-4 py-3 text-right">포인트</th>
                  <th className="px-4 py-3">일시</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={i} className="border-b border-brand-50 last:border-0">
                    <td className="px-4 py-3 font-medium">{EVENT_LABEL[e.eventType] ?? e.eventType}</td>
                    <td className="px-4 py-3 text-gray-500">{e.contentId ? `#${e.contentId}` : '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">+{e.amount}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
