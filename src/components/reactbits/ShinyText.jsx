/**
 * ReactBits Shiny Text Component
 * Shimmering metallic & gradient glow effect for esports titles.
 */
export default function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = '',
  gold = false,
}) {
  const gradientClass = gold
    ? 'from-amber-200 via-yellow-400 to-amber-500'
    : 'from-sky-200 via-cyan-400 to-blue-500'

  return (
    <span
      className={`inline-block bg-clip-text text-transparent bg-gradient-to-r ${gradientClass} font-extrabold tracking-wide ${
        !disabled ? 'animate-pulse' : ''
      } ${className}`}
      style={{
        backgroundSize: '200% auto',
        textShadow: gold
          ? '0 0 25px rgba(234, 179, 8, 0.4)'
          : '0 0 25px rgba(56, 189, 248, 0.4)',
      }}
    >
      {text}
    </span>
  )
}
