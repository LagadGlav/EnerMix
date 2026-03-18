import { useEffect, useState } from 'react'

// Valeur spéciale : plus d'overlay visible, mais les triggers App.jsx restent actifs
export const FREE_PLAY_STEP = 99

const STEPS = [
  { // 0
    title: 'Bienvenue dans EnerMix ! 🎮',
    text: "Tu vas apprendre à gérer l'énergie d'une ville de A à Z. Suis les étapes — le jeu s'arrêtera à chaque fois que tu dois comprendre quelque chose d'important.",
    pos: 'center', highlight: null, pauseGame: true, btnLabel: 'Commencer',
  },
  { // 1
    title: 'Ton panneau de construction 🏗️',
    text: "Ce panneau à gauche te permet de construire des bâtiments. Clique sur un bâtiment pour le sélectionner, puis clique sur une tuile compatible de la carte pour le poser.",
    pos: 'panel', highlight: 'building-panel', pauseGame: true, btnLabel: 'Compris !',
  },
  { // 2
    title: 'Construis une éolienne 🌀',
    text: "Sélectionne 'Éolienne 🌀' dans le panneau gauche, puis clique sur un terrain vert. Elle produit de l'électricité grâce au vent — jour ET nuit — sans polluer.",
    pos: 'panel', highlight: 'building-panel', pauseGame: true,
    waitFor: 'wind', waiting: 'Place une éolienne sur un terrain vert...',
  },
  { // 3
    title: 'Ton tableau de bord 📊',
    text: "Ce tableau à droite est ton centre de contrôle. Je vais te présenter chaque indicateur un par un — lis bien chacune des aides !",
    pos: 'hud', highlight: 'hud-panel', pauseGame: true, btnLabel: 'Allons-y !',
  },
  { // 4
    title: '💰 L\'argent et les taxes',
    text: "Tes habitants paient des taxes automatiquement. Plus tu as de population, plus tu gagnes. Utilise cet argent pour construire de nouvelles installations !",
    pos: 'hud', highlight: 'hud-money', pauseGame: true, btnLabel: 'Compris !',
  },
  { // 5
    title: '⚡ Production vs Demande',
    text: "Surveille la ligne 'Surplus / Déficit'. Si ta production ≥ demande = surplus ✅. Si ta production < demande = déficit ⚠️ — agis vite avant que la satisfaction chute !",
    pos: 'hud', highlight: 'hud-energy', pauseGame: true, btnLabel: 'Compris !',
  },
  { // 6
    title: '🔋 Le stockage',
    text: "Le barrage stocke l'énergie en surplus et la restitue automatiquement si tu tombes en déficit. Un stockage plein = sécurité face aux imprévus.",
    pos: 'hud', highlight: 'hud-storage', pauseGame: true, btnLabel: 'Compris !',
  },
  { // 7
    title: '🌬️ La force du vent',
    text: "La force du vent varie en permanence — c'est normal ! Quand il est fort, tes éoliennes produisent plus. Quand il faiblit, elles ralentissent. Observe l'indicateur !",
    pos: 'hud', highlight: 'hud-wind', pauseGame: true, btnLabel: 'Compris !',
  },
  { // 8
    title: '☁️❤️ Pollution et santé',
    text: "La pollution monte quand tu utilises du charbon et réduit la santé ❤️. Si la santé tombe à 0 → GAME OVER. Seules les mines et les centrales à charbon sont polluantes !",
    pos: 'hud', highlight: 'hud-pollution', pauseGame: true, btnLabel: 'Compris !',
  },
  { // 9
    title: '😊 Satisfaction des habitants',
    text: "Elle reflète le bonheur de tes habitants. Un déficit ou une mauvaise santé la fait baisser. Si elle atteint 0, les habitants fuient → GAME OVER !",
    pos: 'hud', highlight: 'hud-satisfaction', pauseGame: true, btnLabel: 'Compris !',
  },
  { // 10
    title: '👥 Population et croissance',
    text: "La population grandit automatiquement si la santé est bonne. Plus d'habitants = plus de taxes, mais aussi plus de demande en énergie. Prévois toujours une marge !",
    pos: 'hud', highlight: 'hud-population', pauseGame: true, btnLabel: 'Compris !',
  },
  { // 11
    title: 'Construis un barrage 🏞️',
    text: "Construis maintenant un barrage 🏞️. Sélectionne-le dans le panneau et clique sur une rivière (tuile bleue). Il stockera l'énergie en surplus pour les creux de vent.",
    pos: 'panel', highlight: 'building-panel', pauseGame: true,
    waitFor: 'barrage', waiting: 'Place un barrage sur une rivière bleue...',
  },
  { // 12
    title: 'Lance le jeu ▶',
    text: "Tout est prêt ! Clique sur ▶ en bas de l'écran pour lancer la simulation. Les chiffres du tableau de bord vont commencer à changer — observe-les bien !",
    pos: 'top', highlight: 'pause-widget', pauseGame: true,
    waitFor: 'started', waiting: 'Clique sur ▶ pour démarrer...',
  },

  // ─── Étapes suivantes : injectées par App.jsx OU par TutorialOverlay (conditions) ───

  { // 13 — première nuit : start hidden, shown when !isDay
    title: 'Le cycle jour/nuit 🌙',
    text: "🌙 La nuit vient de tomber ! Si tu avais des panneaux solaires ☀️, leur production tomberait à 0. Les éoliennes et le barrage, eux, fonctionnent 24h/24. C'est l'avantage du mix énergétique !",
    pos: 'center', highlight: null, pauseGame: true, btnLabel: "J'ai compris",
    waitFor: 'night',
    nextStep: FREE_PLAY_STEP,
  },
  { // 14 — injecté par App.jsx quand uncoveredDeficit > 0
    title: '🔴 DÉFICIT DÉTECTÉ !',
    text: "🔴 DÉFICIT ! Ta production + tes réserves ne suffisent plus ! Les tuiles rouges ❗ sur la carte montrent les zones en pénurie. Chaque seconde de déficit réduit la santé et la satisfaction. Agis maintenant !",
    pos: 'center', highlight: 'hud-energy', pauseGame: true, btnLabel: "Je vais régler ça !",
    nextStep: 15,
  },
  { // 15 — suite de 14 : attend que le déficit soit résolu
    title: "Construis plus d'éoliennes !",
    text: "Construis une ou deux éoliennes supplémentaires pour rétablir l'équilibre. Surveille la ligne 'Surplus / Déficit' dans le tableau de bord — elle doit redevenir verte. Une fois le déficit résolu, le tutoriel continuera automatiquement.",
    pos: 'panel', highlight: 'building-panel', pauseGame: true,
    waitFor: 'noDeficit', waiting: "Construis des éoliennes pour résorber le déficit...",
    nextStep: FREE_PLAY_STEP,
  },
  { // 16 — injecté par App.jsx quand energyDraw > 0
    title: "Ton stock d'énergie t'a sauvé ! 🔋",
    text: "🔋 Ton stock d'énergie vient de compenser un déficit ! Le barrage a évité une pénurie. Mais le stock est limité — si le déficit dure trop longtemps, il se videra et la situation deviendra critique.",
    pos: 'center', highlight: 'hud-storage', pauseGame: true, btnLabel: 'Noté !',
    nextStep: FREE_PLAY_STEP,
  },
  { // 17 — injecté par App.jsx quand pop >= 150
    title: 'La population grandit ! 👥',
    text: "👥 Ta population a atteint 150 habitants ! Elle continuera de croître si la santé est bonne. Plus il y a d'habitants, plus la demande augmente — prévois toujours un peu de marge de production.",
    pos: 'center', highlight: 'hud-population', pauseGame: true, btnLabel: 'Noté !',
    nextStep: FREE_PLAY_STEP,
  },
  { // 18 — injecté par App.jsx quand satisfaction < 75
    title: 'La satisfaction ⚠️😤',
    text: "😤 La satisfaction baisse ! Quand les habitants manquent d'énergie, ils sont mécontents. Si la satisfaction tombe à 0, ils fuient la ville — GAME OVER. Résous le déficit rapidement !",
    pos: 'center', highlight: 'hud-satisfaction', pauseGame: true, btnLabel: "Je vais régler ça !",
    nextStep: FREE_PLAY_STEP,
  },
  { // 19 — injecté par App.jsx (déficit + pop >= 150)
    title: '⚠️ Rappel déficit (pop élevée)',
    text: "⚠️ Avec une population plus grande, un déficit est encore plus dangereux ! La demande a augmenté. Si tu n'as pas assez d'éoliennes, construis-en d'autres maintenant.",
    pos: 'center', highlight: 'hud-energy', pauseGame: true, btnLabel: "Je construis !",
    nextStep: 20,
  },
  { // 20 — suite de 19 : explication pollution
    title: 'La pollution et la santé ☁️❤️',
    text: "☁️ La pollution monte quand tu utilises du charbon (mines + centrales). Elle réduit la santé ❤️. Si la santé tombe à 0 → GAME OVER. L'éolien et les barrages ne polluent pas du tout !",
    pos: 'center', highlight: 'hud-pollution', pauseGame: true, btnLabel: 'Compris !',
    nextStep: FREE_PLAY_STEP,
  },
  { // 21 — injecté par App.jsx au premier événement
    title: 'Un événement ! ⚡',
    text: "📣 Un événement vient de se produire ! Lis attentivement le message. Certains événements boostent ta production (subventions, soleil), d'autres augmentent la demande (vague de froid). Adapte ta stratégie !",
    pos: 'center', highlight: 'event-banner', pauseGame: true, btnLabel: "J'adapte ma stratégie !",
    nextStep: FREE_PLAY_STEP,
  },
  { // 22 — injecté par App.jsx quand énergie > 80% max
    title: "Vendre l'énergie 💰",
    text: "💰 Ton barrage est presque plein ! Tu peux vendre l'énergie stockée via le bouton 'Vendre l'énergie stockée' dans le panneau gauche. Tu recevras des euros pour financer de nouvelles constructions.",
    pos: 'panel', highlight: 'sell-btn', pauseGame: true, btnLabel: "J'en profite !",
    nextStep: 23,
  },
  { // 23 — dernier step
    title: 'Objectif victoire 🏆',
    text: "🏆 Objectif victoire : 150 habitants · santé ≥ 50 · 30% renouvelable. Tu sais maintenant gérer l'énergie, le stockage, la demande et les événements. Continue comme ça — bonne chance !",
    pos: 'center', highlight: null, pauseGame: false, btnLabel: "C'est parti !",
    isLast: true,
  },
]

export default function TutorialOverlay({
  step, grid, energy, deficitRatio, isPaused, isDay, onPause, onAdvance, onComplete,
}) {
  const [visible, setVisible] = useState(false)

  const current = STEPS[step] ?? null

  const hasWind    = grid.some(t => t.building === 'wind')
  const hasBarrage = grid.some(t => t.building === 'barrage')

  // ── Visibilité : reset à chaque changement de step ──────────────────
  // Les steps avec waitFor:'night' démarrent cachés.
  // Les steps injectés par App.jsx (sans waitFor) sont visibles d'emblée.
  useEffect(() => {
    if (!current) { setVisible(false); return }
    if (current.waitFor === 'night') {
      setVisible(false)
    } else {
      setVisible(true)
    }
  }, [step]) // eslint-disable-line

  // ── Pause / dépause selon la visibilité et pauseGame ────────────────
  // • current=null (FREE_PLAY_STEP=99) → dépause
  // • step caché → dépause pour que le jeu avance
  // • step visible + pauseGame:true → pause
  // • step visible + pauseGame:false → dépause (step final)
  useEffect(() => {
    if (!current) {
      onPause(false)
      return
    }
    if (!visible) {
      onPause(false)
      return
    }
    onPause(current.pauseGame)
  }, [visible, step]) // eslint-disable-line

  // ── Surbrillance de l'élément ciblé ─────────────────────────────────
  useEffect(() => {
    if (!current || !visible || !current.highlight) return
    const el = document.getElementById(current.highlight)
    if (el) el.classList.add('tutorial-highlight')
    return () => {
      if (el) el.classList.remove('tutorial-highlight')
    }
  }, [step, visible]) // eslint-disable-line

  // ── Auto-avance : éolienne posée (step 2) ───────────────────────────
  useEffect(() => {
    if (step === 2 && hasWind) onAdvance(3)
  }, [step, hasWind]) // eslint-disable-line

  // ── Auto-avance : barrage posé (step 11) ────────────────────────────
  useEffect(() => {
    if (step === 11 && hasBarrage) onAdvance(12)
  }, [step, hasBarrage]) // eslint-disable-line

  // ── Auto-avance : jeu démarré (step 12) ─────────────────────────────
  useEffect(() => {
    if (step === 12 && !isPaused) onAdvance(FREE_PLAY_STEP)
  }, [step, isPaused]) // eslint-disable-line

  // ── Affichage step 13 à la première nuit ────────────────────────────
  useEffect(() => {
    if (step === 13 && !isDay && !visible) setVisible(true)
  }, [step, isDay]) // eslint-disable-line

  // ── Step 15 : auto-avance quand le déficit est résolu ───────────────
  useEffect(() => {
    if (step === 15 && deficitRatio < 0.02 && visible) {
      onAdvance(STEPS[15].nextStep ?? FREE_PLAY_STEP)
    }
  }, [step, deficitRatio, visible]) // eslint-disable-line

  if (!current || !visible) return null

  const handleBtn = () => {
    if (current.isLast) { onComplete(); return }
    onAdvance(current.nextStep ?? step + 1)
  }

  const showWaiting = (
    (step === 2  && !hasWind)    ||
    (step === 11 && !hasBarrage) ||
    step === 12                  ||
    (step === 15)
  )

  return (
    <div className={`tutorial-overlay tutorial-overlay--${current.pos}`}>
      {step <= 12 && (
        <div className="tutorial-overlay__step">Étape {step + 1} / 13</div>
      )}
      <div className="tutorial-overlay__title">{current.title}</div>
      <div className="tutorial-overlay__text">{current.text}</div>
      {showWaiting && current.waiting && (
        <div className="tutorial-overlay__waiting">⏳ {current.waiting}</div>
      )}
      {current.btnLabel && !showWaiting && (
        <button className="tutorial-overlay__btn" onClick={handleBtn}>
          {current.btnLabel}
        </button>
      )}
    </div>
  )
}
