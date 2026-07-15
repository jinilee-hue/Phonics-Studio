// ⚠️ 디자인 작업용 임시 목(mock) 계층 — `npm run design`(VITE_DESIGN_MODE=true)일 때만 동작.
// 로그인/권한 체크를 우회하고, 모든 페이지가 백엔드 없이(=API 호출 없이) 렌더링되도록
// api 클라이언트가 이 리졸버로 데이터를 대체한다. 일반 dev/build에서는 DESIGN_MODE=false라
// 아래 코드는 실행되지 않으며, 프로덕션 번들에서는 죽은 코드로 제거된다.
import type {
  AnalyzeResult,
  AnalyzeSuggestion,
  Content,
  ContentReview,
  Course,
  PipelineOverall,
  PipelineStage,
  PointsResult,
  Preview,
  Resource,
  RubricConfig,
  ScanResult,
  SkillOption,
  Stats,
  PlayStats,
  User,
} from './types'

/** 디자인 우회 모드 여부 — `npm run design`으로 실행할 때만 true */
export const DESIGN_MODE = import.meta.env.VITE_DESIGN_MODE === 'true'
/** 전체 권한 테스트 계정 이메일 */
export const DESIGN_ALL_EMAIL = 'demo2@test.com'
/** 전체 권한(창작자+운영자) 테스트 사용자 — 로그인 없이도 이 계정으로 접속된 것처럼 동작 */
export const DESIGN_USER: User = { id: -1, email: DESIGN_ALL_EMAIL, name: '디자인', role: 'creator' }
/** demo2 전체 권한 계정 여부 (라우트 가드·탭 노출 판정용) */
export function isAllAccess(me: User | null | undefined): boolean {
  return !!me && me.email === DESIGN_ALL_EMAIL
}

// ── 목 데이터 ─────────────────────────────────────────────────────────────
// shape-correct 최소 데이터. 레이아웃/오버플로 확인에 충분하도록 목록은 2~3건씩,
// Record 키(상태 버킷·루브릭 차원 등)는 실제 키를 채워 차트·막대가 렌더되게 한다.

/** 5차원 루브릭 차원 코드→라벨 (통계·설정·파이프라인 공용) */
const DIMENSIONS: Record<string, string> = {
  edu: '교육성',
  fun: '재미',
  tech: '기술완성도',
  ux: '사용성',
  safe: '안전성',
}

const COURSES: Course[] = [
  { code: 'PK-A1', label: '파닉스 1단계', series: 'Phonics Kingdom', textbookLevel: 'A1', skillCodes: ['SH-SE', 'VW-A'] },
  { code: 'PK-A2', label: '파닉스 2단계', series: 'Phonics Kingdom', textbookLevel: 'A2', skillCodes: ['BL-CR'] },
]

const SKILLS: SkillOption[] = [
  { code: 'SH-SE', label: 'Silent-e', domainLabel: '모음' },
  { code: 'VW-A', label: '단모음 a', domainLabel: '모음' },
  { code: 'BL-CR', label: '자음군 cr', domainLabel: '자음' },
]

/** 디자인 모드 전용 — 콘텐츠 id별 목 썸네일(Phonics-Playground에서 가져와 public/mock-thumbs 배치).
 * 프로덕션에선 undefined를 반환해 실제 thumb 엔드포인트로 폴백한다. */
const MOCK_THUMBS: Record<number, string> = {
  1: '/mock-thumbs/phonics-thumb-01-alphabet-sound-match.png',
  2: '/mock-thumbs/phonics-thumb-14-cvc-build.png',
  3: '/mock-thumbs/phonics-thumb-05-phonics-story-video.png',
  4: '/mock-thumbs/phonics-thumb-13-letter-case-match.png',
  5: '/mock-thumbs/phonics-thumb-17-external-game-link.png',
  6: '/mock-thumbs/phonics-thumb-16-sight-word-flash.png',
  7: '/mock-thumbs/phonics-thumb-03-consonant-song.png',
  8: '/mock-thumbs/phonics-thumb-02-short-vowel-a-fishing.png',
  9: '/mock-thumbs/phonics-thumb-06-magic-e-long-vowels.png',
  10: '/mock-thumbs/phonics-thumb-04-rhyming-word-sounds.png',
  14: '/mock-thumbs/phonics-thumb-07-digraph-quiz.png',
  15: '/mock-thumbs/phonics-thumb-08-sight-word-speedrun.png',
}
/** public/ 절대경로에 배포 base(예: /Phonics-Studio/)를 붙인다. dev(base '/')에선 그대로. */
const asset = (p: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + p

export function mockThumb(id: number): string | undefined {
  return DESIGN_MODE && MOCK_THUMBS[id] ? asset(MOCK_THUMBS[id]) : undefined
}

function content(id: number, over: Partial<Content>): Content {
  return {
    id,
    title: `샘플 콘텐츠 ${id}`,
    description: '',
    kind: 'html',
    status: 'draft',
    entryPath: 'index.html',
    externalUrl: null,
    ownerId: -1,
    ownerName: '디자인',
    rejectReason: null,
    gradeBand: '초1-2',
    courseCode: 'PK-A1',
    hasThumb: MOCK_THUMBS[id] !== undefined,
    skills: [{ skillCode: 'SH-SE', isPrimary: true }],
    usesAi: false,
    createdAt: '2026-07-01T09:00:00Z',
    submittedAt: null,
    publishedAt: null,
    ...over,
  }
}

const CONTENTS: Content[] = [
  content(1, { status: 'in_review', title: '초안 게임', submittedAt: '2026-07-01T10:00:00Z' }),
  content(2, { status: 'in_review', title: '검수중 게임', kind: 'zip', submittedAt: '2026-07-02T10:00:00Z' }),
  content(3, { status: 'rejected', title: '반려 게임', kind: 'video', rejectReason: '음성 파일이 누락되었습니다.' }),
  content(4, { status: 'approved', title: '승인 게임', submittedAt: '2026-07-03T10:00:00Z' }),
  content(5, {
    status: 'published',
    title: '게시 게임',
    kind: 'url',
    usesAi: true,
    externalUrl: 'https://example.com/game',
    entryPath: null,
    submittedAt: '2026-07-03T10:00:00Z',
    publishedAt: '2026-07-04T10:00:00Z',
  }),
  content(6, { status: 'suspended', title: '게시중단 게임', publishedAt: '2026-07-04T10:00:00Z' }),
  content(7, {
    status: 'published',
    title: '파닉스 송 — 자음편',
    kind: 'video',
    skills: [{ skillCode: 'BL-CR', isPrimary: true }],
    submittedAt: '2026-07-02T09:00:00Z',
    publishedAt: '2026-07-03T09:00:00Z',
  }),
  content(8, {
    status: 'published',
    title: '단모음 a 낚시',
    kind: 'html',
    skills: [{ skillCode: 'VW-A', isPrimary: true }],
    submittedAt: '2026-07-02T09:30:00Z',
    publishedAt: '2026-07-03T11:00:00Z',
  }),
  content(9, {
    status: 'published',
    title: '장모음 매직 e',
    kind: 'zip',
    usesAi: true,
    skills: [{ skillCode: 'SH-SE', isPrimary: true }],
    submittedAt: '2026-07-01T09:00:00Z',
    publishedAt: '2026-07-02T09:00:00Z',
  }),
  content(10, {
    status: 'published',
    title: '라임 단어 찾기',
    kind: 'html',
    skills: [{ skillCode: 'VW-A', isPrimary: true }],
    submittedAt: '2026-07-02T08:00:00Z',
    publishedAt: '2026-07-03T08:00:00Z',
  }),
  content(14, { status: 'approved', title: '이중자음 퀴즈', kind: 'zip', submittedAt: '2026-07-04T09:00:00Z' }),
  content(15, { status: 'in_review', title: '사이트워드 스피드런', kind: 'html', submittedAt: '2026-07-02T11:00:00Z' }),
]

const QUEUE: Content[] = [
  content(11, { status: 'in_review', title: '검수 대기 A', submittedAt: '2026-07-05T09:00:00Z' }),
  content(12, { status: 'in_review', title: '검수 대기 B', kind: 'zip', submittedAt: '2026-07-05T10:00:00Z' }),
  content(13, { status: 'in_review', title: '검수 대기 C', usesAi: true, submittedAt: '2026-07-05T11:00:00Z' }),
]

const RESOURCES: Resource[] = [
  { id: 1, title: '고양이 일러스트', kind: 'image', isPublic: true, ownerId: -1, ownerName: '디자인', imageUrl: '/resources/sample-cat-illustration.png', createdAt: '2026-07-01T09:00:00Z' },
  { id: 2, title: '별 아이콘', kind: 'icon', isPublic: false, ownerId: -1, ownerName: '디자인', imageUrl: '/resources/sample-star-icon.png', createdAt: '2026-07-02T09:00:00Z' },
  { id: 3, title: '배경 이미지', kind: 'image', isPublic: true, ownerId: -1, ownerName: '디자인', imageUrl: '/resources/sample-classroom-background.png', createdAt: '2026-07-03T09:00:00Z' },
  { id: 4, title: '몬스터 캐릭터 · 신남', kind: 'image', isPublic: true, ownerId: -1, ownerName: '디자인', imageUrl: '/review-faces/character5.png', createdAt: '2026-07-04T09:00:00Z' },
  { id: 5, title: '몬스터 캐릭터 · 하트', kind: 'image', isPublic: true, ownerId: -1, ownerName: '디자인', imageUrl: '/review-faces/character6.png', createdAt: '2026-07-05T09:00:00Z' },
  { id: 6, title: '몬스터 캐릭터 · 고민', kind: 'icon', isPublic: false, ownerId: -1, ownerName: '디자인', imageUrl: '/review-faces/character1.png', createdAt: '2026-07-06T09:00:00Z' },
  { id: 7, title: '몬스터 캐릭터 · 곤란', kind: 'image', isPublic: true, ownerId: -1, ownerName: '디자인', imageUrl: '/review-faces/character3.png', createdAt: '2026-07-07T09:00:00Z' },
]

const POINTS: PointsResult = {
  points: 1250,
  entries: [
    { contentId: 5, eventType: 'publish_bonus', amount: 500, createdAt: '2026-07-04T10:00:00Z' },
    { contentId: 4, eventType: 'approve_reward', amount: 300, createdAt: '2026-07-03T11:00:00Z' },
    { contentId: null, eventType: 'signup_bonus', amount: 450, createdAt: '2026-07-01T09:00:00Z' },
  ],
}

const RUBRIC: RubricConfig = {
  weights: { edu: 0.3, fun: 0.2, tech: 0.2, ux: 0.15, safe: 0.15 },
  minTotal: 2.5,
  hardGates: { safe: 2 },
  dimensions: DIMENSIONS,
}

// 최근 30일 등록 추이(목) — 오늘(2026-07-14) 기준 30일치, UTC 날짜 문자열로 생성
const TREND_END_MS = Date.parse('2026-07-14T00:00:00Z')
const TREND_COUNTS = [2, 3, 1, 4, 0, 5, 3, 2, 6, 1, 3, 4, 2, 0, 3, 5, 2, 4, 1, 3, 6, 2, 3, 1, 4, 2, 5, 3, 2, 4]
const SUBMISSIONS_TREND = TREND_COUNTS.map((count, i) => ({
  date: new Date(TREND_END_MS - (TREND_COUNTS.length - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  count,
}))

const STATS: Stats = {
  byStatus: { in_review: 7, approved: 5, rejected: 2, published: 8, suspended: 1, archived: 2 },
  totalContents: 25,
  totalCreators: 6,
  approvalRate: 0.72,
  decisionsApprove: 18,
  decisionsReject: 7,
  submissionsTrend: SUBMISSIONS_TREND,
  creatorRanking: [
    { userId: 1, name: '김창작', registrations: 12, approved: 9, published: 7 },
    { userId: 2, name: '이제작', registrations: 8, approved: 6, published: 4 },
    { userId: 3, name: '박콘텐츠', registrations: 5, approved: 3, published: 2 },
  ],
}

const PLAY_STATS: PlayStats = {
  summary: {
    totalPlays: 1840,
    distinctLearners: 320,
    distinctContent: 22,
    completions: 1290,
    completionRate: 0.7,
    activeNow: 12,
    avgRating: 4.3,
    totalRatings: 210,
  },
  topContents: [
    { contentId: 7, uses: 512, completions: 360, ratingAvg: 4.8, ratingCount: 96, title: '파닉스 송 — 자음편' },
    { contentId: 8, uses: 468, completions: 320, ratingAvg: 4.7, ratingCount: 74, title: '단모음 a 낚시' },
    { contentId: 5, uses: 420, completions: 300, ratingAvg: 4.5, ratingCount: 88, title: '게시 게임' },
    { contentId: 9, uses: 342, completions: 210, ratingAvg: 4.6, ratingCount: 52, title: '장모음 매직 e' },
    { contentId: 4, uses: 260, completions: 180, ratingAvg: 4.1, ratingCount: 45, title: '승인 게임' },
    { contentId: 10, uses: 305, completions: 220, ratingAvg: 4.4, ratingCount: 61, title: '라임 단어 찾기' },
  ],
}

const SCAN_RESULT: ScanResult = {
  flags: [
    { code: 'INLINE_SCRIPT', severity: 'info', message: '인라인 스크립트가 사용되었습니다.', file: 'index.html', evidence: '<script>…</script>' },
    { code: 'EXTERNAL_CALL', severity: 'warn', message: '허용목록 외 호출이 감지되었습니다.', file: 'app.js', evidence: "fetch('https://cdn.example.com')" },
  ],
  counts: { block: 0, warn: 1, info: 1 },
  hasBlocking: false,
  scannedFiles: 3,
  limitation: '정적 분석은 런타임 동작을 완전히 대신하지 않습니다.',
  apiAllowlist: { allowed: ['/api/v1/words/generate', '/api/v1/tts/speech'], allowedCalls: 4, unlistedCalls: 1 },
}

const ANALYZE_SUGGESTION: AnalyzeSuggestion = {
  title: '샘플 파닉스 게임',
  description: 'Silent-e 학습용 게임',
  courseCode: 'PK-A1',
  skillCode: 'SH-SE',
  confidence: 0.82,
  thumbUrl: null,
}

const ANALYZE_RESULT: AnalyzeResult = {
  suggested: { title: '샘플 파닉스 게임', skillCode: 'SH-SE', confidence: 0.82 },
  applied: true,
  confident: true,
  warnings: [],
}

/** 자동검수 파이프라인 목 (PipelinePanel이 SSE 대신 사용) */
export const MOCK_PIPELINE_STAGES: PipelineStage[] = [
  { stage: 1, name: '형식 검사', status: 'pass', summary: '진입 파일·구조 정상', detail: {} },
  { stage: 2, name: '정적 스캔', status: 'flag', summary: '경고 1건(허용목록 외 호출)', detail: {} },
  { stage: 3, name: '메타데이터', status: 'pass', summary: '스킬·코스 태그 확인', detail: {} },
  { stage: 4, name: 'AI 품질 평가', status: 'info', summary: '참고용 점수 산출', detail: {} },
  { stage: 5, name: '루브릭 종합', status: 'pass', summary: '가중합 기준 통과', detail: {} },
]

export const MOCK_PIPELINE_OVERALL: PipelineOverall = {
  recommendation: 'manual',
  autoReject: false,
  reasons: ['정적 스캔 경고 1건 — 사람 확인 권장'],
  rubric: {
    total: 3.4,
    passed: true,
    breakdown: { edu: 4, fun: 3, tech: 3, ux: 4, safe: 3 },
    weighted: { edu: 1.2, fun: 0.6, tech: 0.6, ux: 0.6, safe: 0.45 },
    gateFailures: [],
    dimensions: DIMENSIONS,
  },
}

// ── 요청 리졸버 ───────────────────────────────────────────────────────────
/**
 * 디자인 모드에서 api 클라이언트 대신 응답을 만들어 반환한다(네트워크 호출 없음).
 * 경로는 쿼리스트링을 떼고 pathname으로 매칭하며, `/:id` 경로 파라미터는 정규식으로 처리한다.
 */
// 콘텐츠 사용자 리뷰(목) — review-faces 캐릭터를 리뷰어 아바타로. 스크롤 확인용으로 24개 생성
const REVIEW_AVATARS = [
  '/review-faces/character1.png',
  '/review-faces/character2.png',
  '/review-faces/character3.png',
  '/review-faces/character5.png',
  '/review-faces/character6.png',
]
const REVIEW_NICKS = ['민준', '서연', '도윤', '지우', '하은', '시우', '수아', '유준', '예린', '건우', '채원', '지호']
// 아이들이 고르는 프리셋 반응(없어요 = null)
const REVIEW_TAGS: (string | null)[] = ['재밌어요!', '또 하고 싶어요!', '쉬워요', '재밌어요!', '어려워요', '또 하고 싶어요!', '없어요', '쉬워요']
const REVIEW_RATINGS = [5, 4, 5, 4, 5, 3, 5, 4, 4, 5]
const REVIEW_END_MS = Date.parse('2026-07-14T00:00:00Z')
const REVIEW_POOL: ContentReview[] = Array.from({ length: 24 }, (_, i) => ({
  nickname: `${REVIEW_NICKS[i % REVIEW_NICKS.length]} 어린이`,
  avatarUrl: asset(REVIEW_AVATARS[i % REVIEW_AVATARS.length]),
  rating: REVIEW_RATINGS[i % REVIEW_RATINGS.length],
  tag: REVIEW_TAGS[i % REVIEW_TAGS.length],
  createdAt: new Date(REVIEW_END_MS - i * 86_400_000).toISOString(),
}))

export function mockRequest(method: string, rawPath: string): unknown {
  const path = rawPath.split('?')[0]

  // 인증 — 항상 전체 권한 테스트 계정
  if (path === '/api/auth/me') return DESIGN_USER
  if (path === '/api/auth/login' || path === '/api/auth/signup') return DESIGN_USER
  if (path === '/api/auth/logout') return null

  // 목록/설정 조회
  if (path === '/api/courses') return COURSES
  if (path === '/api/skills') return SKILLS
  if (path === '/api/me/points') return POINTS
  if (path === '/api/settings/rubric') return RUBRIC // GET 조회 / PUT 저장 모두 설정 반환
  if (path === '/api/stats') return STATS
  if (path === '/api/stats/play') return PLAY_STATS
  if (path === '/api/stats/sync-usage-rewards') return { syncedContents: 3, settledContents: 2, newlyAwarded: 1 }
  if (path === '/api/review/queue') return QUEUE
  if (path === '/api/review/bulk') return { results: [], okCount: 0, failCount: 0 }
  if (path === '/api/resources') {
    const withBase = (r: Resource) => ({ ...r, imageUrl: asset(r.imageUrl) })
    return method === 'GET' ? RESOURCES.map(withBase) : withBase(RESOURCES[0])
  }

  // 콘텐츠 컬렉션 및 등록 전 처리
  if (path === '/api/contents/mine') return CONTENTS
  if (path === '/api/contents/thumb-candidates') return { candidates: [] }
  if (path === '/api/contents/analyze-file' || path === '/api/contents/analyze-url') return ANALYZE_SUGGESTION
  if (path === '/api/contents/scan-file') return SCAN_RESULT
  if (path === '/api/contents') {
    if (method === 'POST') return CONTENTS[0] // 신규 등록(postForm)
    return rawPath.includes('status=approved') ? CONTENTS.filter((c) => c.status === 'approved') : CONTENTS
  }

  // /api/contents/:id (상세·수정·삭제·상태 전이)
  const contentMatch = path.match(/^\/api\/contents\/(\d+)(\/.+)?$/)
  if (contentMatch) {
    const id = Number(contentMatch[1])
    const sub = contentMatch[2] ?? ''
    const found = CONTENTS.find((c) => c.id === id) ?? CONTENTS[0]
    if (sub === '/reviews') return REVIEW_POOL
    if (sub === '/preview') return { url: 'about:blank', external: !!found.externalUrl } as Preview
    if (sub === '/scan') return SCAN_RESULT
    if (sub === '/analyze') return ANALYZE_RESULT
    if (method === 'DELETE') return null
    return found // PATCH 수정, submit/approve/reject/publish/suspend/archive/restore/thumb 등
  }

  // /api/review/:id/reset
  const resetMatch = path.match(/^\/api\/review\/(\d+)\/reset$/)
  if (resetMatch) return CONTENTS.find((c) => c.id === Number(resetMatch[1])) ?? CONTENTS[0]

  // /api/resources/:id (삭제)
  if (/^\/api\/resources\/\d+$/.test(path)) return null

  // 매칭 실패 — 콘솔에 남기고 null 반환(디자인 모드 한정)
  console.warn('[design-mock] 매칭되지 않은 요청:', method, rawPath)
  return null
}
