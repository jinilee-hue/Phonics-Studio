import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Resource } from '../api/types'
import { useMe } from '../auth/auth'
import { Select } from '../components/Select'

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(bytes / 1024)}KB`
}

/** 리소스 라이브러리 — 재사용 이미지·아이콘 업로드/공유/삭제 (창작자·운영자) */
export function ResourcePage() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['resources'],
    queryFn: () => api.get('/api/resources'),
  })

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'image' | 'icon'>('image')
  const [isPublic, setIsPublic] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('') // 이름·소유자 검색어
  const [kindFilter, setKindFilter] = useState<'all' | 'image' | 'icon'>('all')
  const [zoom, setZoom] = useState<Resource | null>(null) // 크게 보기 모달 대상
  const hasFilter = kindFilter !== 'all' || q.trim() !== ''
  const resetFilters = () => {
    setKindFilter('all')
    setQ('')
  }
  const clearFile = () => {
    setFile(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('이미지를 선택해주세요.')
      const fd = new FormData()
      fd.set('file', file)
      fd.set('title', title)
      fd.set('kind', kind)
      fd.set('isPublic', String(isPublic))
      return api.postForm<Resource>('/api/resources', fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources'] })
      setTitle('')
      clearFile()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/api/resources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  })

  const needle = q.trim().toLowerCase()
  const shown = resources.filter(
    (r) =>
      (kindFilter === 'all' || r.kind === kindFilter) &&
      (!needle || r.title.toLowerCase().includes(needle) || r.ownerName.toLowerCase().includes(needle)),
  )

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h2 className="text-[22px] font-bold text-brand-800">리소스 라이브러리</h2>

      <section className="rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-5">
          <h3 className="text-base font-bold text-brand-800">리소스 등록</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            PNG · JPG · WebP · GIF · 최대 5MB까지 업로드할 수 있어요. SVG는 지원하지 않아요.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            upload.mutate()
          }}
          className="space-y-4"
        >
          <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
            <div>
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
                  if (dropped) setFile(dropped)
                }}
                role="button"
                tabIndex={0}
                aria-label="리소스 파일 선택"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInput.current?.click()
                  }
                }}
                onClick={() => fileInput.current?.click()}
                className={`relative flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-4 py-7 text-center text-sm transition ${
                  dragOver ? 'border-brand-500 bg-brand-50' : 'border-brand-300 bg-brand-50/50 hover:bg-brand-50/70'
                }`}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-contain p-3" />
                    <span className="absolute bottom-2 right-2 rounded-lg border border-brand-200 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-600 shadow-sm backdrop-blur">
                      변경
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </span>
                    <span className="mt-2 text-sm font-semibold text-brand-600">리소스 파일 선택</span>
                    <span className="mt-1 text-[11px] leading-relaxed text-gray-400">
                      파일을 끌어다 놓거나 클릭해서 선택하세요.
                    </span>
                  </>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
              {file && (
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-semibold text-brand-700" title={file.name}>
                    {file.name} <span className="font-normal text-gray-400">({formatSize(file.size)})</span>
                  </span>
                  <button type="button" onClick={clearFile} className="shrink-0 text-gray-400 hover:text-gray-600">
                    선택 해제
                  </button>
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <label className="block text-xs font-semibold text-gray-500">
                  제목
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    style={{ borderRadius: '0.5rem' }}
                    className="mt-1 w-full rounded-lg border border-brand-200 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-brand-500"
                  />
                </label>
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500">종류</p>
                  <Select
                    value={kind}
                    onChange={(v) => setKind(v as 'image' | 'icon')}
                    className="w-full"
                    buttonClassName="w-full justify-between py-2.5"
                    options={[
                      { value: 'image', label: '이미지' },
                      { value: 'icon', label: '아이콘' },
                    ]}
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-brand-800">공개 리소스</span>
                  <span className="mt-0.5 block text-xs text-gray-400">다른 창작자도 콘텐츠 제작에 사용할 수 있어요.</span>
                </span>
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-brand-600" />
                  <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
              </label>

              <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={upload.isPending || !file || !title.trim()}
                  style={{ backgroundColor: '#5b4a9e' }}
                  className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {upload.isPending ? '업로드 중…' : '업로드'}
                </button>
              </div>
            </div>
          </div>
        </form>
        {upload.isError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            업로드 실패: {upload.error instanceof Error ? upload.error.message : '알 수 없는 오류'}
          </p>
        )}
      </section>

      <section>
        {/* 검색 · 종류 필터 */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-brand-800">리소스 ({shown.length})</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={kindFilter}
              onChange={(v) => setKindFilter(v as 'all' | 'image' | 'icon')}
              className="shrink-0"
              options={[
                { value: 'all', label: '전체 종류' },
                { value: 'image', label: '이미지' },
                { value: 'icon', label: '아이콘' },
              ]}
            />
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
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
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="이름·소유자 검색"
                style={{ borderRadius: '0.5rem' }}
                className="w-full rounded-lg border border-brand-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-brand-500"
              />
            </div>
            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                aria-label="필터 초기화"
                title="필터 초기화"
                className="grid shrink-0 place-items-center rounded-lg border border-brand-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {resources.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            아직 리소스가 없어요. 위에서 이미지를 올려보세요.
          </p>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            검색·필터 결과가 없어요.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((r) => (
              <div key={r.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card">
                <img
                  src={r.imageUrl}
                  alt={r.title}
                  style={{ backgroundColor: 'rgb(245 243 251)' }}
                  className="h-40 w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-brand-800" title={r.title}>
                        {r.title}
                      </span>
                      {!r.isPublic && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5 shrink-0 text-gray-400"
                          role="img"
                          aria-label="비공개"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {r.kind === 'icon' ? '아이콘' : '이미지'} · {r.ownerName}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-end gap-2 pt-3">
                    <button
                      onClick={() => setZoom(r)}
                      aria-label="크게 보기"
                      title="크게 보기"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-brand-200 text-brand-600 transition hover:bg-brand-50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8.5" x2="11" y2="13.5" />
                        <line x1="8.5" y1="11" x2="13.5" y2="11" />
                      </svg>
                    </button>
                    <a
                      href={r.imageUrl}
                      download
                      aria-label="다운로드"
                      title="다운로드"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-brand-200 text-brand-600 transition hover:bg-brand-50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                    {me?.id === r.ownerId && (
                      <button
                        onClick={() => {
                          if (window.confirm('삭제하면 되돌릴 수 없어요. 삭제할까요?')) remove.mutate(r.id)
                        }}
                        disabled={remove.isPending}
                        aria-label="삭제"
                        title="삭제"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                          <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 리소스 크게 보기 모달 */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setZoom(null)}
        >
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoom(null)}
              aria-label="닫기"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-gray-600 shadow-lg backdrop-blur hover:bg-white"
            >
              ✕
            </button>
            <img
              src={zoom.imageUrl}
              alt={zoom.title}
              className="max-h-[85vh] w-full rounded-2xl bg-white object-contain shadow-modal"
            />
          </div>
        </div>
      )}
    </main>
  )
}
