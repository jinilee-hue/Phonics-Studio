import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Stats, Status } from '../api/types'
import { STATUS_LABEL } from '../components/badges'

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-brand-700">{value}</div>
    </div>
  )
}

/** 운영 통계 — studio DB 지표(콘텐츠 파이프라인). 플레이 지표는 별도(playground). */
export function StatsPage() {
  const { data } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => api.get('/api/stats'),
  })

  if (!data) return <main className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-400">불러오는 중…</main>

  const maxTrend = Math.max(1, ...data.submissionsTrend.map((t) => t.count))
  const maxReg = Math.max(1, ...data.creatorRanking.map((c) => c.registrations))

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h2 className="text-lg font-bold text-brand-800">운영 통계</h2>
        <p className="text-sm text-gray-500">
          콘텐츠 등록·검수·게시 파이프라인 지표입니다. 학생 플레이 지표는 Play 서비스에서 확인하세요.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="총 콘텐츠" value={String(data.totalContents)} />
        <Kpi label="창작자 수" value={String(data.totalCreators)} />
        <Kpi label="승인율" value={`${Math.round(data.approvalRate * 100)}%`} />
        <Kpi label="게시됨" value={String(data.byStatus.published ?? 0)} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 text-sm font-bold text-brand-800">상태별 분포</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.byStatus).map(([status, count]) => (
            <span key={status} className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
              {STATUS_LABEL[status as Status] ?? status} <b>{count}</b>
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          승인 {data.decisionsApprove} · 반려 {data.decisionsReject}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 text-sm font-bold text-brand-800">최근 30일 등록 추이</h3>
        <div className="flex h-32 items-end gap-0.5">
          {data.submissionsTrend.map((t) => (
            <div key={t.date} className="group relative flex-1" title={`${t.date}: ${t.count}건`}>
              <div
                className="w-full rounded-t bg-brand-400 transition-colors group-hover:bg-brand-600"
                style={{ height: `${(t.count / maxTrend) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>{data.submissionsTrend[0]?.date}</span>
          <span>{data.submissionsTrend[data.submissionsTrend.length - 1]?.date}</span>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-brand-800">창작자 랭킹 (등록순)</h3>
        {data.creatorRanking.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            데이터가 없습니다.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs text-gray-400">
                  <th className="px-4 py-3">창작자</th>
                  <th className="px-4 py-3">등록</th>
                  <th className="px-4 py-3">승인</th>
                  <th className="px-4 py-3">게시</th>
                </tr>
              </thead>
              <tbody>
                {data.creatorRanking.map((c) => (
                  <tr key={c.userId} className="border-b border-brand-50 last:border-0">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-brand-50">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${(c.registrations / maxReg) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-600">{c.registrations}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.approved}</td>
                    <td className="px-4 py-3 text-gray-500">{c.published}</td>
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
