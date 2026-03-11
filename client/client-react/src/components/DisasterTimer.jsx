import { TICKS_PER_DAY } from '../data/events.js'

export default function DisasterTimer({ activeEvent }) {
  if (!activeEvent) return null

  const daysLeft  = Math.max(1, Math.ceil(activeEvent.timeLeft / TICKS_PER_DAY))
  const daysTotal = activeEvent.durationDays ?? 1
  const progress  = (activeEvent.timeLeft / (daysTotal * TICKS_PER_DAY)) * 100
  const isUrgent  = daysLeft <= 1
  const isNeg     = activeEvent.isNegative ?? false

  return (
    <div className={`disaster-timer ${isNeg ? 'disaster-timer--neg' : 'disaster-timer--pos'} ${isUrgent ? 'disaster-timer--urgent' : ''}`}>
      <span className="disaster-timer__emoji">{activeEvent.emoji}</span>
      <div className="disaster-timer__body">
        <div className="disaster-timer__top">
          <span className="disaster-timer__name">{activeEvent.name}</span>
          <span className="disaster-timer__count">{daysLeft} / {daysTotal} j</span>
        </div>
        <div className="disaster-timer__track">
          <div className="disaster-timer__bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
