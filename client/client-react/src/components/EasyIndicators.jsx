import { useEffect, useRef, useState } from 'react'

const HINT_COOLDOWN = 30000   // 30s avant de re-déclencher le même type

export default function EasyIndicators({ deficitRatio, satisfaction, health, pollution, skipHints, onPause }) {
  const [hint, setHint]   = useState(null)
  const lastShownRef      = useRef({})  // { [type]: timestamp }

  useEffect(() => {
    if (skipHints) {
      if (hint) { setHint(null); onPause?.(false) }
      return
    }

    const now = Date.now()
    const canShow = (type) =>
      !lastShownRef.current[type] || now - lastShownRef.current[type] > HINT_COOLDOWN

    // Priorité : déficit > satisfaction > santé > pollution
    let next = null

    if (deficitRatio > 0 && canShow('deficit')) {
      next = { type: 'deficit', text: '⚠️ Déficit ! Construis des éoliennes ou centrales pour augmenter ta production.' }
    } else if (satisfaction < 40 && canShow('satisfaction')) {
      next = { type: 'satisfaction', text: "😤 Satisfaction critique ! Les habitants vont fuir. Résous le déficit d'urgence !" }
    } else if (health < 50 && canShow('health')) {
      next = { type: 'health', text: '❤️ Santé faible ! Réduis la pollution ou diversifie tes sources.' }
    } else if (pollution > 60 && canShow('pollution')) {
      next = { type: 'pollution', text: "☁️ Pollution élevée ! Limite le charbon ou vends de l'énergie stockée." }
    }

    if (next && (!hint || hint.type !== next.type)) {
      lastShownRef.current[next.type] = now
      setHint(next)
      onPause?.(true)   // ← stoppe la simulation tant que l'aide est ouverte
    }
  }, [deficitRatio, satisfaction, health, pollution, skipHints]) // eslint-disable-line

  const dismiss = () => {
    setHint(null)
    onPause?.(false)  // ← reprend la simulation quand le joueur ferme l'aide
  }

  if (!hint) return null

  return (
    <div className="easy-indicators">
      <div className="easy-hint">
        {hint.text}
        <button className="easy-hint__close" onClick={dismiss} title="Fermer">✕</button>
      </div>
    </div>
  )
}
