import { useEffect, useRef } from 'react'

export function InteractiveBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const onResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const particles = []
    const count = Math.min(45, Math.floor((width * height) / 25000))

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.8,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2,
      })
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw floating glowing orbs
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha * 0.4})`
        ctx.shadowBlur = 10
        ctx.shadowColor = '#38bdf8'
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {/* Radial ambient glow gradients */}
      <div className="absolute -top-[25%] -left-[10%] h-[60vw] w-[60vw] rounded-full bg-sky-600/10 blur-[130px]" />
      <div className="absolute top-[30%] -right-[15%] h-[50vw] w-[50vw] rounded-full bg-amber-500/10 blur-[140px]" />
      <div className="absolute -bottom-[20%] left-[20%] h-[55vw] w-[55vw] rounded-full bg-indigo-600/10 blur-[130px]" />
      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-60" />
    </div>
  )
}
