// Effets concrets de chaque événement (lisibles par un enfant)
function getEventEffects(effectKey) {
  switch (effectKey) {
    case 'canicule':     return ['☀️ Solaire +50% de puissance', '🌡️ Demande en hausse']
    case 'tempete':      return ['🌬️ Éoliennes à l\'arrêt !', '♨️ Géothermie & solaire non affectés', '💨 Vent fort → pollution dispersée']
    case 'greve':        return ['⛏️ Mines en grève → pas de charbon !', '🏭 Centrales au ralenti', '♨️ Géothermie non affectée']
    case 'subvention':   return ['💸 Renouvelables à -50% !', '🌱 Profites-en pour construire']
    case 'demandePlus':  return ['🏙️ Demande électrique +50% !', '⚡ Plus de production nécessaire']
    case 'accident':     return ['🏭 Centrales à charbon hors-ligne !', '☣️ Pollution ×2 !', '🚨 Dommages immédiats sur la santé']
    case 'journeeSoleil':return ['☀️ Solaire ×2 de puissance !']
    case 'penurie':      return ['📦 Pénurie charbon → centrale à 50%', '🔋 Cherche d\'autres sources']
    default:             return []
  }
}

// Compass direction labels (wind blows FROM this direction)
const WIND_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

function WindIndicator({ strength, angle }) {
  const dirIndex = Math.round(angle / 45) % 8
  const dirName  = WIND_DIRS[dirIndex]
  const pct      = Math.round(strength * 100)
  const color    = strength > 0.7 ? '#f97316' : strength > 0.3 ? '#60a5fa' : '#94a3b8'

  return (
    <div className="wind-indicator">
      <div className="wind-indicator__compass">
        <div
          className="wind-indicator__arrow"
          style={{ transform: `rotate(${angle}deg)`, background: `linear-gradient(to top, transparent 15%, ${color} 100%)` }}
        />
      </div>
      <div className="wind-indicator__info">
        <span className="wind-indicator__dir">{dirName} · {pct}%</span>
        <span className="wind-indicator__strength">
          {pct < 20 ? 'Calme' : pct < 45 ? 'Brise légère' : pct < 70 ? 'Vent modéré' : 'Vent fort 🌪️'}
        </span>
      </div>
    </div>
  )
}

export default function HUD({
  money, energy, maxEnergy, pollution, health, population,
  totalProduction, energyDemand, renewableShare,
  isDay, productionBreakdown,
  satisfaction, windStrength, windAngle,
  activeEvent,
}) {
  const surplus      = totalProduction - energyDemand
  const healthColor  = health       > 60 ? '#22c55e' : health       > 30 ? '#f59e0b' : '#ef4444'
  const pollColor    = pollution    < 20 ? '#22c55e' : pollution     < 40 ? '#f59e0b' : '#ef4444'
  const satColor     = satisfaction > 60 ? '#22c55e' : satisfaction  > 30 ? '#f59e0b' : '#ef4444'
  const surplusColor = surplus >= 0 ? '#22c55e' : '#ef4444'

  const bd = productionBreakdown

  // Effets concrets de l'événement actif (pour affichage HUD)
  const eventEffects = activeEvent ? getEventEffects(activeEvent.effectKey) : []

  return (
    <aside className="hud" id="hud-panel">
      <h2 className="hud__title">Tableau de bord</h2>

      {/* Jour / nuit */}
      <div className="hud__time">{isDay ? '☀️ Jour' : '🌙 Nuit'}</div>

      {/* Effets actifs de l'événement */}
      {activeEvent && eventEffects.length > 0 && (
        <div className={`hud__event-effects ${activeEvent.isNegative ? 'hud__event-effects--neg' : 'hud__event-effects--pos'}`}>
          <div className="hud__event-effects__title">{activeEvent.emoji} {activeEvent.name}</div>
          {eventEffects.map((fx, i) => (
            <div key={i} className="hud__event-effects__line">{fx}</div>
          ))}
        </div>
      )}

      {/* Argent & énergie stockée */}
      <div className="hud__section" id="hud-money">
        <div className="hud__stat">
          <span>💰 Argent</span>
          <strong>{money.toFixed(1)} €</strong>
        </div>
        <div className="hud__stat" id="hud-storage">
          <span>🔋 Stocké</span>
          <strong>{energy.toFixed(1)} / {maxEnergy} kWh</strong>
        </div>
        <div className="hud__progress">
          <div className="hud__progress-bar hud__progress-bar--blue"
            style={{ width: `${maxEnergy > 0 ? Math.min(100, (energy / maxEnergy) * 100) : 0}%` }} />
        </div>
        {energy >= maxEnergy && maxEnergy > 0 && (
          <p className="hud__hint hud__hint--tip">💡 Construis un barrage pour plus de stockage</p>
        )}
      </div>

      {/* Énergie */}
      <div className="hud__section" id="hud-energy">
        <div className="hud__stat">
          <span>⚡ Production</span>
          <strong>{totalProduction.toFixed(1)} kWh/s</strong>
        </div>
        <div className="hud__stat">
          <span>🏙️ Demande</span>
          <strong>{energyDemand.toFixed(1)} kWh/s</strong>
        </div>
        <div className="hud__stat" style={{ color: surplusColor }}>
          <span>{surplus >= 0 ? '✅ Surplus' : '⚠️ Déficit'}</span>
          <strong>{Math.abs(surplus).toFixed(1)} kWh/s</strong>
        </div>
        {surplus < -1 && (
          <p className="hud__hint hud__hint--warn">💡 Construis plus de sources !</p>
        )}
        <div className="hud__stat">
          <span>🌱 Renouvelable</span>
          <strong>{renewableShare}%</strong>
        </div>
        {renewableShare < 30 && totalProduction > 0 && (
          <p className="hud__hint hud__hint--tip">💡 Ajoute du solaire ou des éoliennes</p>
        )}
      </div>

      {/* Détail de production par type */}
      {bd && (bd.solar.count > 0 || bd.wind.count > 0 || bd.geothermal.count > 0 || bd.coalMine.count > 0 || bd.coalPlant.count > 0) && (
        <div className="hud__section">
          <div className="hud__stat" style={{ opacity: 0.55, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Détail</span>
          </div>
          {bd.solar.count > 0 && (
            <div className={`hud__detail-row${!isDay ? ' hud__detail-row--muted' : ''}`}>
              <span>☀️ ×{bd.solar.count}</span>
              <span>{bd.solar.total.toFixed(1)} kWh/s{!isDay ? ' (nuit)' : ''}</span>
            </div>
          )}
          {bd.wind.count > 0 && (
            <div className={`hud__detail-row${bd.wind.unit === 0 ? ' hud__detail-row--muted' : ''}`}>
              <span>🌀 ×{bd.wind.count}</span>
              <span>{bd.wind.total.toFixed(1)} kWh/s{bd.wind.unit === 0 ? ' (tempête !)' : ''}</span>
            </div>
          )}
          {bd.geothermal.count > 0 && (
            <div className="hud__detail-row hud__detail-row--geo">
              <span>♨️ ×{bd.geothermal.count}</span>
              <span>{bd.geothermal.total.toFixed(1)} kWh/s</span>
            </div>
          )}
          {bd.coalMine.count > 0 && (
            <div className={`hud__detail-row${bd.coalMine.active === 0 ? ' hud__detail-row--muted' : ''}`}>
              <span>⛏️ ×{bd.coalMine.count}</span>
              <span>{bd.coalMine.active === 0 ? 'en grève' : `${bd.coalMine.active} active(s)`}</span>
            </div>
          )}
          {bd.coalPlant.count > 0 && (
            <div className="hud__detail-row">
              <span>🏭 ×{bd.coalPlant.count}</span>
              <span>{bd.coalPlant.total.toFixed(1)} kWh/s</span>
            </div>
          )}
        </div>
      )}

      {/* Vent */}
      <div className="hud__section" id="hud-wind">
        <div className="hud__stat" style={{ opacity: 0.55, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Vent</span>
        </div>
        <WindIndicator strength={windStrength} angle={windAngle} />
      </div>

      {/* Pollution */}
      <div className="hud__section" id="hud-pollution">
        <div className="hud__stat" style={{ color: pollColor }}>
          <span>☁️ Pollution</span>
          <strong>{pollution.toFixed(0)} / 100</strong>
        </div>
        <div className="hud__progress">
          <div className="hud__progress-bar" style={{ width: `${Math.min(100, pollution)}%`, background: pollColor }} />
        </div>
        {pollution > 35 && (
          <p className="hud__hint hud__hint--warn">⚠️ Nuit à la santé des habitants !</p>
        )}
      </div>

      {/* Santé */}
      <div className="hud__section" id="hud-health">
        <div className="hud__stat" style={{ color: healthColor }}>
          <span>❤️ Santé</span>
          <strong>{health.toFixed(0)} / 100</strong>
        </div>
        <div className="hud__progress">
          <div className="hud__progress-bar" style={{ width: `${Math.max(0, health)}%`, background: healthColor }} />
        </div>
        <p className="hud__health-hint">
          {health > 70 ? 'Habitants en bonne santé' :
           health > 40 ? 'Quelques habitants malades' :
           health > 20 ? 'Population fragilisée !' :
                         'Situation critique !'}
        </p>
      </div>

      {/* Satisfaction (2e condition de défaite) */}
      <div className="hud__section" id="hud-satisfaction">
        <div className="hud__stat" style={{ color: satColor }}>
          <span>😤 Satisfaction</span>
          <strong>{satisfaction.toFixed(0)} / 100</strong>
        </div>
        <div className="hud__progress">
          <div className="hud__progress-bar hud__progress-bar--orange" style={{ width: `${Math.max(0, satisfaction)}%`, background: satColor }} />
        </div>
        {satisfaction < 40 && (
          <p className="hud__hint hud__hint--warn">⚠️ Les habitants fuient les pannes !</p>
        )}
      </div>

      {/* Population & objectifs */}
      <div className="hud__section" id="hud-population">
        <div className="hud__stat">
          <span>👥 Population</span>
          <strong>{population}</strong>
        </div>
        <div className="hud__objective-bars">
          <div className="hud__obj-item">
            <span>Pop.</span>
            <div className="hud__progress">
              <div className="hud__progress-bar hud__progress-bar--blue" style={{ width: `${Math.min(100, (population / 500) * 100)}%` }} />
            </div>
            <span>{Math.round((population / 500) * 100)}%</span>
          </div>
          <div className="hud__obj-item">
            <span>🌱</span>
            <div className="hud__progress">
              <div className="hud__progress-bar" style={{ width: `${Math.min(100, (renewableShare / 50) * 100)}%`, background: '#22c55e' }} />
            </div>
            <span>{renewableShare}%</span>
          </div>
        </div>
        <div className="hud__stat hud__stat--small">
          <span>🎯 Objectif</span>
          <span>500 hab · santé ≥ 60 · 🌱 ≥ 50%</span>
        </div>
      </div>
    </aside>
  )
}
