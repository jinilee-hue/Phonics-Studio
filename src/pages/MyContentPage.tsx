import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../api/client'
import { EDITABLE_STATUSES } from '../api/types'
import type { AnalyzeResult, Content, ContentUpdate, Course, SkillOption, SkillTag } from '../api/types'
import { KindBadge, StatusBadge } from '../components/badges'
import { PreviewModal } from '../components/PreviewModal'
import { SkillCoursePicker } from '../components/SkillCoursePicker'

const isEditable = (c: Content) => EDITABLE_STATUSES.includes(c.status)

/** 내 콘텐츠 목록 — 본인 콘텐츠 + 승인 전(EDITABLE_STATUSES)만 인라인 수정(J MyContentPage).
 * 편집 폼은 코스→스킬 동적 피커(SkillCoursePicker)를 쓴다. */
export function MyContentPage() {
  const qc = useQueryClient()
  const { data: mine = [] } = useQuery<Content[]>({
    queryKey: ['mine'],
    queryFn: () => api.get('/api/contents/mine'),
  })
  const { data: skillOptions = [] } = useQuery<SkillOption[]>({
    queryKey: ['skills'],
    queryFn: () => api.get('/api/skills'),
    staleTime: 300_000,
  })
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get('/api/courses'),
    staleTime: 300_000,
  })
  const [preview, setPreview] = useState<Content | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const submit = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/contents/${id}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mine'] }),
  })

  const labelFor = useMemo(() => {
    const m = new Map(skillOptions.map((o) => [o.code, o.label]))
    return (code: string) => m.get(code) ?? code
  }, [skillOptions])

  const courseLabelFor = useMemo(() => {
    const m = new Map(courses.map((c) => [c.code, c.label]))
    return (code: string) => m.get(code) ?? code
  }, [courses])

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-800">내 콘텐츠 ({mine.length})</h2>
          <p className="text-sm text-gray-500">승인 전(작성 중·반려)에만 제목·설명·코스·스킬을 수정할 수 있어요.</p>
        </div>
      </div>

      <div className="space-y-3">
        {mine.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            아직 등록한 콘텐츠가 없어요. 스튜디오에서 새 콘텐츠를 등록해보세요.
          </p>
        )}
        {mine.map((c) => (
          <div key={c.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-card">
            {c.hasThumb && (
              <img
                src={`/api/contents/${c.id}/thumb`}
                alt=""
                className="h-16 w-24 shrink-0 rounded-lg border border-brand-100 object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{c.title}</span>
              <KindBadge kind={c.kind} />
              <StatusBadge status={c.status} />
              {c.courseCode && (
                <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700" title={c.courseCode}>
                  {c.courseCode}
                  {courseLabelFor(c.courseCode) !== c.courseCode && ` · ${courseLabelFor(c.courseCode)}`}
                </span>
              )}
              <span className="ml-auto flex gap-2">
                <button
                  onClick={() => setPreview(c)}
                  className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  미리보기
                </button>
                {isEditable(c) && (
                  <button
                    onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                    className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                  >
                    {editingId === c.id ? '수정 닫기' : '수정'}
                  </button>
                )}
                {isEditable(c) && (
                  <button
                    onClick={() => submit.mutate(c.id)}
                    disabled={submit.isPending}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {c.status === 'rejected' ? '재제출' : '제출'}
                  </button>
                )}
              </span>
            </div>

            {c.description && <p className="mt-1 text-sm text-gray-500">{c.description}</p>}

            {c.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.skills.map((s) => (
                  <span
                    key={s.skillCode}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.isPrimary ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'
                    }`}
                    title={s.skillCode}
                  >
                    {s.isPrimary ? '★ ' : ''}
                    {labelFor(s.skillCode)}
                  </span>
                ))}
              </div>
            )}

            {c.status === 'rejected' && c.rejectReason && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">반려 사유: {c.rejectReason}</p>
            )}

            {editingId === c.id && <EditForm content={c} onClose={() => setEditingId(null)} />}
            </div>
          </div>
        ))}
      </div>

      {preview && <PreviewModal content={preview} onClose={() => setPreview(null)} />}
    </main>
  )
}

function EditForm({ content, onClose }: { content: Content; onClose: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState(content.title)
  const [description, setDescription] = useState(content.description)
  const [course, setCourse] = useState<string | null>(content.courseCode)
  const [skills, setSkills] = useState<SkillTag[]>(content.skills)
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [thumbVer, setThumbVer] = useState(0) // 교체 후 이미지 캐시 무효화용

  const hasPrimary = skills.some((s) => s.isPrimary)
  const canThumb = content.kind === 'html' || content.kind === 'zip'

  const setThumb = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData()
      fd.set('file', f)
      return api.postForm<Content>(`/api/contents/${content.id}/thumb`, fd)
    },
    onSuccess: () => {
      setThumbVer((v) => v + 1)
      qc.invalidateQueries({ queryKey: ['mine'] })
    },
  })

  const analyze = useMutation({
    mutationFn: () => api.post<AnalyzeResult>(`/api/contents/${content.id}/analyze`),
    onSuccess: (data) => {
      setAnalysis(data)
      if (data.confident) {
        const code = data.suggested.skillCode
        if (code) {
          // 제안 스킬을 주 스킬로 채택 (기존 선택은 보조로 유지)
          setSkills((prev) => [
            { skillCode: code, isPrimary: true },
            ...prev.filter((s) => s.skillCode !== code).map((s) => ({ ...s, isPrimary: false })),
          ])
        }
      }
      qc.invalidateQueries({ queryKey: ['mine'] })
    },
  })

  const save = useMutation({
    mutationFn: () => {
      const body: ContentUpdate = {
        title: title.trim(),
        description: description.trim(),
        courseCode: course ?? '',
        skills,
      }
      return api.patch<Content>(`/api/contents/${content.id}`, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mine'] })
      onClose()
    },
  })

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      {canThumb && (
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand-100 bg-white">
            {content.hasThumb ? (
              <img src={`/api/contents/${content.id}/thumb?v=${thumbVer}`} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] text-gray-400">썸네일 없음</span>
            )}
          </div>
          <div>
            <label className="cursor-pointer rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50">
              {content.hasThumb ? '썸네일 변경' : '썸네일 등록'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setThumb.mutate(f)
                  e.target.value = ''
                }}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-[10px] text-gray-400">PNG·JPG·WebP·GIF · 5MB (SVG 미지원)</p>
            {setThumb.isError && (
              <p className="mt-1 text-[10px] text-red-600">
                {setThumb.error instanceof Error ? setThumb.error.message : '업로드 실패'}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {analyze.isPending ? '분석 중…' : '✨ AI 자동 분석'}
        </button>
        {analysis && (
          <span className="text-xs text-gray-500">
            확신도 {(analysis.suggested.confidence * 100).toFixed(0)}%
            {analysis.confident ? ' · 스킬 자동 채움 완료' : ' · 낮아 미반영'}
          </span>
        )}
      </div>
      {analysis && (
        <div className="space-y-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          {analysis.suggested.title && (
            <div className="flex flex-wrap items-center gap-2">
              제안 제목: <b>{analysis.suggested.title}</b>
              <button
                type="button"
                onClick={() => setTitle(analysis.suggested.title as string)}
                className="rounded border border-indigo-300 px-2 py-0.5 font-semibold hover:bg-indigo-100"
              >
                제목에 적용
              </button>
            </div>
          )}
          {analysis.warnings.map((w, i) => (
            <div key={i} className="text-amber-700">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
      {analyze.isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          분석 실패: {analyze.error instanceof Error ? analyze.error.message : '알 수 없는 오류'}
        </p>
      )}

      <label className="block text-xs font-semibold text-gray-500">
        제목
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal text-gray-800 outline-none focus:border-brand-500"
        />
      </label>
      <label className="block text-xs font-semibold text-gray-500">
        설명
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal text-gray-800 outline-none focus:border-brand-500"
        />
      </label>

      <SkillCoursePicker
        skills={skills}
        onSkillsChange={setSkills}
        courseCode={course}
        onCourseChange={setCourse}
      />

      {save.isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          저장 실패: {save.error instanceof Error ? save.error.message : '알 수 없는 오류'}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !title.trim() || !hasPrimary}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {save.isPending ? '저장 중…' : '저장'}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
        >
          취소
        </button>
        {!hasPrimary && <span className="text-xs text-gray-400">주 스킬(★) 1개를 지정해야 저장할 수 있어요.</span>}
      </div>
    </div>
  )
}
