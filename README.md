# Phonics Studio — Frontend

파닉스 콘텐츠 제작·검수·운영을 위한 웹 애플리케이션의 프런트엔드입니다.
역할(creator / reviewer / ops)에 따라 접근할 수 있는 화면이 나뉘며, 인증·권한 판정은 항상 백엔드가 담당합니다.

## 기술 스택

| 분류 | 사용 기술 |
| --- | --- |
| 프레임워크 | [React 19](https://react.dev/) |
| 빌드 도구 | [Vite 6](https://vite.dev/) |
| 언어 | [TypeScript 5.8](https://www.typescriptlang.org/) |
| 스타일 | [Tailwind CSS 4](https://tailwindcss.com/) |
| 데이터 페칭 | [TanStack Query 5](https://tanstack.com/query) |
| 라우팅 | [React Router 7](https://reactrouter.com/) |

## 요구 사항

- Node.js 18 이상 (권장: 20 LTS)
- 백엔드 API 서버 (기본 `http://localhost:8100`)

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (기본 http://localhost:5173)
npm run dev
```

개발 서버는 `/api`, `/c`, `/p` 요청을 백엔드(`http://localhost:8100`)로 프록시합니다.
프록시 대상은 [`vite.config.ts`](./vite.config.ts)의 `BACKEND` 상수에서 변경할 수 있습니다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 (HMR) |
| `npm run build` | 타입 체크(`tsc -b`) 후 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과물 로컬 미리보기 |

## 프로젝트 구조

```
frontend/
├─ index.html            # 앱 진입 HTML
├─ vite.config.ts        # Vite 설정 · 백엔드 프록시
├─ src/
│  ├─ main.tsx           # 앱 부트스트랩
│  ├─ App.tsx            # 라우팅 · 역할 가드 셸
│  ├─ index.css          # Tailwind 엔트리
│  ├─ api/
│  │  ├─ client.ts       # fetch 래퍼 · ApiError
│  │  └─ types.ts        # API 타입 정의
│  ├─ auth/
│  │  └─ auth.tsx        # 세션 조회 · 역할별 라우터 가드
│  ├─ components/        # TopBar · PreviewModal · badges 등 공용 UI
│  └─ pages/
│     ├─ LoginPage.tsx   # 로그인
│     ├─ StudioPage.tsx  # creator — 콘텐츠 제작
│     ├─ ReviewPage.tsx  # reviewer — 검수
│     └─ OpsPage.tsx     # ops — 운영
```

## 역할 & 라우팅

| 경로 | 접근 역할 | 화면 |
| --- | --- | --- |
| `/login` | 누구나 | 로그인 |
| `/studio` | `creator` | 콘텐츠 제작 |
| `/review` | `reviewer` | 검수 |
| `/ops` | `ops` | 운영 |
| `/` | 로그인 사용자 | 역할별 홈으로 리다이렉트 |

라우터 가드(`RequireRole`)는 프런트단의 이중 방어일 뿐이며, 최종 권한 판정은 서버가 수행합니다.

## 인증

- 세션은 **HTTP 쿠키** 기반이며, 모든 API 요청은 `credentials: 'include'`로 전송됩니다.
- `GET /api/auth/me`로 현재 사용자를 조회하고, `401`이면 로그인 화면으로 이동합니다.
- 로그아웃은 `POST /api/auth/logout` 호출 후 로컬 쿼리 캐시를 정리합니다.
