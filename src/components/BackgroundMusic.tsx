import { useEffect } from 'react'
import musicUrl from '../assets/bg-music.mp3'

/**
 * 배경음악 루프 재생. 사운드 on/off(localStorage 'sound')와 연동한다.
 * 브라우저는 사용자 상호작용 전 소리 있는 오디오 자동재생을 막으므로,
 * 첫 클릭/키 입력 시 재생을 시작한다. 토글은 'soundchange' 이벤트로 즉시 반영.
 */
export function BackgroundMusic() {
  useEffect(() => {
    const audio = new Audio(musicUrl)
    audio.loop = true
    audio.volume = 0.4

    const soundOn = () => localStorage.getItem('sound') !== 'off'
    const play = () => {
      if (soundOn()) audio.play().catch(() => {})
    }

    // 자동재생이 막히면 첫 사용자 상호작용에서 재생 시작
    const onFirstGesture = () => {
      play()
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
    }

    // 사운드 토글 반영
    const onSoundChange = () => (soundOn() ? play() : audio.pause())

    play() // 시도(대개 차단됨 → 아래 제스처에서 시작)
    window.addEventListener('pointerdown', onFirstGesture)
    window.addEventListener('keydown', onFirstGesture)
    window.addEventListener('soundchange', onSoundChange)

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      window.removeEventListener('soundchange', onSoundChange)
      audio.pause()
    }
  }, [])

  return null
}
