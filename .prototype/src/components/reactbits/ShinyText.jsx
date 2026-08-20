export default function ShinyText({ text, disabled = false, speed = 4, className = '' }) {
  const animationDuration = `${speed}s`

  return (
    <span
      className={`relative inline-block overflow-hidden bg-clip-text text-transparent ${
        disabled
          ? 'text-white'
          : 'bg-gradient-to-r from-white via-sky-200 to-white bg-[length:200%_auto] animate-shiny-text'
      } ${className}`}
      style={{
        animationDuration,
        backgroundImage: disabled
          ? undefined
          : 'linear-gradient(110deg, #93c5fd 25%, #ffffff 50%, #93c5fd 75%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {text}
    </span>
  )
}
