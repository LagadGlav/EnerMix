// 8 nuages pré-définis avec positions et vitesses fixes
const CLOUDS = [
  { id: 0, top: '8%',  left: '-15%', w: 180, h: 70,  dur: 32, delay: 0   },
  { id: 1, top: '20%', left: '25%',  w: 140, h: 55,  dur: 44, delay: -12 },
  { id: 2, top: '5%',  left: '60%',  w: 200, h: 80,  dur: 28, delay: -6  },
  { id: 3, top: '35%', left: '-5%',  w: 160, h: 60,  dur: 38, delay: -18 },
  { id: 4, top: '50%', left: '50%',  w: 120, h: 50,  dur: 50, delay: -8  },
  { id: 5, top: '15%', left: '80%',  w: 170, h: 65,  dur: 35, delay: -22 },
  { id: 6, top: '42%', left: '20%',  w: 130, h: 52,  dur: 42, delay: -15 },
  { id: 7, top: '28%', left: '70%',  w: 150, h: 58,  dur: 30, delay: -30 },
]

export default function PollutionClouds({ pollution }) {
  const count = pollution < 20 ? 0
              : pollution < 35 ? 2
              : pollution < 50 ? 4
              : pollution < 70 ? 6
              : 8

  const opacity = Math.min(0.78, 0.18 + (pollution - 20) / 80)
  // Blanc (220) → gris sombre (60) au fur et à mesure que la pollution monte
  const gray = pollution > 50 ? Math.round(220 - (pollution - 50) * 1.6) : 220

  if (count === 0) return null

  return (
    <div className="pollution-overlay" aria-hidden="true">
      {CLOUDS.slice(0, count).map(c => (
        <div
          key={c.id}
          className="pollution-cloud"
          style={{
            top: c.top,
            left: c.left,
            width: c.w,
            height: c.h,
            opacity,
            background: `radial-gradient(ellipse 55% 60% at 40% 50%,
              rgba(${gray},${gray},${gray},0.90) 0%,
              rgba(${gray},${gray},${gray},0.40) 55%,
              transparent 100%)`,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
