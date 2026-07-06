/**
 * 고정 폭(기본 1280) 기준 균일 스케일링.
 * 반응형(reflow)이 아니라 #app 전체를 화면에 맞춰 비율 그대로 축소/확대한다.
 * 콘텐츠가 기준 높이(기본 800)보다 길면 실제 콘텐츠 높이에 맞춰 더 축소해
 * 스크롤이 생기지 않도록 한다(창이 아니라 전체를 스케일). 높이 변화는 ResizeObserver로 추적.
 * 명세: docs/refs/contents_rules/컨텐츠_화면크기_조정.md
 */
declare global {
  interface Window {
    /** 현재 적용된 스케일 값(리사이즈 시 자동 갱신). 좌표 보정 등 전역 접근용. */
    currentScale: number
  }
}

export interface ScalingOptions {
  designWidth?: number
  designHeight?: number
  containerId?: string
  enableLog?: boolean
}

let currentScale = 1
let resizeHandler: (() => void) | null = null
let contentObserver: ResizeObserver | null = null

export function getCurrentScale(): number {
  return currentScale
}

export function initScaling(options: ScalingOptions = {}): void {
  const { designWidth = 1280, designHeight = 800, containerId = 'app', enableLog = false } = options
  const container = document.getElementById(containerId)
  if (!container) {
    if (enableLog) console.warn(`[scaling] #${containerId} 컨테이너를 찾을 수 없습니다.`)
    return
  }

  // 지오메트리 기준: 폭은 1280 고정, 높이는 콘텐츠에 맞춰 늘어나되 최소 800.
  container.style.position = 'absolute'
  container.style.transformOrigin = 'top left'
  container.style.width = `${designWidth}px`
  container.style.minHeight = `${designHeight}px`
  container.style.height = 'auto'

  const apply = (): void => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    // 스케일 전 실제 레이아웃 높이(최소 800). 콘텐츠가 길면 그 높이에 맞춰 축소 → 스크롤 없음.
    const contentHeight = Math.max(designHeight, container.offsetHeight)
    const scale = Math.min(vw / designWidth, vh / contentHeight)
    currentScale = scale
    window.currentScale = scale
    container.style.left = `${(vw - designWidth * scale) / 2}px`
    container.style.top = `${Math.max(0, (vh - contentHeight * scale) / 2)}px`
    container.style.transform = `scale(${scale})`
    if (enableLog) console.log(`[scaling] scale=${scale.toFixed(4)} vw=${vw} vh=${vh} contentH=${contentHeight}`)
  }

  // 창 리사이즈 (StrictMode/HMR 재실행에도 중복 등록 방지)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  resizeHandler = apply
  window.addEventListener('resize', apply)

  // 콘텐츠 높이 변화(데이터 로드·필터·라우트 전환) 감지 → 재계산.
  // apply()가 바꾸는 값(transform/left/top/width/minHeight)은 관측 대상 박스 높이를
  // 바꾸지 않으므로 무한 루프가 생기지 않는다.
  if (contentObserver) contentObserver.disconnect()
  contentObserver = new ResizeObserver(() => apply())
  contentObserver.observe(container)

  apply()
}
