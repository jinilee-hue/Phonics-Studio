import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const BACKEND = 'http://localhost:8100'

// 프로덕션 빌드 산출물(dist/index.html)에만 CSP 메타를 주입한다(§5 보안 — 심층 방어).
// dev 서버의 HMR 인라인 스크립트와 충돌하지 않도록 apply:'build'로 제한한다.
// 권위 있는 CSP는 백엔드 응답 헤더가 이상적이며, 특히 frame-src는 배포 환경의 실제
// 콘텐츠·임베드 오리진으로 좁히는 것을 권장한다.
function cspMeta(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Tailwind/런타임 인라인 스타일
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'", // SSE(EventSource) 포함 — 모두 same-origin
    "frame-src 'self' https: blob:", // 프리뷰(/c,/p)·YouTube/Vimeo 임베드
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
          injectTo: 'head',
        },
      ]
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspMeta()],
  server: {
    proxy: {
      '/api': BACKEND,
      '/c': BACKEND, // 번들·미디어 서빙
      '/p': BACKEND, // 미리보기(단기 토큰) 서빙
    },
  },
})
