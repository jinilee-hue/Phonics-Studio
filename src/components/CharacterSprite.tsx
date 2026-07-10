import { useEffect, useState } from 'react'
import charactersSprite from '../assets/login-characters-anim.png'

// 캐릭터 스프라이트 시트: 6열 × 6행 = 36프레임(각 622×450), 프레임당 50ms
const SPRITE_COLS = 6
const SPRITE_ROWS = 6
const SPRITE_FRAMES = 36
const SPRITE_FRAME_MS = 50

/** 스프라이트 프레임을 순환 재생해 캐릭터가 움직이게(눈 깜박임 등) 한다. 로그인 히어로용. */
export function CharacterSprite({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setFrame((f) => (f + 1) % SPRITE_FRAMES), SPRITE_FRAME_MS)
    return () => window.clearInterval(id)
  }, [])
  const col = frame % SPRITE_COLS
  const row = Math.floor(frame / SPRITE_COLS)
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        backgroundImage: `url(${charactersSprite})`,
        backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
        backgroundPosition: `${(col / (SPRITE_COLS - 1)) * 100}% ${(row / (SPRITE_ROWS - 1)) * 100}%`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
