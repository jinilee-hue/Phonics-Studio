/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 디자인 작업용 임시 로그인 우회 플래그 (npm run design 시 'true')
  readonly VITE_DESIGN_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
