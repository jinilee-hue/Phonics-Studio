import { useEffect, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
}

/** 커스텀 셀렉트 — 네이티브 select 대신 스타일링 가능한 드롭다운(poly-dashboard kit 스타일, 브랜드 보라 톤).
 * 트리거(알약) + 플로팅 목록(둥근 박스·hover 틴트·선택 강조). 바깥 클릭·Esc로 닫힘. */
export function Select({
  value,
  onChange,
  options,
  className = '',
  buttonClassName = '',
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-lg border bg-white py-2 pl-4 pr-3 text-sm text-gray-700 transition ${buttonClassName} ${
          open ? 'border-brand-500 ring-2 ring-brand-100' : 'border-brand-200 hover:border-brand-400'
        }`}
      >
        <span className="whitespace-nowrap">{selected?.label ?? ''}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-20 max-h-64 min-w-full overflow-auto overflow-x-hidden rounded-lg border border-brand-100 bg-white shadow-lg"
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`block w-full whitespace-nowrap px-4 py-2 text-left text-sm transition ${
                  o.value === value
                    ? 'bg-brand-100 font-semibold text-brand-700'
                    : 'text-gray-600 hover:bg-brand-50'
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
