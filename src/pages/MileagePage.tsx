import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { mockThumb } from '../api/mock'
import type { Content, PointsResult } from '../api/types'
import pointImage from '../assets/point_images.png'
import pointImage2 from '../assets/point_images2.png'
import pointMonster from '../assets/point_monster.png'
import pointMonsterBlink from '../assets/point_monster_blink.png'

const EVENT_LABEL: Record<string, string> = {
  register: '콘텐츠 등록',
  publish: '콘텐츠 게시',
  signup_bonus: '가입 보너스',
  approve_reward: '승인 보상',
  publish_bonus: '게시 보너스',
  usage_reward: '사용도 보상',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

/** 포인트 동전 — 그림자 + 코인 모양 마스크 위 빛 반짝임(shine sweep) */
function Coin({ className = '' }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute block ${className}`}>
      <img src={pointImage} alt="" className="h-full w-full object-contain drop-shadow-lg" />
    </span>
  )
}

/** 내 포인트 — 적립 합계 + 내역 (조회 전용) */
export function MileagePage() {
  const { data } = useQuery<PointsResult>({
    queryKey: ['points'],
    queryFn: () => api.get('/api/me/points'),
  })
  // 적립 내역의 contentId → 콘텐츠 제목/썸네일 매핑
  const { data: mine = [] } = useQuery<Content[]>({
    queryKey: ['mine'],
    queryFn: () => api.get('/api/contents/mine'),
  })
  const contentOf = (id: number | null) => (id != null ? mine.find((c) => c.id === id) : undefined)
  const thumbOf = (id: number) => mockThumb(id) ?? `/api/contents/${id}/thumb`

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h2 className="text-[22px] font-bold text-brand-800">포인트</h2>

      <section
        style={{ backgroundColor: '#ffd43b' }}
        className="relative flex items-center gap-5 rounded-2xl px-6 py-3 shadow-card"
      >
        {/* 노란 배경에 흩날리는 블러 동전 장식 */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
          <img src={pointImage2} alt="" className="absolute left-[4%] top-1 h-20 w-20 rotate-[14deg] object-contain opacity-90 blur-[1px]" />
          <img src={pointImage2} alt="" className="absolute left-[18%] -bottom-1 h-32 w-32 rotate-[-16deg] object-contain opacity-75 blur-[1.5px]" />
          <img src={pointImage2} alt="" className="absolute left-[36%] -top-1 h-16 w-16 rotate-[40deg] object-contain opacity-85 blur-[1px]" />
          <img src={pointImage2} alt="" className="absolute left-[50%] bottom-2 h-36 w-36 rotate-[8deg] object-contain opacity-70 blur-[2px]" />
          <img src={pointImage2} alt="" className="absolute right-[22%] top-2 h-20 w-20 rotate-[-24deg] object-contain opacity-85 blur-[1px]" />
          <img src={pointImage2} alt="" className="absolute right-[5%] -bottom-1 h-28 w-28 rotate-[12deg] object-contain opacity-75 blur-[1.5px]" />
          <img src={pointImage2} alt="" className="absolute right-[1%] top-4 h-16 w-16 rotate-[-10deg] object-contain opacity-85 blur-[1px]" />
          <img src={pointImage2} alt="" className="absolute left-[44%] top-8 h-14 w-14 rotate-[24deg] object-contain opacity-90 blur-[0.5px]" />
        </div>
        <div className="relative z-10 h-56 w-72 shrink-0">
          {/* 몬스터 뒤 핑크 반원(돔) 배경 — 캐릭터 머리보다 살짝 위로 */}
          <span
            aria-hidden="true"
            style={{ backgroundColor: '#f24aa8' }}
            className="pointer-events-none absolute bottom-6 left-1/2 z-0 h-48 w-56 -translate-x-1/2 rounded-t-full"
          />
          {/* 몬스터(뜬 눈) + 눈감은 프레임 오버레이로 깜박임 */}
          <img
            src={pointMonster}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-[calc(50%+2.75rem)] top-[9px] z-10 h-[12.5rem] w-[12.5rem] -translate-x-1/2 object-contain drop-shadow-[0_14px_12px_rgba(80,40,10,0.3)]"
          />
          <img
            src={pointMonsterBlink}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-[calc(50%+2.75rem)] top-[9px] z-10 h-[12.5rem] w-[12.5rem] -translate-x-1/2 object-contain opacity-0 animate-[monsterBlink_5s_ease-in-out_infinite]"
          />
          {/* 좌우 동전 — 크기 차이(왼쪽 크게, 오른쪽 작게), 몬스터 발치까지 */}
          <Coin className="-bottom-9 left-0 z-20 h-[10.5rem] w-[10.5rem]" />
          <Coin className="-bottom-7 right-0 z-20 h-[7.5rem] w-[7.5rem]" />
        </div>
        <div className="relative z-10 min-w-0">
          <h2
            style={{ textShadow: 'none' }}
            className="mb-1 inline-block border-b-2 border-brand-700 pb-1 text-[22px] font-bold text-brand-800"
          >
            내 포인트
          </h2>
          <p className="text-lg text-gray-500">콘텐츠 등록·게시로 포인트가 적립됩니다.</p>
        </div>
        <div className="relative z-10 ml-auto mr-6 flex shrink-0 items-stretch gap-4">
          {/* 포인트 점수 — 버튼 크기의 흰 라운드 박스 */}
          <div className="flex items-baseline justify-center gap-1.5 rounded-2xl bg-white px-9 py-9 shadow-sm">
            <span className="text-[40px] font-extrabold leading-none text-brand-700">
              {(data?.points ?? 0).toLocaleString()}
            </span>
            <span className="text-xl font-semibold text-gray-400">P</span>
          </div>
          <Link
            to="/studio"
            className="inline-flex flex-col items-start justify-center gap-1 rounded-2xl bg-brand-700 px-9 py-9 text-left text-xl font-bold leading-tight text-white shadow-sm transition hover:brightness-110"
          >
          <span>포인트</span>
          <span className="inline-flex items-center gap-1">
            적립하기
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
          </Link>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold text-brand-800">적립 내역</h3>
        {!data || data.entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">아직 적립 내역이 없어요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs">
                  <th className="px-4 py-3">콘텐츠</th>
                  <th className="px-4 py-3">이벤트</th>
                  <th className="px-4 py-3">포인트</th>
                  <th className="px-4 py-3">일시</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={i} style={{ backgroundColor: '#fff' }} className="border-b border-brand-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {e.contentId != null ? (
                          <img
                            src={thumbOf(e.contentId)}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-brand-50" />
                        )}
                        <span className="font-medium text-brand-800">
                          {contentOf(e.contentId)?.title ?? (e.contentId != null ? `#${e.contentId}` : '전체 계정')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {EVENT_LABEL[e.eventType] ?? e.eventType}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-brand-700">
                      <span className="inline-flex items-center justify-center gap-1">
                        <img src={pointImage2} alt="" className="h-5 w-5 shrink-0 object-contain" />
                        +{e.amount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">{formatDate(e.createdAt)}</td>
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
