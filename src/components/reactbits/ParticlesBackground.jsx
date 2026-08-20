import { useEffect, useRef } from 'react'

/**
 * ReactBits Interactive Particles Background
 * Renders an animated particle field with distance connections and mouse reactivity.
 */
export default function ParticlesBackground({
  particleCount = 50,
  particleColor = 'rgba(56, 189, 248, 0.45)',
  lineColor = 'rgba(56, 189, 248, 0.12)',
  speed = 0.6,
  connectionDistance = 120,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const mouse = { x: -1000, y: -1000, radius: 150 }
    const handleMouseMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    // Generate particles
    const count = Math.min(particleCount, Math.floor((width * height) / 18000))
    const particles = Array.from({ length: Math.max(25, count) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      radius: Math.random() * 2 + 1,
      baseRadius: Math.random() * 2 + 1,
    }))

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw subtle radial glow in center
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 3,
        10,
        width / 2,
        height / 3,
        width * 0.7
      )
      gradient.addColorStop(0, 'rgba(11, 42, 85, 0.25)')
      gradient.addColorStop(0.5, 'rgba(7, 22, 43, 0.15)')
      gradient.addColorStop(1, 'rgba(3, 10, 20, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        // Bounce off walls
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        // Mouse repulsion
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius
          p.x -= (dx / dist) * force * 3
          p.y -= (dy / dist) * force * 3
          p.radius = p.baseRadius * 1.5
        } else {
          p.radius = p.baseRadius
        }

        // Draw particle node
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = particleColor
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)'
        ctx.shadowBlur = 6
        ctx.fill()
        ctx.shadowBlur = 0

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist2 < connectionDistance) {
            const alpha = (1 - dist2 / connectionDistance) * 0.35
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = lineColor.replace(/[\d.]+\)$/, `${alpha})`)
            ctx.lineWidth = 0.75
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [particleCount, particleColor, lineColor, speed, connectionDistance])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70"
      style={{ filter: 'blur(0.3px)' }}
    />
  )
}
