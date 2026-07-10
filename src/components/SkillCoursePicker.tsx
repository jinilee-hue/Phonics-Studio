import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Course, SkillOption, SkillTag } from '../api/types'

interface Props {
  skills: SkillTag[]
  onSkillsChange: (skills: SkillTag[]) => void
  courseCode: string | null
  onCourseChange: (code: string | null) => void
}

/** 코스(레벨)→스킬 동적 연동 피커 — maps.course·skill·skill_course 기반.
 * 코스 필을 고르면 그 코스에 매핑된 스킬만 목록에 표시되고(매핑 0건 코스는 전체+안내),
 * 선택된 스킬은 필터 밖이어도 상단 칩으로 유지된다. ★=주 스킬(하나만). */
export function SkillCoursePicker({ skills, onSkillsChange, courseCode, onCourseChange }: Props) {
  const [query, setQuery] = useState('')
  // 드래그 중 강조할 드롭 영역
  const [dragOver, setDragOver] = useState<'primary' | 'additional' | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get('/api/courses'),
    staleTime: 300_000,
  })
  const { data: options = [] } = useQuery<SkillOption[]>({
    queryKey: ['skills'],
    queryFn: () => api.get('/api/skills'),
    staleTime: 300_000,
  })

  const labelFor = useMemo(() => {
    const m = new Map(options.map((o) => [o.code, o.label]))
    return (code: string) => m.get(code) ?? code
  }, [options])

  const selected = useMemo(() => new Set(skills.map((s) => s.skillCode)), [skills])
  const primarySkill = skills.find((s) => s.isPrimary) ?? null
  const additionalSkills = skills.filter((s) => !s.isPrimary)

  const activeCourse = courses.find((c) => c.code === courseCode) ?? null
  const courseHasMapping = !!activeCourse && activeCourse.skillCodes.length > 0
  const courseFilter = courseHasMapping ? new Set(activeCourse.skillCodes) : null

  const q = query.trim().toLowerCase()
  const filtered = options.filter(
    (o) =>
      (!courseFilter || courseFilter.has(o.code)) &&
      (!q || o.code.toLowerCase().includes(q) || o.label.toLowerCase().includes(q)),
  )
  // 도메인별 그룹 (백엔드가 domain_no·sort_order 순으로 내려줌 → 등장 순서 유지)
  const groups = useMemo(() => {
    const out: { domain: string; items: SkillOption[] }[] = []
    for (const o of filtered) {
      const last = out[out.length - 1]
      if (last && last.domain === o.domainLabel) last.items.push(o)
      else out.push({ domain: o.domainLabel, items: [o] })
    }
    return out
  }, [filtered])

  // 리스트 칩 클릭 → 추가 스킬로 담기
  const addAdditional = (code: string) => {
    if (selected.has(code)) return
    onSkillsChange([...skills, { skillCode: code, isPrimary: false }])
  }
  // 영역에서 스킬 제거 → 다시 리스트로 돌아감
  const removeSkill = (code: string) => onSkillsChange(skills.filter((s) => s.skillCode !== code))
  // 추가 스킬을 주 스킬로 승격 — 기존 주 스킬은 추가 스킬로 강등(유지)
  const promotePrimary = (code: string) =>
    onSkillsChange([
      ...skills.filter((s) => s.skillCode !== code).map((s) => ({ ...s, isPrimary: false })),
      { skillCode: code, isPrimary: true },
    ])

  // 리스트(풀)에 표시할 그룹 — 아직 담지 않은 스킬만, 빈 그룹 제외 (도메인별 2열 배치용)
  const poolGroups = groups
    .map((g) => ({ domain: g.domain, items: g.items.filter((o) => !selected.has(o.code)) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="space-y-3">
      {/* 코스(레벨) 선택 — 스킬 목록을 동적으로 필터 */}
      <div>
        <span className="mb-1 block text-xs font-semibold text-gray-500">코스(레벨)</span>
        <div className="flex flex-wrap gap-1.5 text-sm font-semibold">
          <button
            type="button"
            onClick={() => onCourseChange(null)}
            className={`rounded-lg px-3 py-1.5 ${courseCode === null ? 'bg-brand-700 font-bold text-white shadow-sm' : 'bg-brand-50 text-gray-500 hover:bg-brand-100'}`}
          >
            전체
          </button>
          {courses.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => onCourseChange(c.code)}
              title={`${c.series}${c.textbookLevel ? ` · ${c.textbookLevel}` : ''} · 스킬 ${c.skillCodes.length}개`}
              className={`rounded-lg px-3 py-1.5 ${courseCode === c.code ? 'bg-brand-700 font-bold text-white shadow-sm' : 'bg-brand-50 text-gray-500 hover:bg-brand-100'}`}
            >
              {c.code}
              <span className="ml-1 text-[10px] font-normal opacity-70">{c.label}</span>
            </button>
          ))}
        </div>
        {activeCourse && !courseHasMapping && (
          <p className="mt-1 text-xs text-amber-600">
            이 코스는 스킬 매핑이 아직 없어 전체 스킬을 표시합니다.
          </p>
        )}
      </div>

      {/* 스킬 — 리스트에서 클릭해 담고, 아래 주/추가 영역으로 배정 */}
      {options.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          스킬 목록을 불러올 수 없습니다(택소노미 미설정).
        </p>
      ) : (
        <div>
          <span className="mb-1 block text-xs font-semibold text-gray-500">
            스킬 <span className="text-red-400">*</span>
          </span>
          <div className="space-y-3 rounded-xl border border-brand-200 p-3">
          {/* 스킬 리스트(풀) — 클릭해서 아래 영역으로 담기 */}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500">
                스킬 리스트 <span className="font-normal text-gray-400">· 드래그 또는 클릭</span>
              </span>
              <div className="relative shrink-0">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="스킬 검색"
                  className="w-40 rounded-lg border border-brand-200 py-1 pl-3 pr-8 text-xs outline-none focus:border-brand-500 sm:w-56"
                />
                <button
                  type="button"
                  onClick={() => searchRef.current?.focus()}
                  aria-label="검색"
                  className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-brand-500 hover:text-brand-700"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-brand-50/50">
              <div className="grid max-h-44 grid-cols-2 gap-y-2.5 overflow-y-auto p-2">
                {poolGroups.map((g, i) => (
                  <div key={g.domain} className={i % 2 === 0 ? 'pr-3' : 'border-l border-brand-100 pl-3'}>
                    <div className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      {g.domain}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((o) => (
                        <button
                          key={o.code}
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', o.code)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onClick={() => (primarySkill ? addAdditional(o.code) : promotePrimary(o.code))}
                          title={o.code}
                          className="cursor-grab rounded-full border border-brand-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-brand-400 hover:bg-brand-50 active:cursor-grabbing"
                        >
                          + {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {poolGroups.length === 0 && (
                  <p className="col-span-2 px-2 py-3 text-center text-xs text-gray-400">담을 스킬이 없어요</p>
                )}
              </div>
            </div>
          </div>

          {/* 주 스킬(좌) · 추가 스킬(우) — 위 리스트(모음|자음)와 동일한 50/50 그리드로 라벨 정렬 */}
          <div className="grid grid-cols-2">
            {/* 주 스킬 (1개 필수) */}
            <div className="pr-3">
              <span className="mb-1 block text-xs font-semibold text-gray-500">
                주 스킬 <span className="text-red-400">*</span>
              </span>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOver('primary')
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  const code = e.dataTransfer.getData('text/plain')
                  setDragOver(null)
                  if (code) promotePrimary(code)
                }}
                className={`flex min-h-[4.5rem] flex-wrap content-center items-center gap-1.5 rounded-xl border border-dashed p-2.5 transition ${
                  dragOver === 'primary' ? 'border-brand-500 bg-brand-100' : 'border-brand-300 bg-brand-50/30'
                }`}
              >
                {primarySkill ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white"
                    title={primarySkill.skillCode}
                  >
                    {labelFor(primarySkill.skillCode)}
                    <button
                      type="button"
                      onClick={() => removeSkill(primarySkill.skillCode)}
                      className="ml-0.5 leading-none opacity-70 hover:opacity-100"
                      aria-label="주 스킬 제거"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <span className="w-full text-center text-xs text-gray-400">여기로 드래그하거나 리스트에서 클릭하세요</span>
                )}
              </div>
            </div>

            {/* 추가 스킬 (여러 개) — 주 스킬 지정 후 활성화 */}
            <div className="border-l border-brand-100 pl-3">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  추가 스킬 <span className="font-normal text-gray-400">여러 개 가능</span>
                </span>
                <span className="shrink-0 text-[11px] text-gray-400">{additionalSkills.length}개</span>
              </div>
              <div
                onDragOver={(e) => {
                  if (!primarySkill) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOver('additional')
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  if (!primarySkill) return
                  e.preventDefault()
                  const code = e.dataTransfer.getData('text/plain')
                  setDragOver(null)
                  if (code) addAdditional(code)
                }}
                className={`flex min-h-[4.5rem] flex-wrap content-center items-center gap-1.5 rounded-xl border border-dashed p-2.5 transition ${
                  !primarySkill
                    ? 'border-gray-200 bg-gray-50/60'
                    : dragOver === 'additional'
                      ? 'border-brand-500 bg-brand-100'
                      : 'border-brand-300 bg-brand-50/30'
                }`}
              >
                {!primarySkill ? (
                  <span className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    주 스킬을 먼저 지정하세요
                  </span>
                ) : additionalSkills.length > 0 ? (
                  additionalSkills.map((s) => (
                    <span
                      key={s.skillCode}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700"
                      title={s.skillCode}
                    >
                      {labelFor(s.skillCode)}
                      <button
                        type="button"
                        onClick={() => removeSkill(s.skillCode)}
                        className="ml-0.5 leading-none opacity-60 hover:opacity-100"
                        aria-label="제거"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="w-full text-center text-xs text-gray-400">여기로 드래그하거나 리스트에서 클릭하세요</span>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
