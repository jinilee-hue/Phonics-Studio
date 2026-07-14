import { useEffect, useMemo, useRef, useState } from 'react'

/** YYYY-MM-DD 파싱/포맷 유틸 */
const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

/** 커스텀 날짜 선택 — 네이티브 date 팝업 대신 poly-dashboard kit 스타일의 브랜드(보라) 달력.
 * 트리거(흰 배경 + 달력 아이콘) + 플로팅 캘린더(월 이동·오늘·삭제). 바깥 클릭·Esc로 닫힘. */
export function DatePicker({
  value,
  onChange,
  placeholder = '연도-월-일',
  min,
  max,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: string
  max?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const today = useMemo(() => new Date(), [])
  const todayStr = fmt(today.getFullYear(), today.getMonth(), today.getDate())

  // 보이는 달(연·월) — 선택값이 있으면 그 달, 없으면 오늘
  const initY = value ? Number(value.slice(0, 4)) : today.getFullYear()
  const initM = value ? Number(value.slice(5, 7)) - 1 : today.getMonth()
  const [view, setView] = useState({ y: initY, m: initM })

  useEffect(() => {
    if (open) setView({ y: initY, m: initM })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 달력 셀(6주 × 7일) — 이전달 꼬리 + 이번달 + 다음달 머리
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay()
    const days = new Date(view.y, view.m + 1, 0).getDate()
    const arr: { y: number; m: number; d: number; cur: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const dayNum = i - first + 1
      const dt = new Date(view.y, view.m, dayNum)
      arr.push({ y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate(), cur: dayNum >= 1 && dayNum <= days })
    }
    return arr
  }, [view])

  const move = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  const disabled = (s: string) => Boolean((min && s < min) || (max && s > max))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        style={{ borderRadius: '0.5rem' }}
        className={`flex items-center gap-2 border bg-white py-2 pl-3 pr-2.5 text-sm transition ${
          open ? 'border-brand-500 ring-2 ring-brand-100' : 'border-brand-200 hover:border-brand-400'
        }`}
      >
        <span className={`whitespace-nowrap ${value ? 'text-gray-700' : 'text-gray-400'}`}>{value || placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-64 rounded-xl border border-brand-100 bg-white p-3 shadow-modal">
          {/* 헤더 — 연·월 + 이전/다음달 */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-brand-800">{view.y}년 {view.m + 1}월</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(-1)} aria-label="이전 달" className="grid h-7 w-7 place-items-center rounded-lg text-gray-400 hover:bg-brand-50 hover:text-brand-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button type="button" onClick={() => move(1)} aria-label="다음 달" className="grid h-7 w-7 place-items-center rounded-lg text-gray-400 hover:bg-brand-50 hover:text-brand-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>

          {/* 요일 */}
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400">
            {WEEK.map((w, i) => (
              <span key={w} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : ''}>{w}</span>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {cells.map((c, i) => {
              const s = fmt(c.y, c.m, c.d)
              const isSel = value === s
              const isToday = todayStr === s
              const dis = disabled(s)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dis}
                  onClick={() => { onChange(s); setOpen(false) }}
                  className={`grid h-8 w-8 place-items-center rounded-lg text-sm transition ${
                    isSel
                      ? 'bg-brand-600 font-bold text-white'
                      : !c.cur
                        ? 'text-gray-300 hover:bg-brand-50'
                        : dis
                          ? 'cursor-not-allowed text-gray-300'
                          : `${isToday ? 'font-bold text-brand-700 ring-1 ring-brand-300' : 'text-gray-700'} hover:bg-brand-50`
                  }`}
                >
                  {c.d}
                </button>
              )
            })}
          </div>

          {/* 푸터 — 삭제 / 오늘 */}
          <div className="mt-2 flex items-center justify-between border-t border-brand-50 pt-2 text-sm font-semibold">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-gray-400 hover:text-red-500">삭제</button>
            <button type="button" onClick={() => { onChange(todayStr); setOpen(false) }} className="text-brand-600 hover:text-brand-700">오늘</button>
          </div>
        </div>
      )}
    </div>
  )
}
