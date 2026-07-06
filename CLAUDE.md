# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 지침을 제공합니다.

## 명령어

```bash
npm run dev       # Vite 개발 서버 http://localhost:5173 (HMR)
npm run build     # tsc -b(타입 체크) 후 vite build → dist/
npm run preview   # 프로덕션 빌드 결과물 로컬 미리보기
```

- **별도의 lint·test 단계가 없습니다.** `npm run build`가 유일한 품질 게이트입니다. `tsc -b`가 `strict` + `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`로 실행되므로 미사용 변수·타입 오류는 빌드를 실패시킵니다. 변경을 검증하려면 `npm run build`를 실행하세요.
- `verbatimModuleSyntax`가 켜져 있습니다 — 타입은 반드시 `import type { ... }`로 가져와야 하며, 일반 `import`를 쓰면 빌드가 깨집니다.
- 백엔드가 실행 중이어야 합니다. Vite 개발 서버는 `/api`, `/c`, `/p` 요청을 `http://localhost:8100`으로 프록시합니다(`vite.config.ts`의 `BACKEND` 상수).

## 아키텍처

Phonics Studio 콘텐츠 파이프라인(제작 → 검수 → 운영)을 위한 역할 기반 SPA입니다. 세 역할 — `creator`, `reviewer`, `ops` — 은 각각 서로 다른 페이지 집합만 볼 수 있습니다. **프런트엔드는 권한을 판정하지 않으며, 판정은 항상 백엔드가 담당합니다.** 라우트 가드는 방어적 UX 장치일 뿐입니다.

### 요청 흐름
- **`src/api/client.ts`** 가 단일 HTTP 계층입니다: `api` 객체(`get/post/patch/put/postForm/del`). 모든 호출은 `credentials: 'include'`(쿠키 세션)로 전송되고, 2xx가 아니면 `ApiError { status, message }`를 던지며 FastAPI 스타일 `{ detail }` 본문을 파싱합니다. 다른 곳에서 직접 `fetch`를 호출하지 말고 `api`를 확장하세요.
- **`src/api/types.ts`** 는 백엔드에서 수기로 옮겨온 도메인 계약입니다. 페이로드는 camelCase(`ownerId`, `entryPath`)입니다. 이 파일의 몇몇 값은 백엔드와 의도적으로 중복되며 **동기화를 유지해야 합니다**: `EDITABLE_STATUSES`, `StudioPage`의 50MB 업로드 상한, `PLATFORM_APIS` 허용목록, `ScanFlag`/`ScanResult` 형태(주석에 백엔드 대응 지점 명시).
- **데이터 페칭은 TanStack Query**입니다. `QueryClient`(`src/main.tsx`)는 `refetchOnWindowFocus: false, retry: 1`이 기본값입니다. 페이지는 `useQuery`/`useMutation`을 직접 사용하고, 뮤테이션 후 query key를 무효화합니다.

### 인증 & 라우팅
- **`src/auth/auth.tsx`** — `useMe()`는 `GET /api/auth/me`를 조회하고 `401 → null`로 매핑합니다(에러가 아님). `RequireRole`은 미인증 사용자를 `/login`으로, 역할이 맞지 않는 사용자를 자기 홈(`homeFor(role)`)으로 리다이렉트합니다. `useLogout()`은 `POST /api/auth/logout` 후 `queryClient.clear()`를 호출합니다.
- **`src/App.tsx`** — 모든 라우트. `Protected` = `RequireRole` + `TopBar` 셸. 역할 → 라우트:
  - `creator`: `/studio`, `/studio/mine`, `/studio/resources`, `/studio/points`
  - `reviewer`: `/review`
  - `ops`: `/ops`, `/ops/settings`(루브릭), `/ops/stats`
  - `TopBar.tsx`가 역할별 내비게이션 탭 목록을 갖고 있습니다 — `App.tsx`의 라우트와 일치하도록 유지하세요.

### 콘텐츠 검수 도메인 (핵심 워크플로)
- 콘텐츠는 `Status` 생명주기를 따라 이동합니다: `draft → in_review → approved | rejected → published → suspended → archived`. `Kind`는 `html | zip | video | url`입니다.
- **자동검수 파이프라인**(`components/PipelinePanel.tsx`)은 **SSE**로 스트리밍합니다 — `new EventSource('/api/review/:id/pipeline/stream', { withCredentials: true })`로 `stage`·`done` 이벤트를 수신합니다. 5단계 결과와 5차원 가중 **루브릭**, `recommendation`(`approve|reject|manual`)을 내보냅니다. 자동 반려는 기계적 검사(형식 + 정적 스캔)로만 결정되며, AI 점수는 참고용이고 최종 판정은 사람이 합니다.
- **정적 스캔**(`components/SecurityScanPanel.tsx`, `ScanResult`)은 업로드 콘텐츠를 심각도(`block|warn|info`)로 표시하고 API 허용목록을 검사합니다. 업로드 콘텐츠는 same-origin으로 동작하며 플랫폼 API로만 제한됩니다(CSP `connect-src 'self'`).
- 번들·미디어는 `/c`에서, 단기 토큰 미리보기는 `/p`(격리)에서 서빙됩니다. `utils/embed.ts`는 외부 YouTube/Vimeo URL을 iframe 임베드 가능한 URL로 변환합니다.

### 스타일
- `@tailwindcss/vite`를 통한 Tailwind CSS 4(별도 `tailwind.config.js` 없음). 테마는 `src/index.css`에 있습니다: `@theme` 블록이 `brand-*` 컬러 스케일과 폰트를 정의하고, 그 아래에 수기 컴포넌트 클래스(`.app-topbar`, `.auth-*`)와 CSS 변수가 있습니다. 브랜드 색상은 `brand-*` 유틸리티를 사용하세요. 앱에는 고정 배경 이미지와 글래스모피즘 표면이 적용돼 있습니다.

## 컨벤션
- **UI 문구와 코드 주석은 한국어입니다.** 사용자 대상 문자열이나 주석을 추가할 때 이 규칙을 따르세요.
- 주석은 `F-15`, `F-17`, `F-18` 같은 스펙 요구사항 ID를 참조합니다(`../docs`로 추적성 연결). 해당 코드를 편집할 때 이 ID를 보존하세요.
