import { useState } from 'react'
import { BUILDINGS } from '../data/buildings.js'

const TIPS = [
  { icon: '🌬️', text: 'Le vent disperse la pollution — un vent fort nettoie l\'air sans éolienne !' },
  { icon: '🌞🌀', text: 'Combine solaire ET éolien : quand le soleil se couche, le vent peut prendre le relais.' },
  { icon: '🏭⚠️', text: 'Chaque centrale à charbon (+1,2 pollution/s) nécessite du vent fort pour rester safe.' },
  { icon: '🎯', text: 'Objectif : 500 habitants, santé ≥ 60 et 50% d\'énergie renouvelable.' },
]

export default function BuildingPanel({
  selectedBuilding,
  onSelectBuilding,
  money,
  activeEvent,
  placementError,
  onSellEnergy,
  energy,
  maxEnergy,
  sellTarget,
  onConfirmSell,
  onCancelSell,
  availableBuildings = 'all',
}) {
  const [showHelp, setShowHelp] = useState(false)

  const buildingList = availableBuildings === 'all'
    ? Object.values(BUILDINGS)
    : Object.values(BUILDINGS).filter(b => availableBuildings.includes(b.id))

  const getEffectiveCost = (building) => {
    if (activeEvent?.effectKey === 'subvention' && building.isRenewable) {
      return Math.round(building.cost * 0.5)
    }
    return building.cost
  }

  return (
    <div className="building-panel" id="building-panel">
      <h2 className="building-panel__title">Construire</h2>
      <p className="building-panel__hint">
        Sélectionnez un bâtiment puis cliquez sur une tuile compatible.
        {!selectedBuilding && ' Cliquez sur un bâtiment existant pour le vendre.'}
      </p>

      <div className="building-panel__buttons">
        {buildingList.map((b) => {
          const cost       = getEffectiveCost(b)
          const canAfford  = money >= cost
          const isSelected = selectedBuilding === b.id
          const isDiscount = activeEvent?.effectKey === 'subvention' && b.isRenewable

          return (
            <button
              key={b.id}
              className={[
                'build-btn',
                isSelected  ? 'build-btn--selected' : '',
                !canAfford  ? 'build-btn--poor'     : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectBuilding(isSelected ? null : b.id)}
              title={b.tooltip}
            >
              <span className="build-btn__emoji">{b.emoji}</span>
              <div className="build-btn__info">
                <span className="build-btn__label">{b.label}</span>
                <span className="build-btn__desc">{b.description}</span>
              </div>
              <span className={`build-btn__cost${isDiscount ? ' build-btn__cost--discount' : ''}`}>
                {isDiscount && <s className="build-btn__cost-old">{b.cost}€</s>}
                {cost}€
              </span>
            </button>
          )
        })}
      </div>

      {selectedBuilding && (
        <button className="build-btn build-btn--cancel" onClick={() => onSelectBuilding(null)}>
          ✕ Annuler la sélection
        </button>
      )}

      {placementError && (
        <div className="placement-error">⚠️ {placementError}</div>
      )}

      {/* Panneau de vente d'un bâtiment existant */}
      {sellTarget && (
        <div className="sell-panel">
          <div className="sell-panel__title">
            🏗️ Démolir {BUILDINGS[sellTarget.buildingId]?.label} ?
          </div>
          <div className="sell-panel__info">
            Coût d'origine : <strong>{sellTarget.cost}€</strong>
          </div>
          <div className="sell-panel__refund">
            Remboursement : +{Math.round(sellTarget.cost * 0.5)}€
          </div>
          <div className="sell-panel__btns">
            <button className="sell-panel__btn sell-panel__btn--confirm" onClick={onConfirmSell}>
              ✅ Vendre
            </button>
            <button className="sell-panel__btn sell-panel__btn--cancel" onClick={onCancelSell}>
              ✕ Garder
            </button>
          </div>
        </div>
      )}

      {/* Vente d'énergie stockée */}
      <div className="building-panel__sell">
        <button
          id="sell-btn"
          className="sell-btn"
          onClick={onSellEnergy}
          disabled={energy <= 0}
          title="Vend toute l'énergie stockée en surplus"
        >
          Vendre l'énergie stockée<br />
          <span className="sell-btn__amount">
            {energy.toFixed(1)} / {maxEnergy} kWh → {(energy * 0.25).toFixed(1)} €
          </span>
        </button>
      </div>

      {/* Aide rapide */}
      <div>
        <button className="help-toggle" onClick={() => setShowHelp(v => !v)}>
          {showHelp ? '▲' : '▼'} ❓ Aide rapide
        </button>
        {showHelp && (
          <div className="help-panel">
            {TIPS.map((tip, i) => (
              <div key={i} className="help-panel__tip">
                <span>{tip.icon}</span>
                <span>{tip.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
