export type Role = 'creator' | 'reviewer' | 'ops'
export type Kind = 'html' | 'zip' | 'video' | 'url'
export type Status = 'draft' | 'in_review' | 'approved' | 'rejected' | 'published'

export interface User {
  id: number
  email: string
  name: string
  role: Role
}

export interface SkillTag {
  skillCode: string
  isPrimary: boolean
}

export interface Content {
  id: number
  title: string
  description: string
  kind: Kind
  status: Status
  entryPath: string | null
  externalUrl: string | null
  ownerId: number
  ownerName: string
  rejectReason: string | null
  gradeBand: string | null
  courseCode: string | null
  hasThumb: boolean
  skills: SkillTag[]
  createdAt: string
  submittedAt: string | null
  publishedAt: string | null
}

export interface ContentUpdate {
  title?: string
  description?: string
  gradeBand?: string | null
  courseCode?: string | null
  skills?: SkillTag[]
}

export interface Course {
  code: string
  label: string
  series: string
  textbookLevel: string | null
  skillCodes: string[]
}

export interface SkillOption {
  code: string
  label: string
  domainLabel: string
}

export interface AnalyzeSuggestion {
  title: string | null
  description: string | null
  courseCode: string | null
  skillCode: string | null
  confidence: number
}

export interface AnalyzeResult {
  suggested: {
    title: string | null
    skillCode: string | null
    confidence: number
  }
  applied: boolean
  confident: boolean
  warnings: string[]
}

export interface PipelineStage {
  stage: number
  name: string
  status: 'pass' | 'reject' | 'flag' | 'skip' | 'info'
  summary: string
  detail: Record<string, unknown>
}

export interface RubricReport {
  total: number
  passed: boolean
  breakdown: Record<string, number>
  weighted: Record<string, number>
  gateFailures: string[]
  dimensions: Record<string, string>
}

export interface PipelineOverall {
  recommendation: 'approve' | 'reject' | 'manual'
  autoReject: boolean
  reasons: string[]
  rubric: RubricReport | null
}

export interface RubricConfig {
  weights: Record<string, number>
  minTotal: number
  hardGates: Record<string, number>
  dimensions: Record<string, string>
}

export interface Preview {
  url: string
  external: boolean
}

export type ScanSeverity = 'block' | 'warn' | 'info'

/** 정적 심사 개별 위험 신호 (백엔드 static_scan.ScanFlag와 일치) */
export interface ScanFlag {
  code: string
  severity: ScanSeverity
  message: string
  file: string
  evidence: string
}

/** 정적 심사 결과 — 형식·악성패턴·API 허용목록.
 * POST /api/contents/{id}/scan(저장된 콘텐츠) 및 POST /api/contents/scan-file(등록 전 파일) 공용 응답. */
export interface ScanResult {
  flags: ScanFlag[]
  counts: Record<ScanSeverity, number>
  hasBlocking: boolean
  scannedFiles: number
  limitation: string
  apiAllowlist: {
    allowed: string[]
    allowedCalls: number
    unlistedCalls: number
  }
  kind?: Kind // scan-file(등록 전)에서만 함께 반환
}

/** 승인 전 — 창작자가 in-place 수정 가능한 상태 (백엔드 EDITABLE_STATUSES와 일치) */
export const EDITABLE_STATUSES: Status[] = ['draft', 'rejected']
