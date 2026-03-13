import { TICKS_PER_DAY } from '../data/events.js'

export default function EventBanner({ activeEvent, eventLog, endedEvent }) {
  if (!activeEvent && eventLog.length === 0 && !endedEvent) return null

  const daysLeft  = activeEvent ? Math.max(1, Math.ceil(activeEvent.timeLeft / TICKS_PER_DAY)) : 0
  const daysTotal = activeEvent?.durationDays ?? 1
  const progress  = activeEvent ? (activeEvent.timeLeft / (daysTotal * TICKS_PER_DAY)) * 100 : 0
  const isNeg     = activeEvent?.isNegative ?? false
  const isUrgent  = daysLeft <= 1

  return (
    <div id="event-banner" className={`event-banner ${activeEvent ? (isNeg ? 'event-banner--negative' : 'event-banner--positive') : ''}`}>

      {/* Toast de fin d'événement */}
      {endedEvent && !activeEvent && (
        <div className={`event-banner__ended ${endedEvent.isNegative ? 'event-banner__ended--neg' : 'event-banner__ended--pos'}`}>
          <span>{endedEvent.emoji}</span>
          <span>
            <strong>{endedEvent.name}</strong> terminé{endedEvent.isNegative ? ' — retour à la normale !' : ' — c\'était bien !'}
          </span>
        </div>
      )}

      {activeEvent && (
        <div className="event-banner__active">
          <span className="event-banner__emoji">{activeEvent.emoji}</span>
          <div className="event-banner__body">
            <div className="event-banner__top">
              <strong className="event-banner__name">{activeEvent.name}</strong>
              <span className={`event-banner__timer ${isUrgent ? 'event-banner__timer--urgent' : ''}`}>
                J{daysLeft}/{daysTotal}
              </span>
            </div>
            <span className="event-banner__desc">{activeEvent.description}</span>
            {activeEvent.lesson && (
              <em className="event-banner__lesson">💡 {activeEvent.lesson}</em>
            )}
            {/* Barre de progression (se vide) */}
            <div className="event-banner__progress-track">
              <div
                className="event-banner__progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {eventLog.length > 0 && (
        <div className="event-banner__log">
          <span className="event-banner__log-label">Récents :</span>
          {eventLog.map((e, i) => (
            <span key={i} className="event-banner__log-item">
              {e.emoji} {e.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
