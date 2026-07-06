import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api } from '../api/client'
import type { Resource } from '../api/types'
import { useMe } from '../auth/auth'

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
  const fileInput = useRef<HTMLInputElement>(null)

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
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/api/resources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  })

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <section className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="mb-1 text-lg font-bold text-brand-800">리소스 라이브러리</h2>
        <p className="mb-5 text-sm text-gray-500">
          콘텐츠에 재사용할 이미지·아이콘을 올려두고 공유할 수 있어요. PNG·JPG·WebP·GIF, 5MB 이하 (SVG 불가).
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            upload.mutate()
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="text-xs font-semibold text-gray-500">
            제목
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-48 rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
            />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            종류
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'image' | 'icon')}
              className="mt-1 block rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
            >
              <option value="image">이미지</option>
              <option value="icon">아이콘</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            공개
          </label>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={upload.isPending || !file || !title.trim()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {upload.isPending ? '업로드 중…' : '업로드'}
          </button>
        </form>
        {upload.isError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            업로드 실패: {upload.error instanceof Error ? upload.error.message : '알 수 없는 오류'}
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-brand-800">리소스 ({resources.length})</h3>
        {resources.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            아직 리소스가 없어요. 위에서 이미지를 올려보세요.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {resources.map((r) => (
              <div key={r.id} className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-card">
                <img src={r.imageUrl} alt={r.title} className="h-32 w-full bg-brand-50 object-contain" />
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold" title={r.title}>
                      {r.title}
                    </span>
                    {!r.isPublic && <span className="text-xs text-gray-400">🔒</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {r.kind === 'icon' ? '아이콘' : '이미지'} · {r.ownerName}
                  </p>
                  {me?.id === r.ownerId && (
                    <button
                      onClick={() => {
                        if (window.confirm('삭제할까요?')) remove.mutate(r.id)
                      }}
                      className="mt-1.5 text-xs font-semibold text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
