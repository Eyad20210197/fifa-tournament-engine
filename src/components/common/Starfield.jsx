/*
  نجوم متحركة خفيفة (بدون Canvas) للحفاظ على الأداء في شاشة التلفزيون.
*/
export function Starfield({ intensity = 1 }) {
  const opacity = Math.max(0, Math.min(1, 0.55 * intensity))
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 animate-[stars_16s_linear_infinite]"
        style={{
          opacity,
          backgroundImage: `
            radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.28), transparent 50%),
            radial-gradient(1px 1px at 80px 120px, rgba(255,255,255,0.22), transparent 50%),
            radial-gradient(1px 1px at 140px 60px, rgba(255,255,255,0.18), transparent 50%),
            radial-gradient(1px 1px at 220px 200px, rgba(255,255,255,0.20), transparent 50%),
            radial-gradient(1px 1px at 320px 140px, rgba(255,255,255,0.16), transparent 50%),
            radial-gradient(1px 1px at 420px 80px, rgba(255,255,255,0.22), transparent 50%)
          `,
          backgroundSize: '520px 320px',
        }}
      />
    </div>
  )
}

