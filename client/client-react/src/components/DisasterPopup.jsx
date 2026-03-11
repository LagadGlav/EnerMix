import { useEffect, useState } from 'react'

const POSITIVE_EVENTS = new Set(['subvention', 'journeeSoleil', 'canicule'])

export default function DisasterPopup({ event, onDismiss }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!event) {
      setProgress(100)
      return
    }

    setProgress(100)
    const DURATION = 6000
    const INTERVAL = 50
    const step = (INTERVAL / DURATION) * 100

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev - step
        if (next <= 0) {
          clearInterval(timer)
          onDismiss()
          return 0
        }
        return next
      })
    }, INTERVAL)

    return () => clearInterval(timer)
  }, [event, onDismiss])

  if (!event) return null

  const isPositive = POSITIVE_EVENTS.has(event.id)

  return (
    <div className="disaster-overlay" onClick={onDismiss}>
      <div
        className={`disaster-box ${isPositive ? 'disaster-box--positive' : 'disaster-box--negative'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="disaster-emoji">{event.emoji}</div>
        <h2 className="disaster-title">{event.name}</h2>
        <p className="disaster-desc">{event.description}</p>
        {event.lesson && (
          <div className="disaster-lesson">
            <span className="disaster-lesson__icon">💡</span>
            <span>{event.lesson}</span>
          </div>
        )}
        <button className="disaster-btn" onClick={onDismiss}>
          J'ai compris !
        </button>
        <div className="disaster-progress-track">
          <div
            className="disaster-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
