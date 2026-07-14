/** 오각형(다각형) 레이더 차트 — data[].value를 max 기준 비율로 꼭짓점에 표현.
 * 검수 콘솔(루브릭 점수 0~4), 검수 규칙(가중치 0~1) 등에서 공용. 중앙에서 뻗어나오는 등장 애니메이션 포함. */
export function RadarChart({
  data,
  max,
  className = 'mx-auto block w-full max-w-[340px]',
}: {
  data: { label: string; value: number }[]
  max: number
  className?: string
}) {
  const n = data.length
  const cx = 100
  const cy = 100
  const R = 60
  const ang = (i: number) => ((-90 + (360 / n) * i) * Math.PI) / 180
  const pt = (i: number, f: number): [number, number] => [cx + R * f * Math.cos(ang(i)), cy + R * f * Math.sin(ang(i))]
  const ring = (f: number) => data.map((_, i) => pt(i, f).join(',')).join(' ')
  const frac = (v: number) => (max > 0 ? Math.min(1, Math.max(0, v / max)) : 0)
  const dataPoly = data.map((d, i) => pt(i, frac(d.value)).join(',')).join(' ')
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100))
  return (
    <svg viewBox="0 10 200 176" className={className} role="img" aria-label="레이더 차트">
      {/* 배경 그리드(4겹) + 축 */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill={f === 1 ? '#faf9ff' : 'none'} stroke="#e7e1f7" strokeWidth={1} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e7e1f7" strokeWidth={1} />
      })}
      {/* 데이터 영역 — 중앙에서 뻗어나오는 애니메이션 */}
      <g style={{ transformBox: 'view-box', transformOrigin: '100px 100px', animation: 'radarGrow 0.55s cubic-bezier(0.34,1.3,0.64,1) both' }}>
        <polygon points={dataPoly} fill="rgb(111 91 200 / 0.22)" stroke="#6f5bc8" strokeWidth={1} strokeLinejoin="round" />
        {data.map((d, i) => {
          const [x, y] = pt(i, frac(d.value))
          return <circle key={i} cx={x} cy={y} r={3} fill="#6f5bc8" />
        })}
      </g>
      {/* 라벨 + 값 */}
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.32)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            <tspan x={x} fill="#6b7280" fontSize="9.5" fontWeight={600}>{d.label}</tspan>
            <tspan x={x} dy="11" fill="#5b4a9e" fontSize="10" fontWeight={800}>{fmt(d.value)}</tspan>
          </text>
        )
      })}
    </svg>
  )
}
