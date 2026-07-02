import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api } from '../api/client'
import type { Content } from '../api/types'
import { KindBadge, StatusBadge } from '../components/badges'
import { PreviewModal } from '../components/PreviewModal'

const ACCEPT = '.html,.zip,.mp4,.webm,.mp3,.wav'

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(bytes / 1024)}KB`
}

/** 창작자 콘솔 — 등록(F-01/F-02/F-03) + 내 콘텐츠 + 제출(F-04) */
export function StudioPage() {
  const [inputMode, setInputMode] = useState<'file' | 'url'>('file')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<Content | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const qc = useQueryClient()
  const { data: mine = [] } = useQuery<Content[]>({
    queryKey: ['mine'],
    queryFn: () => api.get('/api/contents/mine'),
  })

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
      return api.postForm<Content>('/api/contents', form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mine'] })
      setTitle('')
      setDescription('')
      setFile(null)
      setExternalUrl('')
      if (fileInput.current) fileInput.current.value = ''
    },
  })

  const submit = useMutation({
    mutationFn: (id: number) => api.post<Content>(`/api/contents/${id}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mine'] }),
  })

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <section className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="mb-1 text-lg font-bold text-brand-800">새 콘텐츠 등록</h2>
        <p className="mb-5 text-sm text-gray-500">
          HTML · ZIP(정적 빌드) · 비디오(mp4/webm) · 오디오(mp3/wav) 파일 50MB까지, 또는 HTTPS URL을 등록할 수 있어요.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            register.mutate()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="flex gap-1 rounded-xl bg-brand-50 p-1 text-sm font-semibold sm:w-72">
            {(['file', 'url'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setInputMode(m)}
                className={`flex-1 rounded-lg py-1.5 ${inputMode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-400'}`}
              >
                {m === 'file' ? '파일 업로드' : 'URL 등록'}
              </button>
            ))}
          </div>

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
                if (dropped) setFile(dropped)
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
                <span className="text-gray-400">파일을 끌어다 놓거나 클릭해서 선택 ({ACCEPT})</span>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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

          {register.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              등록 실패: {register.error instanceof Error ? register.error.message : '알 수 없는 오류'}
            </p>
          )}
          {register.isSuccess && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              등록되었습니다. 아래 목록에서 <b>제출</b>하면 검수 대기열로 이동합니다.
            </p>
          )}

          <button
            type="submit"
            disabled={register.isPending}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {register.isPending ? '검사 중…' : '등록하기'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-brand-800">내 콘텐츠 ({mine.length})</h2>
        <div className="space-y-3">
          {mine.length === 0 && (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
              아직 등록한 콘텐츠가 없어요.
            </p>
          )}
          {mine.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.title}</span>
                <KindBadge kind={c.kind} />
                <StatusBadge status={c.status} />
                <span className="ml-auto flex gap-2">
                  <button
                    onClick={() => setPreview(c)}
                    className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                  >
                    미리보기
                  </button>
                  {(c.status === 'draft' || c.status === 'rejected') && (
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
              {c.status === 'rejected' && c.rejectReason && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  반려 사유: {c.rejectReason}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {preview && <PreviewModal content={preview} onClose={() => setPreview(null)} />}
    </main>
  )
}
