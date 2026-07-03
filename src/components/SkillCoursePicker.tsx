import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
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
  const primary = skills.find((s) => s.isPrimary)?.skillCode ?? null

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

  const toggle = (code: string) => {
    if (selected.has(code)) onSkillsChange(skills.filter((s) => s.skillCode !== code))
    else onSkillsChange([...skills, { skillCode: code, isPrimary: false }])
  }
  const togglePrimary = (code: string) =>
    onSkillsChange(skills.map((s) => ({ ...s, isPrimary: s.skillCode === code && primary !== code })))

  return (
    <div className="space-y-3">
      {/* 코스(레벨) 선택 — 스킬 목록을 동적으로 필터 */}
      <div>
        <span className="mb-1 block text-xs font-semibold text-gray-500">코스(레벨)</span>
        <div className="flex flex-wrap gap-1 rounded-xl bg-brand-50 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => onCourseChange(null)}
            className={`rounded-lg px-3 py-1.5 ${courseCode === null ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-400'}`}
          >
            전체
          </button>
          {courses.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => onCourseChange(c.code)}
              title={`${c.series}${c.textbookLevel ? ` · ${c.textbookLevel}` : ''} · 스킬 ${c.skillCodes.length}개`}
              className={`rounded-lg px-3 py-1.5 ${courseCode === c.code ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-400'}`}
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

      {/* 선택된 스킬 칩 — 코스 필터 밖이어도 유지·표시 */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s.skillCode}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                s.isPrimary ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'
              }`}
              title={s.skillCode}
            >
              {s.isPrimary ? '★ ' : ''}
              {labelFor(s.skillCode)}
              <button
                type="button"
                onClick={() => toggle(s.skillCode)}
                className="ml-0.5 leading-none opacity-60 hover:opacity-100"
                aria-label={`${s.skillCode} 제거`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {skills.length > 0 && !primary && (
        <p className="text-xs text-amber-600">★를 눌러 주 스킬 1개를 지정하세요.</p>
      )}

      {/* 스킬 목록 (도메인 그룹 + 검색) */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">
            스킬 태그 (★ = 주 스킬, 하나만) · {filtered.length}개 표시
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="스킬 검색"
            className="rounded-lg border border-brand-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
          />
        </div>
        {options.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            스킬 목록을 불러올 수 없습니다(택소노미 미설정).
          </p>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-brand-100 bg-white p-1.5">
            {groups.map((g) => (
              <div key={g.domain}>
                <div className="sticky top-0 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {g.domain}
                </div>
                {g.items.map((o) => {
                  const on = selected.has(o.code)
                  return (
                    <div
                      key={o.code}
                      className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${on ? 'bg-brand-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(o.code)}
                        className="accent-brand-600"
                      />
                      <button
                        type="button"
                        onClick={() => on && togglePrimary(o.code)}
                        disabled={!on}
                        title="주 스킬로 지정"
                        className={`text-base leading-none ${primary === o.code ? 'text-brand-600' : 'text-gray-300'} disabled:opacity-40`}
                      >
                        ★
                      </button>
                      <span className="flex-1 text-gray-700">{o.label}</span>
                      <span className="text-[10px] text-gray-400">{o.code}</span>
                    </div>
                  )
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-gray-400">일치하는 스킬 없음</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
