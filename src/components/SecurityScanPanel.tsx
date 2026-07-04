import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Content, ScanFlag, ScanResult, ScanSeverity } from '../api/types'

/** severity별 표시 스타일·라벨 */
const SEVERITY_META: Record<ScanSeverity, { label: string; badge: string; dot: string }> = {
  block: { label: '차단', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  warn: { label: '경고', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  info: { label: '정보', badge: 'bg-brand-100 text-brand-700', dot: 'bg-brand-400' },
}

const SEVERITY_ORDER: ScanSeverity[] = ['block', 'warn', 'info']

/**
 * 보안 정적 심사 패널 — 저장된 콘텐츠(zip/html)를 백엔드가 실행 없이 검사한 결과를 표시한다.
 * 형식·악성패턴(eval·외부스크립트 등)과 함께 zip이 openai/azure/wav2vec2 프록시 API만
 * 호출하는지(허용목록) 확인 결과를 보여준다. 실제 검사는 서버(POST /scan)가 수행한다.
 */
export function SecurityScanPanel({ content }: { content: Content }) {
  const scannable = content.kind === 'zip' || content.kind === 'html'
  const { data, isLoading, error, refetch, isFetching } = useQuery<ScanResult>({
    queryKey: ['scan', content.id],
    queryFn: () => api.post<ScanResult>(`/api/contents/${content.id}/scan`),
    enabled: scannable,
    staleTime: 0,
    retry: false,
  })

  if (!scannable) return null

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-brand-800">🔒 보안 검사</h3>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
        >
          {isFetching ? '검사 중…' : '다시 검사'}
        </button>
      </div>

      {isLoading && <p className="py-4 text-center text-sm text-gray-400">검사 중…</p>}
      {error instanceof Error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">검사 실패: {error.message}</p>
      )}

      {data && <ScanResultView data={data} />}
    </div>
  )
}

/** 스캔 결과 표시 전용 — 저장 콘텐츠 검사(SecurityScanPanel)와 등록 전 검사(StudioPage) 공용 */
export function ScanResultView({ data }: { data: ScanResult }) {
  const { counts, apiAllowlist } = data
  const apiStatus = apiStatusOf(apiAllowlist)

  return (
    <div className="space-y-3 text-sm">
      {/* severity 요약 칩 */}
      <div className="flex flex-wrap items-center gap-2">
        {SEVERITY_ORDER.map((sev) => (
          <span
            key={sev}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_META[sev].badge}`}
          >
            {SEVERITY_META[sev].label} {counts[sev] ?? 0}
          </span>
        ))}
        <span className="text-xs text-gray-400">· 검사 파일 {data.scannedFiles}개</span>
      </div>

      {/* API 허용목록 검사 결과 */}
      <div className={`rounded-lg px-3 py-2 text-xs ${apiStatus.box}`}>
        <p className="font-semibold">{apiStatus.title}</p>
        <p className="mt-0.5 text-gray-600">
          허용된 호출 {apiAllowlist.allowedCalls}건 · 허용목록 밖 호출 {apiAllowlist.unlistedCalls}건
        </p>
        <p className="mt-1 text-gray-500">
          호출 허용(openai/azure/wav2vec2 프록시):{' '}
          {apiAllowlist.allowed.map((p) => (
            <code key={p} className="mr-1 rounded bg-white/70 px-1 text-brand-700">
              {p}
            </code>
          ))}
        </p>
      </div>

      {/* 개별 플래그 목록 (severity 순) */}
      {data.flags.length > 0 ? (
        <ul className="space-y-1.5">
          {[...data.flags]
            .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
            .map((f, i) => (
              <FlagRow key={`${f.code}-${f.file}-${i}`} flag={f} />
            ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          위험 신호가 발견되지 않았습니다.
        </p>
      )}

      <p className="text-xs text-gray-400">ℹ {data.limitation}</p>
    </div>
  )
}

function FlagRow({ flag }: { flag: ScanFlag }) {
  const meta = SEVERITY_META[flag.severity]
  return (
    <li className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-700">
          <span className={`mr-1.5 rounded px-1.5 py-0.5 ${meta.badge}`}>{meta.label}</span>
          {flag.message}
        </p>
        <p className="truncate text-xs text-gray-400">{flag.file}</p>
        {flag.evidence && (
          <code className="mt-0.5 block truncate rounded bg-white px-1.5 py-0.5 text-xs text-gray-500">
            {flag.evidence}
          </code>
        )}
      </div>
    </li>
  )
}

/** API 허용목록 검사의 종합 상태(밖의 호출이 있으면 경고) */
function apiStatusOf(a: ScanResult['apiAllowlist']) {
  if (a.unlistedCalls > 0) {
    return { title: '⚠ 허용목록 밖의 API 호출이 있어요', box: 'bg-amber-50 text-amber-800' }
  }
  if (a.allowedCalls > 0) {
    return { title: '✓ 허용된 플랫폼 API만 호출합니다', box: 'bg-emerald-50 text-emerald-800' }
  }
  return { title: '플랫폼 API 호출이 감지되지 않았습니다', box: 'bg-gray-50 text-gray-600' }
}
