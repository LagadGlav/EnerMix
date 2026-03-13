import { useEffect } from 'react'

/**
 * Bulle explicative positionnée près d'un composant UI (Easy / Medium).
 * Ajoute la classe tutorial-highlight sur l'élément ciblé.
 *
 * Props :
 *   pos        — 'panel' | 'hud' | 'top' | 'center'
 *   highlight  — id DOM de l'élément à mettre en surbrillance (optionnel)
 *   title      — titre de la bulle
 *   text       — texte explicatif
 *   btnLabel   — label du bouton de fermeture (défaut : 'Compris !')
 *   step       — index courant (pour afficher "1 / 3", optionnel)
 *   total      — nombre total de bulles (optionnel)
 *   onClose    — callback appelé quand l'utilisateur ferme la bulle
 */
export default function ComponentBubble({
  pos = 'center',
  highlight,
  title,
  text,
  btnLabel = 'Compris !',
  step,
  total,
  onClose,
}) {
  // ── Surbrillance de l'élément ciblé ─────────────────────────────
  useEffect(() => {
    if (!highlight) return
    const el = document.getElementById(highlight)
    if (el) el.classList.add('tutorial-highlight')
    return () => {
      if (el) el.classList.remove('tutorial-highlight')
    }
  }, [highlight])

  return (
    <div className={`component-bubble component-bubble--${pos}`}>
      {step != null && total != null && (
        <div className="component-bubble__step">{step + 1} / {total}</div>
      )}
      <div className="component-bubble__title">{title}</div>
      <div className="component-bubble__text">{text}</div>
      <button className="component-bubble__btn" onClick={onClose}>
        {btnLabel}
      </button>
    </div>
  )
}
