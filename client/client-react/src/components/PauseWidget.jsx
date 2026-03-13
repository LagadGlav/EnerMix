export default function PauseWidget({ isPaused, onToggle, hasEverStarted }) {
  return (
    <div className="pause-widget">
      {/* Bulle d'aide affichée uniquement au premier lancement */}
      {isPaused && !hasEverStarted && (
        <div className="pause-widget__bubble">
          ▶ Cliquez pour démarrer !
        </div>
      )}

      <button
        id="pause-widget"
        className={`pause-widget__btn ${isPaused ? 'pause-widget__btn--play' : 'pause-widget__btn--pause'}`}
        onClick={onToggle}
        title={isPaused ? 'Démarrer la partie' : 'Mettre en pause'}
      >
        {isPaused ? '▶ Démarrer' : '⏸'}
      </button>
    </div>
  )
}
