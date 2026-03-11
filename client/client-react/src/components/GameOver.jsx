export default function GameOver({ gameStatus, loseReason, onRestart }) {
  if (gameStatus === 'playing') return null

  const isWin = gameStatus === 'won'

  return (
    <div className="gameover-overlay">
      <div className="gameover-box">
        <div className="gameover-emoji">{isWin ? '🏆' : '💀'}</div>
        <h2 className="gameover-title">
          {isWin ? 'Objectif atteint !' : 'Partie terminée'}
        </h2>
        <p className="gameover-reason">
          {isWin
            ? 'Votre ville prospère avec un mix énergétique équilibré et durable !'
            : loseReason}
        </p>
        {isWin && (
          <p className="gameover-lesson">
            Un bon mix énergétique combine des sources renouvelables et fiables
            tout en limitant la pollution pour protéger les habitants.
          </p>
        )}
        <button className="gameover-btn" onClick={onRestart}>
          Rejouer
        </button>
      </div>
    </div>
  )
}
