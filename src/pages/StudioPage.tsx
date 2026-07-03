import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { AnalyzeSuggestion, Content, SkillTag } from '../api/types'
import { SkillCoursePicker } from '../components/SkillCoursePicker'

type FileType = 'html' | 'zip' | 'video'

const FILE_TYPES: { value: FileType; label: string; accept: string; hint: string }[] = [
  { value: 'html', label: 'HTML', accept: '.html', hint: '단일 HTML 게임 파일' },
  { value: 'zip', label: 'ZIP', accept: '.zip', hint: '정적 빌드(dist/out) 후 ZIP파일로 묶어주세요' },
  { value: 'video', label: '비디오', accept: '.mp4,.webm', hint: 'mp4 · webm' },
]

interface Candidate {
  id: number
  source: 'embedded' | 'render'
  dataUrl: string
}

/** 업로드 콘텐츠(SPA 포함)가 same-origin으로 호출 가능한 플랫폼 API — 패널·MD 공용 */
const PLATFORM_APIS: { method: string; path: string; desc: string }[] = [
  { method: 'POST', path: '/api/v1/words/generate', desc: 'Silent-e 단어쌍 생성' },
  { method: 'POST', path: '/api/v1/quiz/generate', desc: '객관식 퀴즈 생성' },
  { method: 'GET·POST', path: '/api/v1/tts/speech', desc: '텍스트→음성(MP3)' },
  { method: 'POST', path: '/api/v1/speech/token', desc: 'Azure Speech 단기 토큰' },
]

/** 플랫폼 API 참고 문서를 Markdown 파일로 다운로드 */
function downloadPlatformApiMd() {
  const lines = [
    '# Phonics Studio — 콘텐츠용 플랫폼 API',
    '',
    '업로드한 콘텐츠(SPA 포함)는 **같은 출처(same-origin)** 에서 아래 API를 호출할 수 있습니다.',
    "외부 도메인 통신은 차단됩니다 (CSP `connect-src 'self'`).",
    '',
    '## 엔드포인트',
    ...PLATFORM_APIS.map((a) => `- \`${a.method} ${a.path}\` — ${a.desc}`),
    '',
    '## 호출 예시',
    '```js',
    "// 단어쌍 생성",
    "const res = await fetch('/api/v1/words/generate', {",
    "  method: 'POST',",
    "  headers: { 'Content-Type': 'application/json' },",
    "  body: JSON.stringify({ count: 6 }),",
    '})',
    'const { items } = await res.json()',
    '',
    "// TTS (오디오 재생)",
    "const audio = new Audio('/api/v1/tts/speech?text=' + encodeURIComponent('cat'))",
    'audio.play()',
    '```',
    '',
    '> 키 미설정 시 단어/퀴즈는 mock 폴백, TTS/토큰은 503으로 응답합니다.',
    '',
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'phonics-platform-api.md'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(bytes / 1024)}KB`
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], name, { type: 'image/png' })
}

type ThumbPreview =
  | { kind: 'html'; src: string }
  | { kind: 'video'; url: string }
  | { kind: 'icon'; icon: string; label: string }

/** 선택한 파일의 즉시 썸네일 미리보기 — html은 sandbox iframe, 비디오는 objectURL 프레임,
 * zip은 아이콘(등록 후 서버 자동 캡처가 대체). objectURL은 파일 변경 시 정리. */
function useThumbPreview(file: File | null): ThumbPreview | null {
  const [preview, setPreview] = useState<ThumbPreview | null>(null)
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const ext = file.name.toLowerCase().split('.').pop() ?? ''
    if (ext === 'html') {
      let cancelled = false
      const reader = new FileReader()
      reader.onload = () => {
        if (!cancelled) setPreview({ kind: 'html', src: String(reader.result ?? '') })
      }
      reader.readAsText(file)
      return () => {
        cancelled = true // 파일 변경/해제 시 이전 read의 stale 미리보기 방지
      }
    }
    if (ext === 'mp4' || ext === 'webm') {
      const url = URL.createObjectURL(file)
      setPreview({ kind: 'video', url })
      return () => URL.revokeObjectURL(url)
    }
    if (ext === 'zip') setPreview({ kind: 'icon', icon: '🗜️', label: 'ZIP (등록 후 자동 캡처)' })
    else setPreview(null)
  }, [file])
  return preview
}

function ThumbBox({
  preview,
  urlMode,
  override,
}: {
  preview: ThumbPreview | null
  urlMode: boolean
  override?: string | null
}) {
  if (override) {
    return (
      <div className="flex h-40 w-56 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50">
        <img src={override} alt="썸네일" className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className="flex h-40 w-56 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50">
      {preview?.kind === 'html' && (
        <iframe
          srcDoc={preview.src}
          sandbox="allow-scripts"
          title="썸네일 미리보기"
          className="pointer-events-none h-[400%] w-[400%] origin-top-left scale-[0.25] bg-white"
        />
      )}
      {preview?.kind === 'video' && (
        <video src={preview.url} muted className="h-full w-full object-cover" />
      )}
      {preview?.kind === 'icon' && (
        <div className="text-center">
          <div className="text-3xl">{preview.icon}</div>
          <div className="mt-1 px-1 text-[10px] text-gray-400">{preview.label}</div>
        </div>
      )}
      {!preview && (
        <span className="text-xs text-gray-400">{urlMode ? '🔗 URL 콘텐츠' : '썸네일'}</span>
      )}
    </div>
  )
}

/** 창작자 콘솔 — 콘텐츠 등록 전용(F-01/F-02/F-03). 목록·제출은 '내 콘텐츠' 메뉴에서. */
export function StudioPage() {
  const [inputMode, setInputMode] = useState<'file' | 'url'>('file')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [fileType, setFileType] = useState<FileType>('html')
  const [regCourse, setRegCourse] = useState<string | null>(null)
  const [regSkills, setRegSkills] = useState<SkillTag[]>([])
  const [aiInfo, setAiInfo] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [manualThumbUrl, setManualThumbUrl] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [chosenCand, setChosenCand] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const thumbInput = useRef<HTMLInputElement>(null)

  const hasPrimarySkill = regSkills.some((s) => s.isPrimary)
  const thumbPreview = useThumbPreview(inputMode === 'file' ? file : null)
  const acceptForType = FILE_TYPES.find((t) => t.value === fileType)?.accept ?? ''

  const qc = useQueryClient()

  // 썸네일 선택/후보 요청의 순서 보장용 시퀀스 — 오래된 응답이 최신 선택을 덮지 못하게 한다.
  const thumbSeq = useRef(0)
  // AI 분석 전용 시퀀스 — 썸네일 선택(후보/수동)과 독립. 썸네일 조작이 진행 중인 분석 결과를 폐기하지 않게 분리.
  const analyzeSeq = useRef(0)

  // 파일 선택 시 등록 전 썸네일 후보 조회(html/zip). 첫 후보 자동 선택.
  const fetchCandidates = useMutation({
    mutationFn: (vars: { f: File; seq: number }) => {
      const fd = new FormData()
      fd.set('file', vars.f)
      return api.postForm<{ candidates: Candidate[] }>('/api/contents/thumb-candidates', fd)
    },
    onSuccess: async (data, vars) => {
      if (vars.seq !== thumbSeq.current) return // 더 최신 파일 선택이 있으면 폐기(순서 역전 방지)
      setCandidates(data.candidates)
      if (data.candidates.length > 0) {
        setChosenCand(data.candidates[0].id)
        const tf = await dataUrlToFile(data.candidates[0].dataUrl, 'thumb.png')
        if (vars.seq === thumbSeq.current) setThumbFile(tf)
      }
    },
  })

  // 등록 전 AI 자동 메타 분석 — 파일 선택 시 title·description·course·skill 프리필(빈 필드만)
  const analyzeFile = useMutation({
    mutationFn: (vars: { f: File; seq: number }) => {
      const fd = new FormData()
      fd.set('file', vars.f)
      return api.postForm<AnalyzeSuggestion>('/api/contents/analyze-file', fd)
    },
    onSuccess: (s, vars) => {
      if (vars.seq !== analyzeSeq.current) return // 더 최신 파일 선택이 있으면 폐기(순서 가드)
      const filled: string[] = []
      // 사용자가 이미 입력/선택한 값은 덮지 않고 빈 필드만 채운다(입력 보호)
      if (s.title && !title.trim()) { setTitle(s.title); filled.push('제목') }
      if (s.description && !description.trim()) { setDescription(s.description); filled.push('설명') }
      if (s.courseCode && !regCourse) { setRegCourse(s.courseCode); filled.push('레벨') }
      if (s.skillCode && regSkills.length === 0) { setRegSkills([{ skillCode: s.skillCode, isPrimary: true }]); filled.push('스킬') }
      const hadSuggestion = !!(s.title || s.description || s.courseCode || s.skillCode)
      setAiInfo(
        filled.length
          ? `✨ AI가 ${filled.join('·')}을(를) 자동 채웠어요 (확신도 ${Math.round((s.confidence || 0) * 100)}%) — 확인 후 수정할 수 있어요`
          : hadSuggestion
            ? 'AI가 제안했지만 이미 입력한 값이 있어 그대로 유지했어요.'
            : 'AI가 분석했지만 자동 채울 항목을 찾지 못했어요. 직접 입력해주세요.',
      )
    },
    onError: (_e, vars) => {
      if (vars.seq !== analyzeSeq.current) return // 이후 다른 파일을 골랐으면 무시
      setAiInfo('AI 자동 분석에 실패했어요. 제목·설명·레벨·스킬을 직접 입력해주세요.')
    },
  })

  const onPickFile = (f: File | null) => {
    const seq = ++thumbSeq.current
    const aseq = ++analyzeSeq.current // 파일 변경/초기화 시 진행 중인 AI 분석 응답도 폐기
    // 선택한 파일 확장자가 현재 타입과 맞는지 검증 — accept는 힌트일 뿐이라(전체파일/드래그) 하드 가드 필요
    if (f) {
      const lower = f.name.toLowerCase()
      const dot = lower.lastIndexOf('.')
      const ext = dot >= 0 ? lower.slice(dot) : '' // 점 없는 파일명은 확장자 없음('')으로 처리
      const allowed = acceptForType.split(',').map((s) => s.trim().toLowerCase())
      if (!allowed.includes(ext)) {
        const label = FILE_TYPES.find((t) => t.value === fileType)?.label ?? fileType
        setFileError(
          `${label} 타입에는 ${allowed.join(', ')} 파일만 올릴 수 있어요. 선택한 파일: ${ext || '(확장자 없음)'}`,
        )
        setFile(null)
        setCandidates([])
        setChosenCand(null)
        setThumbFile(null)
        setAiInfo(null)
        if (fileInput.current) fileInput.current.value = ''
        if (thumbInput.current) thumbInput.current.value = ''
        return
      }
    }
    setFileError(null)
    setFile(f)
    setCandidates([])
    setChosenCand(null)
    setThumbFile(null)
    setAiInfo(null)
    if (thumbInput.current) thumbInput.current.value = ''
    if (f && (fileType === 'html' || fileType === 'zip')) {
      fetchCandidates.mutate({ f, seq })
      analyzeFile.mutate({ f, seq: aseq })
    }
  }

  const chooseCandidate = async (c: Candidate) => {
    const seq = ++thumbSeq.current
    setChosenCand(c.id)
    const tf = await dataUrlToFile(c.dataUrl, `thumb-${c.id}.png`)
    if (seq === thumbSeq.current) setThumbFile(tf)
  }

  // 수동 썸네일 미리보기 — objectURL(참고 레포 패턴), 변경 시 정리
  useEffect(() => {
    if (!thumbFile) {
      setManualThumbUrl(null)
      return
    }
    const url = URL.createObjectURL(thumbFile)
    setManualThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [thumbFile])

  const register = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.set('title', title)
      form.set('description', description)
      if (inputMode === 'file') {
        if (!file) throw new Error('파일을 선택해주세요.')
        form.set('file', file)
      } else {
        form.set('externalUrl', externalUrl)
      }
      if (regCourse) form.set('courseCode', regCourse)
      form.set('skills', JSON.stringify(regSkills))
      if (thumbFile) form.set('thumbUpload', thumbFile)
      return api.postForm<Content>('/api/contents', form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mine'] })
      setTitle('')
      setDescription('')
      setFile(null)
      setExternalUrl('')
      setRegCourse(null)
      setRegSkills([])
      setAiInfo(null)
      setThumbFile(null)
      setCandidates([])
      setChosenCand(null)
      if (fileInput.current) fileInput.current.value = ''
      if (thumbInput.current) thumbInput.current.value = ''
    },
  })

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <section className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="mb-1 text-lg font-bold text-brand-800">새 콘텐츠 등록</h2>
        <p className="mb-5 text-sm text-gray-500">
          HTML · ZIP(정적 빌드) · 비디오(mp4/webm) 파일 50MB까지, 또는 HTTPS URL을 등록할 수 있어요.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            register.mutate()
          }}
          className="space-y-4"
        >
          <div className="flex gap-4">
            <div className="flex shrink-0 flex-col gap-1.5">
              <ThumbBox preview={thumbPreview} urlMode={inputMode === 'url'} override={manualThumbUrl} />
              <label className="cursor-pointer rounded-lg border border-brand-200 py-1 text-center text-xs font-semibold text-brand-600 hover:bg-brand-50">
                {thumbFile ? '썸네일 변경' : '썸네일 직접 등록'}
                <input
                  ref={thumbInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    thumbSeq.current++ // 진행 중인 후보 응답이 수동 선택을 덮지 않게
                    setThumbFile(e.target.files?.[0] ?? null)
                    setChosenCand(null)
                  }}
                  className="hidden"
                />
              </label>
              {thumbFile && (
                <button
                  type="button"
                  onClick={() => {
                    setThumbFile(null)
                    if (thumbInput.current) thumbInput.current.value = ''
                  }}
                  className="text-[10px] text-gray-400 hover:text-gray-600"
                >
                  자동 캡처로 되돌리기
                </button>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="콘텐츠 제목"
                required
                className="rounded-xl border border-brand-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="간단한 설명 (선택)"
                className="rounded-xl border border-brand-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* AI 자동 분석 안내 — 파일 선택 시 자동 실행 */}
          {inputMode === 'file' && (analyzeFile.isPending || aiInfo) && (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              {analyzeFile.isPending ? '✨ AI가 콘텐츠를 분석해 제목·설명·레벨·스킬을 채우는 중이에요…' : aiInfo}
            </p>
          )}

          {/* 썸네일 후보 — 썸네일 블록 바로 아래(전체 너비) */}
          {inputMode === 'file' &&
            (fileType === 'html' || fileType === 'zip') &&
            (fetchCandidates.isPending || candidates.length > 0) && (
              <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  썸네일 선택{' '}
                  {fetchCandidates.isPending && <span className="font-normal text-gray-400">(이미지를 분석하는 중이에요…)</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => chooseCandidate(c)}
                      className={`relative h-16 w-24 overflow-hidden rounded-lg border-2 ${
                        chosenCand === c.id ? 'border-brand-500' : 'border-transparent hover:border-brand-300'
                      }`}
                    >
                      <img src={c.dataUrl} alt="" className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-center text-[9px] text-white">
                        {c.source === 'render' ? '첫 화면' : '내장 이미지'}
                      </span>
                    </button>
                  ))}
                </div>
                {!fetchCandidates.isPending && candidates.length === 0 && (
                  <p className="text-xs text-gray-400">
                    추출된 이미지가 없어요. 등록 후 첫 화면을 자동 캡처합니다.
                  </p>
                )}
              </div>
            )}

          <div className="flex gap-1 rounded-xl bg-brand-50 p-1 text-sm font-semibold sm:w-72">
            {(['file', 'url'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setInputMode(m)
                  onPickFile(null) // 모드 전환 시 파일·후보·썸네일 상태 초기화(URL에 stale thumbUpload 방지)
                  setExternalUrl('')
                }}
                className={`flex-1 rounded-lg py-1.5 ${inputMode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-400'}`}
              >
                {m === 'file' ? '파일 업로드' : 'URL 등록'}
              </button>
            ))}
          </div>
          {inputMode === 'file' && fileType === 'zip' && (
              <details className="rounded-xl border border-brand-100 bg-white px-4 py-2 text-sm" open>
                <summary className="cursor-pointer font-semibold text-brand-700">
                  콘텐츠에서 사용할 수 있는 플랫폼 API
                </summary>
                <p className="mt-2 text-xs text-gray-500">
                  업로드한 콘텐츠(SPA 포함)는 같은 출처(same-origin)에서 아래 API를 호출할 수 있어요. 외부 도메인 통신은 차단됩니다.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  {PLATFORM_APIS.map((a) => (
                    <li key={a.path}>
                      <code className="text-brand-700">{a.method} {a.path}</code> — {a.desc}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={downloadPlatformApiMd}
                  className="mt-3 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  📥 API 문서 MD 다운로드
                </button>
              </details>
            )}
          {inputMode === 'file' && (
            <div>
              <div className="flex gap-1 rounded-xl bg-brand-50 p-1 text-sm font-semibold sm:w-[26rem]">
                {FILE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setFileType(t.value)
                      onPickFile(null)
                      if (fileInput.current) fileInput.current.value = ''
                    }}
                    className={`flex-1 rounded-lg py-1.5 ${fileType === t.value ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-400'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {FILE_TYPES.find((t) => t.value === fileType)?.hint}
              </p>
            </div>
          )}

          {inputMode === 'file' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const dropped = e.dataTransfer.files[0]
                if (dropped) onPickFile(dropped)
              }}
              role="button"
              tabIndex={0}
              aria-label="파일 선택"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInput.current?.click()
                }
              }}
              onClick={() => fileInput.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition ${
                dragOver ? 'border-brand-500 bg-brand-50' : 'border-brand-200 hover:border-brand-400'
              }`}
            >
              {file ? (
                <span className="font-semibold text-brand-700">
                  📄 {file.name} <span className="font-normal text-gray-400">({formatSize(file.size)})</span>
                </span>
              ) : (
                <span className="text-gray-400">파일을 끌어다 놓거나 클릭해서 선택 ({acceptForType})</span>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={acceptForType}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          ) : (
            <input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https:// 로 시작하는 콘텐츠 주소"
              required
              className="w-full rounded-xl border border-brand-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          )}

          {fileError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">⚠ {fileError}</p>
          )}



          <p className="text-xs text-gray-400">
            썸네일은 위에서 고르거나 직접 등록할 수 있어요. 미선택 시 등록 후 첫 화면이 자동 캡처됩니다.
            직접 등록은 PNG · JPG · WebP · GIF · 최대 5MB (SVG 미지원).
          </p>

          <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
            <SkillCoursePicker
              skills={regSkills}
              onSkillsChange={setRegSkills}
              courseCode={regCourse}
              onCourseChange={setRegCourse}
            />
          </div>

          

          {register.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              등록 실패: {register.error instanceof Error ? register.error.message : '알 수 없는 오류'}
            </p>
          )}
          {register.isSuccess && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              등록되었습니다. <b>내 콘텐츠</b> 메뉴에서 <b>제출</b>하면 검수 대기열로 이동합니다.
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={register.isPending || !hasPrimarySkill}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {register.isPending ? '검사 중…' : '등록하기'}
            </button>
            {!hasPrimarySkill && (
              <span className="text-xs text-gray-400">주 스킬(★) 1개를 지정하면 등록할 수 있어요.</span>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
