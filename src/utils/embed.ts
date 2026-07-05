/** 외부 링크를 iframe 임베드 가능한 URL로 변환 (YouTube/Vimeo). */
export interface EmbedInfo {
  url: string // iframe에 넣을 URL (미지원이면 원본 그대로)
  embeddable: boolean // iframe 삽입 가능 여부
  provider: 'youtube' | 'vimeo' | null
}

/**
 * 외부 시청 URL을 임베드 전용 URL로 변환한다.
 * YouTube/Vimeo는 embed URL이 iframe 삽입을 허용하므로 앱 안에서 바로 재생 가능하고,
 * 그 외 호스트는 X-Frame-Options/CSP로 삽입이 막힐 수 있어 embeddable=false로 둔다.
 */
export function resolveEmbed(rawUrl: string): EmbedInfo {
  try {
    const u = new URL(rawUrl)
    const host = u.hostname.replace(/^(www|m)\./, '')

    // YouTube
    if (host === 'youtube.com') {
      // 이미 임베드 URL
      if (u.pathname.startsWith('/embed/')) {
        return { url: rawUrl, embeddable: true, provider: 'youtube' }
      }
      const v = u.searchParams.get('v')
      if (v) {
        return { url: `https://www.youtube.com/embed/${v}`, embeddable: true, provider: 'youtube' }
      }
      const shorts = u.pathname.match(/^\/shorts\/([\w-]+)/)
      if (shorts) {
        return { url: `https://www.youtube.com/embed/${shorts[1]}`, embeddable: true, provider: 'youtube' }
      }
      const list = u.searchParams.get('list')
      if (list) {
        return {
          url: `https://www.youtube.com/embed/videoseries?list=${list}`,
          embeddable: true,
          provider: 'youtube',
        }
      }
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) {
        return { url: `https://www.youtube.com/embed/${id}`, embeddable: true, provider: 'youtube' }
      }
    }

    // Vimeo
    if (host === 'player.vimeo.com') {
      return { url: rawUrl, embeddable: true, provider: 'vimeo' }
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) {
        return { url: `https://player.vimeo.com/video/${id}`, embeddable: true, provider: 'vimeo' }
      }
    }
  } catch {
    // URL 파싱 실패 → 미지원으로 폴백
  }

  return { url: rawUrl, embeddable: false, provider: null }
}
