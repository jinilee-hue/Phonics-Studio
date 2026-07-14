import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import { mockThumb } from '../api/mock'
import type { Content, PlayStats, Stats, Status, TrendPoint } from '../api/types'
import { STATUS_LABEL, StatusBadge } from '../components/badges'
import starIcon from '../assets/ic_star.png'

/** 통계 KPI용 라인 아이콘 래퍼 */
const KpiIc = ({ children, className = 'text-brand-500' }: { children: ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 ${className}`} aria-hidden="true">
    {children}
  </svg>
)

/** 상태별 분포 목록 표시 순서 — 라이프사이클 순 */
const STATUS_ORDER: Status[] = [
  'published',
  'in_review',
  'approved',
  'suspended',
  'rejected',
  'archived',
  'draft',
]

/** 상태별 색(도넛·범례용 hex) */
const STATUS_HEX: Record<Status, string> = {
  draft: '#7c6bd0',
  in_review: '#3b82f6',
  approved: '#10b981',
  rejected: '#ef4444',
  published: '#1f2937',
  suspended: '#f97316',
  archived: '#94a3b8',
}

/** 상태 분포 도넛 차트 — 각 상태 비중을 링 세그먼트로. 가운데 전체 건수 표시 */
function StatusDonut({ entries, total }: { entries: { s: Status; count: number }[]; total: number }) {
  const R = 52
  const C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="relative mx-auto h-60 w-60 shrink-0">
      <svg viewBox="0 0 140 140" className="h-60 w-60 -rotate-90">
        <defs>
          {/* 시계방향 리빌 마스크 — 흰 아크가 dashoffset C→0으로 자라며 세그먼트를 시계방향 노출 */}
          <mask id="donutRevealMask">
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="#fff"
              strokeWidth={18}
              strokeDasharray={C}
              strokeDashoffset={C}
              style={{ animation: 'donutReveal 0.9s ease-out forwards' }}
            />
          </mask>
        </defs>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f0edf9" strokeWidth={16} />
        <g mask="url(#donutRevealMask)">
          {entries.map(({ s, count }) => {
            const seg = total > 0 ? (count / total) * C : 0
            const el = (
              <circle key={s} cx="70" cy="70" r={R} fill="none" stroke={STATUS_HEX[s]} strokeWidth={16} strokeDasharray={`${seg} ${C - seg}`} strokeDashoffset={-acc} />
            )
            acc += seg
            return el
          })}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-tight">
          <div className="text-4xl font-extrabold text-brand-800">{total}</div>
          <div className="mt-0.5 text-sm text-gray-400">전체</div>
        </div>
      </div>
    </div>
  )
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

function Kpi({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5 rounded-2xl bg-white p-4 shadow-card">
      {icon && <span className="grid h-6 w-6 shrink-0 place-items-center">{icon}</span>}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 [&>span]:whitespace-nowrap">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <span className="text-2xl font-extrabold text-brand-700">{value}</span>
      </div>
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
                    {/* 값 막대 — 4px 라운드 데이터엔드, 바닥 기준. 툴팁은 막대 상단 기준 10px 위 */}
                    <div
                      className={`relative rounded-t transition-all duration-150 ${
                        active ? 'bg-brand-600' : 'bg-gradient-to-t from-brand-300 to-brand-500'
                      }`}
                      style={{ height: t.count ? `max(${h}%, 4px)` : '0' }}
                    >
                      {active && (
                        <div
                          className={`pointer-events-none absolute bottom-full z-10 mb-2.5 whitespace-nowrap rounded-lg bg-brand-800 px-2.5 py-1.5 text-center shadow-lg ${alignCls(i)}`}
                        >
                          <div className="text-sm font-bold leading-none text-white">{t.count}건</div>
                          <div className="mt-1 text-[10px] leading-none text-brand-200">{fullDay(t.date)}</div>
                        </div>
                      )}
                    </div>
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
  // 도넛·범례용 분포(오른쪽 콘텐츠 리스트와 동일 데이터)
  const dist = shownStatuses.map((s) => ({ s, count: byStatusList[s].length }))
  const distTotal = allContents.length

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
        <Kpi
          label="총 콘텐츠"
          value={String(data.totalContents)}
          icon={<KpiIc><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></KpiIc>}
        />
        <Kpi
          label="창작자 수"
          value={String(data.totalCreators)}
          icon={<KpiIc><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></KpiIc>}
        />
        <Kpi
          label="승인율"
          value={`${Math.round(data.approvalRate * 100)}%`}
          icon={<KpiIc><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></KpiIc>}
        />
        <Kpi
          label="게시됨"
          value={String(data.byStatus.published ?? 0)}
          icon={<KpiIc><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></KpiIc>}
        />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-4 text-lg font-bold text-brand-800">상태별 분포</h3>

        <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
          {/* 좌 — 상태 분포 도넛(상단 센터) + 범례(하단 2열) */}
          <div className="flex flex-col items-center justify-center gap-5 rounded-lg bg-gray-50 p-4">
            <StatusDonut entries={dist} total={distTotal} />
            <ul className="grid w-full grid-cols-2 gap-x-12 gap-y-1.5 px-6">
              {dist.map(({ s, count }) => (
                <li key={s} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[s] }} />
                  <span className="text-gray-600">{STATUS_LABEL[s]}</span>
                  <span className="ml-auto tabular-nums text-gray-400">
                    <b className="text-gray-800">{count}</b> ({distTotal ? Math.round((count / distTotal) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 우 — 상태별 콘텐츠 리스트 (라이프사이클 순) */}
          <div className="modal-scroll max-h-96 overflow-auto px-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs">
                <th className="w-40 px-4 py-3">상태</th>
                <th className="px-4 py-3">콘텐츠명</th>
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
                  </tr>
                ))
              })}
            </tbody>
          </table>
            {allContents.length === 0 && <p className="py-4 text-center text-xs text-gray-400">등록된 콘텐츠가 없습니다.</p>}
          </div>
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
                            className="h-full origin-left rounded-full bg-gradient-to-r from-brand-400 to-brand-500 animate-[barGrow_0.7s_ease-out_both]"
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

      <section className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-bold text-brand-800">플레이 지표 (Play 서비스 연동)</h3>
          {play.data && (
            <button
              onClick={() => syncRewards.mutate()}
              disabled={syncRewards.isPending}
              className="group relative ml-auto inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
            >
              {syncRewards.isPending ? '정산 중…' : '사용도 보상 정산'}
              {/* 버튼 안 i — hover 시 안내(또는 정산 결과) 툴팁 */}
              <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-400 text-[10px] font-bold text-white">i</span>
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-brand-800/90 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block">
                {syncRewards.data
                  ? `+${syncRewards.data.newlyAwarded}P 적립 (신규 정산 ${syncRewards.data.settledContents}개 / 검토 ${syncRewards.data.syncedContents}개)`
                  : '게시 콘텐츠의 플레이(사용)량을 집계해 창작자에게 사용도 보상 포인트를 정산합니다.'}
              </span>
            </button>
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
              <Kpi
                label="총 플레이"
                value={play.data.summary.totalPlays.toLocaleString()}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand-500" aria-hidden="true"><path d="M8.2 5.68 L17.8 10.82 Q20 12 17.8 13.18 L8.2 18.32 Q6 19.5 6 17 L6 7 Q6 4.5 8.2 5.68 Z" /></svg>}
              />
              <Kpi
                label="학습자 수"
                value={String(play.data.summary.distinctLearners)}
                icon={<KpiIc><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></KpiIc>}
              />
              <Kpi
                label="완료율"
                value={`${Math.round(play.data.summary.completionRate * 100)}%`}
                icon={<KpiIc><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></KpiIc>}
              />
              <Kpi
                label="평균 별점"
                value={play.data.summary.avgRating != null ? play.data.summary.avgRating.toFixed(1) : '-'}
                icon={<KpiIc><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" /></KpiIc>}
              />
            </div>

            {play.data.topContents.length > 0 && (
              <div className="mt-8 overflow-x-auto">
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
                    {play.data.topContents.map((c) => {
                      const thumb = mockThumb(c.contentId) ?? `/api/contents/${c.contentId}/thumb`
                      return (
                      <tr key={c.contentId} className="border-b border-brand-50 transition-colors last:border-0 hover:bg-brand-50/50">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2.5">
                            <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                            <span className="min-w-0 truncate">{c.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-gray-600">{c.uses}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-gray-500">{c.completions}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-gray-500">
                          {c.ratingAvg != null ? (
                            <span className="inline-flex items-center justify-center gap-1">
                              <img src={starIcon} alt="" className="h-4 w-4" />
                              {c.ratingAvg} ({c.ratingCount})
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                      )
                    })}
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
