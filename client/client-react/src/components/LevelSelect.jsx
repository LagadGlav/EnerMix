const LEVEL_LIST = [
  {
    id: 'tutorial',
    emoji: '🎓',
    label: 'Tutoriel',
    color: '#22c55e',
    description: 'Éolien + Barrage, aide pas-à-pas',
    buildings: 'Éolienne + Barrage',
    events: '2 événements',
    winNote: '200 hab · santé ≥ 50 · 🌱 ≥ 30%',
  },
  {
    id: 'easy',
    emoji: '😊',
    label: 'Facile',
    color: '#3b82f6',
    description: 'Renouvelable + charbon, demande douce',
    buildings: 'Éolienne, Barrage, Mine, Centrale',
    events: 'Tous les événements',
    winNote: '500 hab · santé ≥ 60 · 🌱 ≥ 50%',
  },
  {
    id: 'medium',
    emoji: '⚖️',
    label: 'Moyen',
    color: '#f59e0b',
    description: 'Bâtiments classiques, demande modérée',
    buildings: 'Solaire, Éolien, Géothermie, Charbon, Barrage',
    events: 'Tous les événements',
    winNote: '275 hab · santé ≥ 60 · 🌱 ≥ 50%',
  },
  {
    id: 'hard',
    emoji: '🔥',
    label: 'Fort',
    color: '#ef4444',
    description: 'Jeu complet — demande agressive + nucléaire',
    buildings: 'Tous les bâtiments + ☢️ nucléaire',
    events: 'Tous + catastrophes exclusives',
    winNote: '500 hab · santé ≥ 60 · 🌱 ≥ 50%',
  },
]

export default function LevelSelect({ onSelect }) {
  const completed = JSON.parse(localStorage.getItem('enermix-completed') || '{}')

  return (
    <div className="level-select-overlay">
      <div className="level-select__header">
        <h1 className="level-select__title">EnerMix ⚡</h1>
        <p className="level-select__subtitle">Gérez l'énergie d'une ville — choisissez votre niveau</p>
      </div>

      <div className="level-cards">
        {LEVEL_LIST.map(cfg => (
          <button
            key={cfg.id}
            className="level-card"
            style={{ '--level-color': cfg.color }}
            onClick={() => onSelect(cfg.id)}
          >
            {completed[cfg.id] && <span className="level-done">✓</span>}
            <div className="level-card__emoji">{cfg.emoji}</div>
            <div className="level-card__label">{cfg.label}</div>
            <div className="level-card__desc">{cfg.description}</div>
            <div className="level-card__meta">
              <span>🏗️ {cfg.buildings}</span>
              <span>📅 {cfg.events}</span>
              <span>🏆 {cfg.winNote}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
