import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Content, PlayStats, Stats, Status, TrendPoint } from '../api/types'
import { KindBadge, STATUS_LABEL, StatusBadge } from '../components/badges'

/** 상태별 분포 목록 표시 순서 — 라이프사이클 순 */
const STATUS_ORDER: Status[] = [
  'draft',
  'in_review',
  'approved',
  'rejected',
  'published',
  'suspended',
  'archived',
]

/** 상태별 분포 막대·범례 색상 — 각 상태 뱃지 컬러에 맞춤(작성중=보라, 검수대기=파랑, 승인=초록, 반려=빨강, OPEN=검정, 게시중단=주황, 보관=회색) */
const STATUS_BAR: Record<Status, string> = {
  draft: 'bg-brand-500',
  in_review: 'bg-blue-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  published: 'bg-gray-800',
  suspended: 'bg-orange-500',
  archived: 'bg-slate-400',
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** "YYYY-MM-DD" → 로컬 파츠(타임존 시프트 없이 파싱) */
function parseYMD(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d, dow: new Date(y, m - 1, d).getDay() }
}
/** 축 눈금용 짧은 날짜 "6/8" */
function shortDay(s: string) {
  const { m, d } = parseYMD(s)
  return `${m}/${d}`
}
/** 툴팁용 날짜 "6월 8일 (월)" */
function fullDay(s: string) {
  const { m, d, dow } = parseYMD(s)
  return `${m}월 ${d}일 (${WEEKDAY[dow]})`
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="truncate text-xs font-medium text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-brand-700">{value}</div>
    </div>
  )
}

/** 최근 N일 등록 추이 — 일별 막대 + hover/focus 툴팁 + 균등 날짜 눈금(dataviz: 단일 시리즈, 범례 없음). */
function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const n = trend.length
  const max = Math.max(1, ...trend.map((t) => t.count))
  const total = trend.reduce((s, t) => s + t.count, 0)
  // x축 눈금 — 약 6개 균등 인덱스(처음·끝 포함)
  const ticks = useMemo(() => {
    if (n === 0) return new Set<number>()
    const idx = new Set<number>()
    for (let k = 0; k <= 5; k++) idx.add(Math.round((k / 5) * (n - 1)))
    return idx
  }, [n])

  // 툴팁 가장자리 클리핑 방지 — 좌/우 끝 컬럼은 정렬 방향 전환
  const alignCls = (i: number) =>
    i <= 1 ? 'left-0' : i >= n - 2 ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-lg font-bold text-brand-800">최근 30일 등록 추이</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            총 {total}건 · 최대 {max}건/일
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {/* y축 눈금 라벨 */}
        <div className="flex h-40 w-6 shrink-0 flex-col justify-between py-0 text-right text-[10px] tabular-nums text-gray-300">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* 플롯 — 배경 그리드라인(hairline) 위에 막대 */}
          <div className="relative h-40 border-b border-gray-200/70">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gray-200/60" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gray-200/50" />
            <div className="absolute inset-0 flex items-end gap-0.5">
              {trend.map((t, i) => {
                const active = hover === i
                const h = (t.count / max) * 100
                return (
                  <div
                    key={t.date}
                    className="group relative flex h-full flex-1 cursor-default flex-col justify-end outline-none"
                    tabIndex={0}
                    aria-label={`${fullDay(t.date)} ${t.count}건`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  >
                    {/* 빈 날도 축이 이어져 보이도록 옅은 트랙 */}
                    <div className="absolute inset-0 rounded-md bg-brand-50/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100" />
                    {/* 값 막대 — 4px 라운드 데이터엔드, 바닥 기준 */}
                    <div
                      className={`relative rounded-t transition-all duration-150 ${
                        active ? 'bg-brand-600' : 'bg-gradient-to-t from-brand-300 to-brand-500'
                      }`}
                      style={{ height: t.count ? `max(${h}%, 4px)` : '0' }}
                    />
                    {/* 툴팁 — 값이 크게, 날짜는 보조(dataviz interaction) */}
                    {active && (
                      <div
                        className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-brand-800 px-2.5 py-1.5 text-center shadow-lg ${alignCls(i)}`}
                      >
                        <div className="text-sm font-bold leading-none text-white">{t.count}건</div>
                        <div className="mt-1 text-[10px] leading-none text-brand-200">{fullDay(t.date)}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* x축 날짜 눈금 — 막대와 정렬(약 6개 균등) */}
          <div className="mt-1.5 flex gap-0.5">
            {trend.map((t, i) => (
              <div key={t.date} className="flex-1 text-center text-[10px] tabular-nums text-gray-400">
                {ticks.has(i) ? <span className="whitespace-nowrap">{shortDay(t.date)}</span> : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** 운영 통계 — studio DB 지표(콘텐츠 파이프라인). 플레이 지표는 별도(playground). */
export function StatsPage() {
  const { data } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => api.get('/api/stats'),
  })
  // 상태별 콘텐츠 목록 — ops 전용 전체 목록(review.py list_contents)을 상태로 그룹핑
  const { data: allContents = [] } = useQuery<Content[]>({
    queryKey: ['contents', 'all'],
    queryFn: () => api.get('/api/contents'),
  })
  const byStatusList = useMemo(() => {
    const m = {} as Record<Status, Content[]>
    for (const c of allContents) (m[c.status] ??= []).push(c)
    return m
  }, [allContents])
  const shownStatuses = STATUS_ORDER.filter((s) => byStatusList[s]?.length)

  const play = useQuery<PlayStats>({
    queryKey: ['stats', 'play'],
    queryFn: () => api.get('/api/stats/play'),
    retry: false, // 연동 미설정 시 503 — 재시도 안 함
  })
  const syncRewards = useMutation({
    mutationFn: () =>
      api.post<{ syncedContents: number; settledContents: number; newlyAwarded: number }>(
        '/api/stats/sync-usage-rewards',
      ),
    onSuccess: () => play.refetch(),
  })

  if (!data) return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-400">불러오는 중…</main>

  const maxReg = Math.max(1, ...data.creatorRanking.map((c) => c.registrations))

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h2 className="text-[22px] font-bold text-brand-800">운영 통계</h2>
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
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-lg font-bold text-brand-800">상태별 분포</h3>
          <span className="text-xs text-gray-400">
            승인 {data.decisionsApprove} · 반려 {data.decisionsReject}
          </span>
        </div>

        {/* 부분-전체 비율 막대 — 상태별 비중을 한눈에 */}
        {shownStatuses.length > 0 && (
          <div className="mb-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {shownStatuses.map((s) => (
              <div
                key={s}
                className={STATUS_BAR[s]}
                style={{ flexGrow: byStatusList[s].length, flexBasis: 0 }}
                title={`${STATUS_LABEL[s]} ${byStatusList[s].length}건`}
              />
            ))}
          </div>
        )}

        {/* 범례 겸 카운트 칩 */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.byStatus).map(([status, count]) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_BAR[status as Status] ?? 'bg-brand-400'}`} />
              {STATUS_LABEL[status as Status] ?? status} <b className="tabular-nums">{count}</b>
            </span>
          ))}
        </div>

        {/* 상태별 실제 콘텐츠 목록 — 어떤 게 게시됨/검수대기인지 확인 (라이프사이클 순) */}
        <div className="modal-scroll mt-5 max-h-96 overflow-auto px-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs">
                <th className="w-40 px-4 py-3">상태</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">형식</th>
              </tr>
            </thead>
            <tbody>
              {shownStatuses.flatMap((s) => {
                const items = byStatusList[s]
                return items.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={`border-b border-brand-50 last:border-b-2 last:border-b-brand-100 ${idx === 0 ? 'border-t-2 border-t-brand-100' : ''}`}
                  >
                    {idx === 0 && (
                      <td rowSpan={items.length} className="border-r border-brand-100 px-4 py-3 text-center align-middle">
                        <StatusBadge status={s} />
                        <div className="mt-1 text-xs text-gray-400">{items.length}건</div>
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-gray-700">{c.title}</td>
                    <td className="px-4 py-3 text-center"><KindBadge kind={c.kind} /></td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
          {allContents.length === 0 && <p className="py-4 text-center text-xs text-gray-400">등록된 콘텐츠가 없습니다.</p>}
        </div>
      </section>

      <TrendChart trend={data.submissionsTrend} />

      <section>
        <h3 className="mb-3 text-lg font-bold text-brand-800">창작자 랭킹 (등록순)</h3>
        {data.creatorRanking.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            데이터가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs text-gray-400">
                  <th className="px-4 py-3 font-semibold">창작자</th>
                  <th className="px-4 py-3 font-semibold">등록</th>
                  <th className="px-4 py-3 font-semibold">승인</th>
                  <th className="px-4 py-3 font-semibold">게시</th>
                </tr>
              </thead>
              <tbody>
                {data.creatorRanking.map((c, i) => (
                  <tr key={c.userId} className="border-b border-brand-50 transition-colors last:border-0 hover:bg-brand-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            i === 0
                              ? 'bg-brand-600 text-white'
                              : i === 1
                                ? 'bg-brand-200 text-brand-700'
                                : i === 2
                                  ? 'bg-brand-100 text-brand-600'
                                  : 'bg-brand-50 text-brand-400'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-brand-50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500"
                            style={{ width: `${(c.registrations / maxReg) * 100}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-gray-600">{c.registrations}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-500">{c.approved}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-500">{c.published}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-bold text-brand-800">플레이 지표 (Play 서비스 연동)</h3>
          {play.data && (
            <button
              onClick={() => syncRewards.mutate()}
              disabled={syncRewards.isPending}
              className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
            >
              {syncRewards.isPending ? '정산 중…' : '사용도 보상 정산'}
            </button>
          )}
          {syncRewards.data && (
            <span className="text-xs text-brand-600">
              +{syncRewards.data.newlyAwarded}P 적립 (신규 정산 {syncRewards.data.settledContents}개 / 검토 {syncRewards.data.syncedContents}개)
            </span>
          )}
        </div>

        {play.isError ? (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700 shadow-card">
            Play 서비스 연동이 설정되지 않았거나 도달할 수 없습니다. (사용도 보상·플레이 통계는 연동 후 표시됩니다)
          </p>
        ) : !play.data ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-card">플레이 지표 불러오는 중…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="총 플레이" value={play.data.summary.totalPlays.toLocaleString()} />
              <Kpi label="학습자 수" value={String(play.data.summary.distinctLearners)} />
              <Kpi label="완료율" value={`${Math.round(play.data.summary.completionRate * 100)}%`} />
              <Kpi
               
                label="평균 별점"
                value={play.data.summary.avgRating != null ? play.data.summary.avgRating.toFixed(1) : '-'}
              />
            </div>

            {play.data.topContents.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-100 text-left text-xs text-gray-400">
                      <th className="px-4 py-3 font-semibold">콘텐츠</th>
                      <th className="px-4 py-3 font-semibold">플레이</th>
                      <th className="px-4 py-3 font-semibold">완료</th>
                      <th className="px-4 py-3 font-semibold">별점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {play.data.topContents.map((c) => (
                      <tr key={c.contentId} className="border-b border-brand-50 transition-colors last:border-0 hover:bg-brand-50/50">
                        <td className="px-4 py-3 font-medium">{c.title}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-gray-600">{c.uses}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-gray-500">{c.completions}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-gray-500">
                          {c.ratingAvg != null ? `${c.ratingAvg} (${c.ratingCount})` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {syncRewards.isError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            정산 실패: {syncRewards.error instanceof Error ? syncRewards.error.message : '알 수 없는 오류'}
          </p>
        )}
      </section>
    </main>
  )
}
